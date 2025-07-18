import * as vscode from 'vscode';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitCueConfig } from '../types/interfaces';
import { configManager } from '../utils/config';
import logger from '../utils/logger';
import { ActivityLogger } from './activityLogger';
import { CommitService } from './commitService';

const execAsync = promisify(exec);

export class FileWatcherService {
	private static instance: FileWatcherService;
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private debounceTimer: NodeJS.Timeout | undefined;
	private isWatching = false;
	private activityLogger: ActivityLogger;
	private commitService: CommitService;
	private workspaceFolder: vscode.WorkspaceFolder | undefined;

	private constructor() {
		this.activityLogger = ActivityLogger.getInstance();
		this.commitService = CommitService.getInstance();
		this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	}

	static getInstance(): FileWatcherService {
		if (!FileWatcherService.instance) {
			FileWatcherService.instance = new FileWatcherService();
		}
		return FileWatcherService.instance;
	}

	getIsWatching(): boolean {
		return this.isWatching;
	}

	async startWatching(): Promise<boolean> {
		if (!this.workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return false;
		}

		const config = configManager.getConfig();
		if (!config.geminiApiKey) {
			vscode.window.showWarningMessage('Gemini API key not configured. Please configure it in settings.');
			return false;
		}

		// Use comprehensive watch patterns
		const watchPatterns = configManager.getWatchPatterns();
		const watchPattern = `{${watchPatterns.join(',')}}`;
		
		this.fileWatcher = vscode.workspace.createFileSystemWatcher(watchPattern);
		
		// Track changes to avoid duplicate processing
		const changeTracker = new Set<string>();
		let lastDiffHash: string | null = null;
		
		const onFileChange = async (uri: vscode.Uri) => {
			await this.handleFileChange(uri, changeTracker, lastDiffHash);
		};

		// Listen to all file system events
		this.fileWatcher.onDidChange(onFileChange);
		this.fileWatcher.onDidCreate(onFileChange);
		this.fileWatcher.onDidDelete(onFileChange);

		// Also listen to workspace file changes for better coverage
		const workspaceWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
			if (event.document.uri.scheme === 'file') {
				onFileChange(event.document.uri);
			}
		});
		
		// Store for cleanup
		(this.fileWatcher as any).workspaceWatcher = workspaceWatcher;

		this.isWatching = true;
		this.activityLogger.updateWatchStatus({ isWatching: true });
		this.activityLogger.logActivity('watch_start', 'File watching started', `Patterns: ${watchPatterns.join(', ')}`);
		
		// Trigger callbacks for UI updates
		this.activityLogger.updateWatchStatus({ isWatching: true });
		
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('GitCue: Started watching for changes');
		}
		logger.info('Started watching for file changes with patterns: ' + watchPatterns.join(', '));
		
		return true;
	}

	stopWatching(): void {
		if (this.fileWatcher) {
			// Clean up workspace watcher if it exists
			if ((this.fileWatcher as any).workspaceWatcher) {
				(this.fileWatcher as any).workspaceWatcher.dispose();
			}
			
			this.fileWatcher.dispose();
			this.fileWatcher = undefined;
		}
		
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		// Cancel any pending commits
		this.commitService.cancelBufferedCommit();

		this.isWatching = false;
		this.activityLogger.resetWatchStatus();
		this.activityLogger.logActivity('watch_stop', 'File watching stopped');
		
		// Trigger callbacks for UI updates
		this.activityLogger.updateWatchStatus({ isWatching: false });
		
		const config = configManager.getConfig();
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('GitCue: Stopped watching');
		}
		logger.info('Stopped watching for file changes');
	}

	private async handleFileChange(uri: vscode.Uri, changeTracker: Set<string>, lastDiffHash: string | null): Promise<void> {
		if (!this.workspaceFolder) return;
		
		const filePath = uri.fsPath;
		const fileName = path.basename(filePath);
		
		// Filter out Git internal files and other system files
		if (this.shouldIgnoreFile(fileName, filePath)) {
			return;
		}
		
		// Skip if we've already processed this file recently
		if (changeTracker.has(filePath)) {
			return;
		}
		
		changeTracker.add(filePath);
		
		// Remove from tracker after a short delay
		setTimeout(() => {
			changeTracker.delete(filePath);
		}, 1000);
		
		// Check actual git changes to get accurate count
		try {
			const { stdout: gitStatus } = await execAsync('git status --porcelain', { 
				cwd: this.workspaceFolder.uri.fsPath 
			});
			
			if (gitStatus.trim()) {
				// Parse git status to get unique changed files
				const changedFiles = gitStatus.trim().split('\n')
					.map(line => line.substring(3).trim()) // Remove status prefix
					.filter(file => file.length > 0);
				
				// Update activity logger with file changes
				if (changedFiles.length > 0) {
					this.activityLogger.setFileChanged(fileName, filePath);
					
					logger.debug(`File change detected: ${uri.fsPath}`);
				}
				
				// Create diff hash to avoid duplicate processing
				const { stdout: diff } = await execAsync('git diff', { cwd: this.workspaceFolder.uri.fsPath });
				const currentDiffHash = this.createDiffHash(diff);
				
				// Skip if this is the same diff we already processed
				if (currentDiffHash === lastDiffHash) {
					return;
				}
				
				lastDiffHash = currentDiffHash;
			} else {
				// No git changes, reset counters
				this.activityLogger.updateWatchStatus({ 
					filesChanged: 0,
					changedFiles: new Set()
				});
			}
		} catch (error) {
			// If git commands fail, fall back to simple file counting
			if (!this.shouldIgnoreFile(fileName, filePath)) {
				this.activityLogger.setFileChanged(fileName, filePath);
				logger.debug(`File change detected: ${uri.fsPath}`);
			}
			this.activityLogger.logActivity('error', 'Git status check failed', error instanceof Error ? error.message : String(error));
		}
		
		// Clear existing debounce timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		
		// Set new debounce timer
		const config = configManager.getConfig();
		this.debounceTimer = setTimeout(async () => {
			try {
				this.activityLogger.logActivity('ai_analysis', 'Starting AI analysis for changes');
				
				if (config.commitMode === 'intelligent') {
					await this.handleIntelligentCommit();
				} else {
					// For periodic mode, also use buffer notification
					if (this.workspaceFolder) {
						await this.commitService.commitWithBuffer(this.workspaceFolder.uri.fsPath, config);
					}
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.error('Error processing file changes: ' + errorMsg);
				this.activityLogger.logActivity('error', 'Failed to process file changes', errorMsg);
				
				if (config.enableNotifications) {
					vscode.window.showErrorMessage(`GitCue: Error processing changes - ${errorMsg}`);
				}
			}
		}, config.debounceMs);
	}

	private shouldIgnoreFile(fileName: string, filePath: string): boolean {
		const gitInternalFiles = [
			'index.lock',
			'COMMIT_EDITMSG',
			'MERGE_HEAD',
			'MERGE_MSG',
			'FETCH_HEAD',
			'HEAD.lock',
			'config.lock',
			'packed-refs.lock'
		];
		
		const systemFiles = [
			'.DS_Store',
			'Thumbs.db',
			'desktop.ini'
		];
		
		// Skip Git internal files and system files
		if (gitInternalFiles.includes(fileName) || systemFiles.includes(fileName)) {
			return true;
		}
		
		// Skip files in .git directory
		if (filePath.includes('/.git/') || filePath.includes('\\.git\\')) {
			return true;
		}
		
		return false;
	}

	private createDiffHash(diffText: string): string | null {
		if (!diffText) return null;
		
		// Simple hash function for diff content
		let hash = 0;
		for (let i = 0; i < diffText.length; i++) {
			const char = diffText.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString();
	}

	private async handleIntelligentCommit(): Promise<void> {
		if (!this.workspaceFolder) return;

		const config = configManager.getConfig();
		if (!config.geminiApiKey) return;

		// Use buffer notification for intelligent commits
		await this.commitService.commitWithBuffer(this.workspaceFolder.uri.fsPath, config);
	}

	dispose(): void {
		this.stopWatching();
	}
} 