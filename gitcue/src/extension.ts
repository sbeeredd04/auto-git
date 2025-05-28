// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { GitCuePty } from './terminal/interactivePty';
import { configManager } from './utils/config';
import logger from './utils/logger';
import { generateErrorSuggestion, makeCommitDecisionWithAI, generateCommitMessageWithAI } from './utils/ai';

const execAsync = promisify(exec);

interface GitCueConfig {
	geminiApiKey: string;
	commitMode: 'periodic' | 'intelligent';
	autoPush: boolean;
	watchPaths: string[];
	debounceMs: number;
	bufferTimeSeconds: number;
	maxCallsPerMinute: number;
	enableNotifications: boolean;
	autoWatch: boolean;
	// Interactive terminal settings
	interactiveOnError: boolean;
	enableSuggestions: boolean;
	terminalVerbose: boolean;
	sessionPersistence: boolean;
	maxHistorySize: number;
}

interface BufferNotification {
	panel: vscode.WebviewPanel;
	timer: NodeJS.Timeout;
	cancelled: boolean;
}

interface WatchStatus {
	isWatching: boolean;
	filesChanged: number;
	lastChange: string;
	lastCommit: string;
	pendingCommit: boolean;
	aiAnalysisInProgress: boolean;
	activityHistory: ActivityLogEntry[];
	changedFiles: Set<string>;
}

interface ActivityLogEntry {
	timestamp: string;
	type: 'file_change' | 'ai_analysis' | 'commit' | 'error' | 'watch_start' | 'watch_stop';
	message: string;
	details?: string;
}

class GitCueExtension {
	private statusBarItem: vscode.StatusBarItem;
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	public isWatching = false;
	private outputChannel: vscode.OutputChannel;
	private statusProvider: GitCueStatusProvider;
	private debounceTimer: NodeJS.Timeout | undefined;
	private bufferNotification: BufferNotification | undefined;
	private terminal: vscode.Terminal | undefined;
	private watchStatus: WatchStatus = {
		isWatching: false,
		filesChanged: 0,
		lastChange: 'None',
		lastCommit: 'None',
		pendingCommit: false,
		aiAnalysisInProgress: false,
		activityHistory: [],
		changedFiles: new Set()
	};
	private dashboardPanels: vscode.WebviewPanel[] = [];

	constructor(private context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.outputChannel = vscode.window.createOutputChannel('GitCue');
		this.statusProvider = new GitCueStatusProvider();
		
		// Set up logger
		logger.setVerbose(this.getConfig().terminalVerbose);
		
		this.setupStatusBar();
		this.registerCommands();
		this.registerViews();
		
		// Auto-start watching if configured
		const config = this.getConfig();
		if (config.autoWatch) {
			this.startWatching();
		}
		
		logger.info('GitCue extension initialized v0.3.8', 'STARTUP');
	}

	private getConfig(): GitCueConfig {
		return configManager.getConfig();
	}

	private setupStatusBar() {
		this.statusBarItem.command = 'gitcue.watchToggle';
		this.updateStatusBar();
		this.statusBarItem.show();
	}

	private updateStatusBar() {
		if (this.isWatching) {
			this.statusBarItem.text = `$(eye) GitCue: Watching (${this.watchStatus.filesChanged} changes)`;
			this.statusBarItem.tooltip = 'GitCue is actively watching for file changes. Click to open dashboard.';
			this.statusBarItem.color = undefined;
		} else {
			this.statusBarItem.text = `$(eye-closed) GitCue: Idle`;
			this.statusBarItem.tooltip = 'GitCue is not watching. Click to open dashboard or start watching.';
			this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
		}
		
		// Add command to open dashboard when clicked
		this.statusBarItem.command = 'gitcue.openDashboard';
		this.statusBarItem.show();
	}

	private updateDashboards() {
		// Update all open dashboard panels
		this.dashboardPanels.forEach(panel => {
			if (panel.visible) {
				panel.webview.postMessage({
					action: 'statusUpdate',
					data: { 
						isWatching: this.isWatching,
						config: this.getConfig(),
						watchStatus: this.watchStatus
					}
				});
			}
		});
	}

	private registerCommands() {
		const commands = [
			vscode.commands.registerCommand('gitcue.commit', () => this.commitWithPreview()),
			vscode.commands.registerCommand('gitcue.watchToggle', () => this.toggleWatching()),
			vscode.commands.registerCommand('gitcue.openDashboard', () => this.openDashboard()),
			vscode.commands.registerCommand('gitcue.reset', () => this.resetCommits()),
			vscode.commands.registerCommand('gitcue.configure', () => this.openSettings()),
			vscode.commands.registerCommand('gitcue.showStatus', () => this.showStatus()),
			vscode.commands.registerCommand('gitcue.cancelCommit', () => this.cancelBufferedCommit()),
			vscode.commands.registerCommand('gitcue.openInteractiveTerminal', () => this.openTerminal()),
			vscode.commands.registerCommand('gitcue.openAITerminal', () => this.openTerminal()),
			vscode.commands.registerCommand('gitcue.dashboard', () => this.openDashboard())
		];

		commands.forEach(command => this.context.subscriptions.push(command));
	}

	private registerViews() {
		const statusView = vscode.window.createTreeView('gitcueStatus', {
			treeDataProvider: this.statusProvider,
			showCollapseAll: false
		});
		this.context.subscriptions.push(statusView);
	}

	private async commitWithPreview() {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder found');
				return;
			}

			const config = this.getConfig();
			if (!config.geminiApiKey) {
				const action = await vscode.window.showWarningMessage(
					'Gemini API key not configured. Would you like to set it up?',
					'Configure'
				);
				if (action === 'Configure') {
					this.openSettings();
				}
				return;
			}

			// Show progress
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'GitCue: Generating AI commit message...',
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 30, message: 'Analyzing changes...' });
				
				// Get git status and diff
				const { stdout: status } = await execAsync('git status --porcelain', { 
					cwd: workspaceFolder.uri.fsPath 
				});
				
				if (!status.trim()) {
					vscode.window.showInformationMessage('No changes to commit');
					return;
				}

				progress.report({ increment: 40, message: 'Generating commit message...' });
				
				// Use auto-git CLI to generate commit message
				const commitMessage = await this.generateCommitMessage(workspaceFolder.uri.fsPath, config);
				
				progress.report({ increment: 30, message: 'Opening preview...' });
				
				// Show commit preview
				this.showCommitPreview(commitMessage, status, workspaceFolder.uri.fsPath, config);
			});

		} catch (error) {
			this.outputChannel.appendLine(`Error in commitWithPreview: ${error}`);
			vscode.window.showErrorMessage(`GitCue Error: ${error}`);
		}
	}

	private async analyzeChangesWithAI(workspacePath: string): Promise<{ shouldCommit: boolean; reason: string; significance: string }> {
		try {
			this.watchStatus.aiAnalysisInProgress = true;
			this.updateDashboards();

			// Get git diff and status
			const { stdout: diff } = await execAsync('git diff', { cwd: workspacePath });
			const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });

			if (!diff.trim() && !status.trim()) {
				return { shouldCommit: false, reason: 'No changes detected', significance: 'NONE' };
			}

			// Stage changes for analysis
			await execAsync('git add .', { cwd: workspacePath });
			const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });

			// Use AI function calling to make commit decision
			const decision = await makeCommitDecisionWithAI(stagedDiff, status);
			
			return {
				shouldCommit: decision.shouldCommit,
				reason: decision.reason,
				significance: decision.significance
			};

		} catch (error) {
			logger.error('AI analysis failed: ' + (error instanceof Error ? error.message : String(error)));
			return { shouldCommit: true, reason: 'AI analysis failed, defaulting to commit', significance: 'MEDIUM' };
		} finally {
			this.watchStatus.aiAnalysisInProgress = false;
			this.updateDashboards();
		}
	}

	private async commitWithBuffer(workspacePath: string, config: GitCueConfig) {
		try {
			// Get git status and diff
			const { stdout: status } = await execAsync('git status --porcelain', { 
				cwd: workspacePath 
			});
			
			if (!status.trim()) {
				this.outputChannel.appendLine('No changes to commit');
				return;
			}

			// Stage all changes
			await execAsync('git add .', { cwd: workspacePath });

			// AI analysis for intelligent mode
			if (config.commitMode === 'intelligent') {
				const analysis = await this.analyzeChangesWithAI(workspacePath);
				
				if (!analysis.shouldCommit) {
					this.outputChannel.appendLine(`AI decided not to commit: ${analysis.reason}`);
					if (config.enableNotifications) {
						vscode.window.showInformationMessage(`🤖 GitCue: ${analysis.reason}`);
					}
					return;
				}
				
				this.outputChannel.appendLine(`AI analysis: ${analysis.reason} (${analysis.significance})`);
			}

			// Generate commit message
			const commitMessage = await this.generateCommitMessage(workspacePath, config);
			
			// Show buffer notification
			await this.showBufferNotification(commitMessage, status, workspacePath, config);

		} catch (error) {
			this.outputChannel.appendLine(`Error in commitWithBuffer: ${error}`);
			if (config.enableNotifications) {
				vscode.window.showErrorMessage(`GitCue Error: ${error}`);
			}
		}
	}

	private async showBufferNotification(message: string, status: string, workspacePath: string, config: GitCueConfig): Promise<void> {
		return new Promise((resolve) => {
			// Cancel any existing buffer notification
			if (this.bufferNotification) {
				this.cancelBufferedCommit();
			}

			this.watchStatus.pendingCommit = true;
			this.updateDashboards();

			const panel = vscode.window.createWebviewPanel(
				'gitcueBuffer',
				'⏰ GitCue Commit Buffer',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			let timeLeft = config.bufferTimeSeconds;
			let cancelled = false;

			const updatePanel = () => {
				panel.webview.html = this.getBufferNotificationHtml(message, status, timeLeft, config);
			};

			updatePanel();

			// Show notification
			if (config.enableNotifications) {
				vscode.window.showWarningMessage(
					`⏰ GitCue: Committing in ${timeLeft} seconds. Click to cancel.`,
					'Cancel Commit'
				).then(action => {
					if (action === 'Cancel Commit') {
						cancelled = true;
						clearInterval(timer);
						panel.dispose();
						this.bufferNotification = undefined;
						this.watchStatus.pendingCommit = false;
						this.updateDashboards();
						resolve();
					}
				});
			}

			const timer = setInterval(() => {
				timeLeft--;
				if (timeLeft <= 0 || cancelled) {
					clearInterval(timer);
					panel.dispose();
					
					if (!cancelled) {
						// Proceed with commit
						this.executeCommit(message, workspacePath, config, config.autoPush)
							.finally(() => {
								this.watchStatus.pendingCommit = false;
								this.watchStatus.lastCommit = new Date().toLocaleTimeString();
								this.updateDashboards();
								resolve();
							});
					} else {
						this.watchStatus.pendingCommit = false;
						this.updateDashboards();
						resolve();
					}
					
			this.bufferNotification = undefined;
				} else {
					updatePanel();
				}
			}, 1000);

			// Handle messages from the buffer panel
			panel.webview.onDidReceiveMessage((msg) => {
				if (msg.action === 'cancel') {
					cancelled = true;
					clearInterval(timer);
					panel.dispose();
					this.bufferNotification = undefined;
					this.watchStatus.pendingCommit = false;
					this.updateDashboards();
					
					if (config.enableNotifications) {
						vscode.window.showInformationMessage('🚫 GitCue: Commit cancelled');
					}
					this.outputChannel.appendLine('Commit cancelled by user');
					resolve();
				}
			});

			// Handle panel disposal
			panel.onDidDispose(() => {
				if (!cancelled && timeLeft > 0) {
					cancelled = true;
					clearInterval(timer);
					this.bufferNotification = undefined;
					this.watchStatus.pendingCommit = false;
					this.updateDashboards();
					resolve();
				}
			});

			this.bufferNotification = { panel, timer, cancelled: false };
		});
	}

	private getBufferNotificationHtml(message: string, status: string, timeLeft: number, config: GitCueConfig): string {
		const fileCount = status.split('\n').filter(line => line.trim()).length;
		
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>GitCue Commit Buffer</title>
			<style>
				:root {
					--primary: #007acc;
					--danger: #f44336;
					--warning: #ff9800;
					--success: #4caf50;
					--bg-primary: var(--vscode-editor-background);
					--bg-secondary: var(--vscode-sideBar-background);
					--text-primary: var(--vscode-foreground);
					--text-secondary: var(--vscode-descriptionForeground);
					--border: var(--vscode-panel-border);
					--radius: 12px;
					--shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
				}

				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}

				body {
					font-family: var(--vscode-font-family);
					background: var(--bg-primary);
					color: var(--text-primary);
					line-height: 1.6;
					overflow: hidden;
				}

				.container {
					height: 100vh;
					display: flex;
					flex-direction: column;
					padding: 24px;
					background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
				}

				.header {
					text-align: center;
					margin-bottom: 32px;
					animation: slideDown 0.6s ease-out;
				}

				.timer-circle {
					width: 120px;
					height: 120px;
					margin: 0 auto 16px;
					position: relative;
					background: conic-gradient(var(--warning) ${(timeLeft / config.bufferTimeSeconds) * 360}deg, var(--border) 0deg);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					animation: pulse 2s infinite;
				}

				.timer-inner {
					width: 100px;
					height: 100px;
					background: var(--bg-primary);
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 28px;
					font-weight: 700;
					color: var(--warning);
				}

				.title {
					font-size: 24px;
					font-weight: 600;
					margin-bottom: 8px;
					color: var(--text-primary);
				}

				.subtitle {
					font-size: 16px;
					color: var(--text-secondary);
					margin-bottom: 24px;
				}

				.commit-info {
					background: var(--bg-secondary);
					border: 1px solid var(--border);
					border-radius: var(--radius);
					padding: 24px;
					margin-bottom: 24px;
					animation: slideUp 0.6s ease-out 0.2s both;
				}

				.commit-message {
					font-size: 16px;
					font-weight: 500;
					margin-bottom: 16px;
					padding: 16px;
					background: var(--vscode-textCodeBlock-background);
					border-radius: 8px;
					border-left: 4px solid var(--primary);
				}

				.file-stats {
					display: flex;
					align-items: center;
					gap: 16px;
					font-size: 14px;
					color: var(--text-secondary);
				}

				.stat {
					display: flex;
					align-items: center;
					gap: 6px;
				}

				.actions {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 12px;
					margin-bottom: 24px;
				}

				.btn {
					flex: 1;
					padding: 16px 24px;
					border: none;
					border-radius: var(--radius);
					font-size: 16px;
					font-weight: 600;
					cursor: pointer;
					transition: all 0.3s ease;
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
				}

				.btn-cancel {
					background: var(--danger);
					color: white;
				}

				.btn-cancel:hover {
					background: #d32f2f;
					transform: translateY(-2px);
					box-shadow: var(--shadow);
				}

				.progress-bar {
					width: 100%;
					height: 4px;
					background: var(--border);
					border-radius: 2px;
					overflow: hidden;
					margin: 16px 0;
				}

				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, var(--warning), var(--danger));
					border-radius: 2px;
					transition: width 1s linear;
					width: ${(timeLeft / config.bufferTimeSeconds) * 100}%;
				}

				@keyframes slideDown {
					from { opacity: 0; transform: translateY(-30px); }
					to { opacity: 1; transform: translateY(0); }
				}

				@keyframes slideUp {
					from { opacity: 0; transform: translateY(30px); }
					to { opacity: 1; transform: translateY(0); }
				}

				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				.animate-in {
					animation: slideUp 0.6s ease-out;
				}

				.warning-text {
					color: var(--warning);
					font-weight: 600;
				}

				.keyboard-hint {
					text-align: center;
					font-size: 14px;
					color: var(--text-secondary);
					margin-top: 16px;
					opacity: 0.8;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<div class="timer-circle">
						<div class="timer-inner">${timeLeft}</div>
					</div>
					<h1 class="title">⏰ Commit Buffer Period</h1>
					<p class="subtitle">GitCue is about to commit your changes</p>
				</div>

				<div class="commit-info">
					<div class="commit-message">
						💬 ${message}
					</div>
					<div class="file-stats">
						<div class="stat">
							<span>📁</span>
							<span>${fileCount} files changed</span>
						</div>
						<div class="stat">
							<span>🔄</span>
							<span>${config.commitMode} mode</span>
						</div>
						<div class="stat">
							<span>🚀</span>
							<span>${config.autoPush ? 'Auto-push enabled' : 'No auto-push'}</span>
						</div>
					</div>
				</div>

				<div class="progress-bar">
					<div class="progress-fill"></div>
				</div>

				<p class="warning-text" style="text-align: center; margin-bottom: 16px;">
					⚠️ Committing in ${timeLeft} seconds...
				</p>

				<div class="actions">
					<button class="btn btn-primary" onclick="cancelCommit()">
						<span></span>
						<span>Cancel Commit</span>
					</button>
				</div>

				<div class="keyboard-hint">
					Press 'c', 'x', or Ctrl+X to cancel, or click the button above
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();

				function cancelCommit() {
					vscode.postMessage({ action: 'cancel' });
				}

				// Listen for keyboard shortcuts
				document.addEventListener('keydown', function(e) {
					// Handle 'c' or 'x' keys
					if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x') {
						e.preventDefault();
						cancelCommit();
					}
					// Handle Ctrl+X
					if (e.ctrlKey && e.key.toLowerCase() === 'x') {
						e.preventDefault();
						cancelCommit();
					}
				});

				// Auto-focus for keyboard input
				document.body.focus();
			</script>
		</body>
		</html>`;
	}

	private cancelBufferedCommit() {
		if (this.bufferNotification) {
			this.bufferNotification.cancelled = true;
			clearInterval(this.bufferNotification.timer);
			this.bufferNotification.panel.dispose();
			this.bufferNotification = undefined;
			
			const config = this.getConfig();
			if (config.enableNotifications) {
				vscode.window.showInformationMessage('🚫 GitCue: Commit cancelled');
			}
			this.outputChannel.appendLine('Commit cancelled by user');
		}
	}

	private async generateCommitMessage(workspacePath: string, config: GitCueConfig): Promise<string> {
		try {
			// Get git status first
			const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });

			if (!status.trim()) {
				return 'feat: automated commit via GitCue';
			}

			// Stage all changes to get proper diff for AI analysis
			await execAsync('git add .', { cwd: workspacePath });
			
			// Get staged diff for AI analysis
			const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });
			
			// Also get unstaged diff for context
			const { stdout: unstagedDiff } = await execAsync('git diff', { cwd: workspacePath });

			// Use AI function calling to generate commit message with better context
			const commitMessage = await generateCommitMessageWithAI(stagedDiff || unstagedDiff, status);
			return commitMessage || 'feat: automated commit via GitCue';

		} catch (error) {
			logger.error('Commit message generation failed: ' + (error instanceof Error ? error.message : String(error)));
			return 'feat: automated commit via GitCue';
		}
	}

	private showCommitPreview(message: string, status: string, workspacePath: string, config: GitCueConfig) {
		const panel = vscode.window.createWebviewPanel(
			'gitcueCommitPreview',
			'GitCue: Commit Preview',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		panel.webview.html = this.getCommitPreviewHtml(message, status, config);

		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.action) {
				case 'commit':
					await this.executeCommit(message.commitMessage, workspacePath, config, message.shouldPush);
					panel.dispose();
					break;
				case 'cancel':
					panel.dispose();
					break;
				case 'edit':
					const newMessage = await vscode.window.showInputBox({
						value: message.commitMessage,
						prompt: 'Edit commit message',
						placeHolder: 'Enter your commit message'
					});
					if (newMessage) {
						panel.webview.postMessage({ action: 'updateMessage', message: newMessage });
					}
					break;
			}
		});
	}

	private getCommitPreviewHtml(message: string, status: string, config: GitCueConfig): string {
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>GitCue Commit Preview</title>
			<style>
				:root {
					--primary-color: #007acc;
					--success-color: #4caf50;
					--warning-color: #ff9800;
					--danger-color: #f44336;
					--border-radius: 8px;
					--shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
					--transition: all 0.2s ease-in-out;
				}

				* {
					box-sizing: border-box;
				}

				body { 
					font-family: var(--vscode-font-family); 
					padding: 0;
					margin: 0;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					line-height: 1.6;
				}

				.container {
					max-width: 800px;
					margin: 0 auto;
				}

				.header { 
					text-align: center;
					padding: 24px 0;
					border-bottom: 2px solid var(--vscode-panel-border);
					margin-bottom: 32px;
					background: linear-gradient(135deg, var(--vscode-textCodeBlock-background), var(--vscode-editor-background));
					border-radius: var(--border-radius);
					box-shadow: var(--shadow);
				}

				.header h1 {
					margin: 0 0 8px 0;
					font-size: 28px;
					font-weight: 600;
					background: linear-gradient(45deg, var(--primary-color), var(--success-color));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}

				.header p {
					margin: 0;
					opacity: 0.8;
					font-size: 16px;
				}

				.section {
					margin-bottom: 24px;
					animation: slideInUp 0.3s ease-out;
				}

				.section-title {
					display: flex;
					align-items: center;
					gap: 8px;
					font-size: 18px;
					font-weight: 600;
					margin-bottom: 12px;
					color: var(--vscode-foreground);
				}

				.section-icon {
					font-size: 20px;
				}

				.commit-message-container {
					position: relative;
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					overflow: hidden;
					box-shadow: var(--shadow);
					transition: var(--transition);
				}

				.commit-message-container:hover {
					border-color: var(--primary-color);
					box-shadow: 0 4px 12px rgba(0, 122, 204, 0.2);
				}

				.commit-message {
					padding: 20px;
					font-family: var(--vscode-editor-font-family);
					font-size: 16px;
					line-height: 1.5;
					min-height: 60px;
					word-wrap: break-word;
					position: relative;
				}

				.commit-message::before {
					content: '';
					position: absolute;
					left: 0;
					top: 0;
					bottom: 0;
					width: 4px;
					background: linear-gradient(to bottom, var(--primary-color), var(--success-color));
				}

				.changes-container {
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					overflow: hidden;
					box-shadow: var(--shadow);
					transition: var(--transition);
				}

				.changes-header {
					background: var(--vscode-panel-border);
					padding: 12px 20px;
					font-weight: 600;
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				.changes {
					padding: 20px;
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
					font-size: 14px;
					white-space: pre-wrap;
					max-height: 300px;
					overflow-y: auto;
					line-height: 1.4;
				}

				.changes::-webkit-scrollbar {
					width: 8px;
				}

				.changes::-webkit-scrollbar-track {
					background: var(--vscode-scrollbarSlider-background);
				}

				.changes::-webkit-scrollbar-thumb {
					background: var(--vscode-scrollbarSlider-hoverBackground);
					border-radius: 4px;
				}

				.options-section {
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					padding: 20px;
					box-shadow: var(--shadow);
				}

				.checkbox-container {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 16px;
					background: var(--vscode-input-background);
					border-radius: var(--border-radius);
					border: 1px solid var(--vscode-input-border);
					transition: var(--transition);
					cursor: pointer;
				}

				.checkbox-container:hover {
					background: var(--vscode-list-hoverBackground);
					border-color: var(--primary-color);
				}

				.custom-checkbox {
					position: relative;
					width: 20px;
					height: 20px;
					margin: 0;
				}

				.custom-checkbox input {
					opacity: 0;
					position: absolute;
					width: 100%;
					height: 100%;
					margin: 0;
					cursor: pointer;
				}

				.checkmark {
					position: absolute;
					top: 0;
					left: 0;
					height: 20px;
					width: 20px;
					background: var(--vscode-input-background);
					border: 2px solid var(--vscode-input-border);
					border-radius: 4px;
					transition: var(--transition);
				}

				.custom-checkbox input:checked ~ .checkmark {
					background: var(--primary-color);
					border-color: var(--primary-color);
				}

				.checkmark:after {
					content: "";
					position: absolute;
					display: none;
					left: 6px;
					top: 2px;
					width: 6px;
					height: 10px;
					border: solid white;
					border-width: 0 2px 2px 0;
					transform: rotate(45deg);
				}

				.custom-checkbox input:checked ~ .checkmark:after {
					display: block;
				}

				.checkbox-label {
					font-size: 16px;
					font-weight: 500;
					cursor: pointer;
					user-select: none;
				}

				.actions {
					display: flex;
					gap: 12px;
					justify-content: center;
					flex-wrap: wrap;
					margin-top: 32px;
				}

				.btn {
					display: inline-flex;
					align-items: center;
					gap: 8px;
					padding: 12px 24px;
					border: none;
					border-radius: var(--border-radius);
					font-size: 16px;
					font-weight: 600;
					cursor: pointer;
					transition: var(--transition);
					text-decoration: none;
					position: relative;
					overflow: hidden;
				}

				.btn::before {
					content: '';
					position: absolute;
					top: 0;
					left: -100%;
					width: 100%;
					height: 100%;
					background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
					transition: left 0.5s;
				}

				.btn:hover::before {
					left: 100%;
				}

				.btn-primary {
					background: linear-gradient(135deg, var(--primary-color), var(--info));
					color: white;
					box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
				}

				.btn-primary:hover {
					background: linear-gradient(135deg, #005a9e, var(--primary-color));
					transform: translateY(-2px);
					box-shadow: 0 6px 16px rgba(0, 122, 204, 0.4);
				}

				.btn-secondary {
					background: var(--vscode-button-secondaryBackground);
					color: var(--vscode-button-secondaryForeground);
					border: 2px solid var(--vscode-panel-border);
				}

				.btn-secondary:hover {
					border-color: var(--primary-color);
					background: var(--vscode-button-secondaryHoverBackground);
				}

				.btn-danger {
					background: linear-gradient(135deg, var(--danger-color), #d32f2f);
					color: white;
				}

				.btn-danger:hover {
					background: linear-gradient(135deg, #d32f2f, var(--danger-color));
					transform: translateY(-2px);
				}

				.btn-icon {
					font-size: 18px;
				}

				.stats-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 16px;
					margin-bottom: 24px;
				}

				.stat-card {
					background: var(--vscode-textCodeBlock-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					padding: 16px;
					text-align: center;
					transition: var(--transition);
				}

				.stat-card:hover {
					border-color: var(--primary-color);
					transform: translateY(-2px);
					box-shadow: var(--shadow);
				}

				.stat-value {
					font-size: 24px;
					font-weight: 700;
					color: var(--primary-color);
					margin-bottom: 4px;
				}

				.stat-label {
					font-size: 14px;
					opacity: 0.8;
				}

				@keyframes slideInUp {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.7; }
				}

				.loading {
					animation: pulse 1.5s infinite;
				}

				@media (max-width: 600px) {
					.container {
						padding: 16px;
					}
					
					.actions {
						flex-direction: column;
					}
					
					.btn {
						width: 100%;
					}
					
					.stats-grid {
						grid-template-columns: 1fr;
					}
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1>🤖 GitCue AI Commit</h1>
					<p>Review your AI-generated commit message and make any final adjustments</p>
				</div>

				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-value">${status.split('\n').filter(line => line.trim()).length}</div>
						<div class="stat-label">Files Changed</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">${config.commitMode}</div>
						<div class="stat-label">Commit Mode</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">${config.autoPush ? 'Yes' : 'No'}</div>
						<div class="stat-label">Auto Push</div>
					</div>
				</div>

				<div class="section">
					<div class="section-title">
						<span class="section-icon">💬</span>
						Commit Message
					</div>
					<div class="commit-message-container">
						<div class="commit-message" id="commitMessage">${message}</div>
					</div>
				</div>

				<div class="section">
					<div class="section-title">
						<span class="section-icon">📋</span>
						Changes to Commit
					</div>
					<div class="changes-container">
						<div class="changes-header">
							Modified Files
						</div>
						<div class="changes">${status}</div>
					</div>
				</div>

				<div class="section">
					<div class="section-title">
						<span class="section-icon">⚙️</span>
						Options
					</div>
					<div class="options-section">
						<label class="checkbox-container" for="shouldPush">
							<div class="custom-checkbox">
								<input type="checkbox" id="shouldPush" ${config.autoPush ? 'checked' : ''}>
								<span class="checkmark"></span>
							</div>
							<span class="checkbox-label">Push to remote repository after commit</span>
						</label>
					</div>
				</div>

				<div class="actions">
					<button class="btn btn-primary" onclick="commit()">
						<span class="btn-icon">🚀</span>
						<span>Commit & ${config.autoPush ? 'Push' : 'Save'}</span>
					</button>
					<button class="btn btn-secondary" onclick="editMessage()">
						<span class="btn-icon">✏️</span>
						<span>Edit Message</span>
					</button>
					<button class="btn btn-secondary btn-danger" onclick="cancel()">
						<span class="btn-icon">❌</span>
						<span>Cancel</span>
					</button>
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				
				// Add smooth interactions
				document.addEventListener('DOMContentLoaded', function() {
					// Animate elements on load
					const sections = document.querySelectorAll('.section');
					sections.forEach((section, index) => {
						section.style.animationDelay = \`\${index * 0.1}s\`;
					});

					// Add click effects to buttons
					const buttons = document.querySelectorAll('.btn');
					buttons.forEach(button => {
						button.addEventListener('click', function(e) {
							const ripple = document.createElement('span');
							const rect = button.getBoundingClientRect();
							const size = Math.max(rect.width, rect.height);
							const x = e.clientX - rect.left - size / 2;
							const y = e.clientY - rect.top - size / 2;
							
							ripple.style.cssText = \`
								position: absolute;
								width: \${size}px;
								height: \${size}px;
								left: \${x}px;
								top: \${y}px;
								background: rgba(255, 255, 255, 0.3);
								border-radius: 50%;
								transform: scale(0);
								animation: ripple 0.6s linear;
								pointer-events: none;
							\`;
							
							button.appendChild(ripple);
							setTimeout(() => ripple.remove(), 600);
						});
					});
				});

				// Add ripple animation
				const style = document.createElement('style');
				style.textContent = \`
					@keyframes ripple {
						to {
							transform: scale(4);
							opacity: 0;
						}
					}
				\`;
				document.head.appendChild(style);
				
				function commit() {
					const shouldPush = document.getElementById('shouldPush').checked;
					const commitMessage = document.getElementById('commitMessage').textContent;
					
					// Add loading state
					const btn = event.target.closest('.btn');
					btn.classList.add('loading');
					btn.disabled = true;
					
					vscode.postMessage({
						action: 'commit',
						commitMessage: commitMessage,
						shouldPush: shouldPush
					});
				}
				
				function editMessage() {
					const commitMessage = document.getElementById('commitMessage').textContent;
					vscode.postMessage({
						action: 'edit',
						commitMessage: commitMessage
					});
				}
				
				function cancel() {
					vscode.postMessage({ action: 'cancel' });
				}

				// Listen for message updates
				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'updateMessage') {
						const messageEl = document.getElementById('commitMessage');
						messageEl.textContent = message.message;
						
						// Add update animation
						messageEl.style.animation = 'none';
						messageEl.offsetHeight; // Trigger reflow
						messageEl.style.animation = 'slideInUp 0.3s ease-out';
					}
				});

				// Auto-resize commit message area
				const commitMessage = document.getElementById('commitMessage');
				if (commitMessage) {
					commitMessage.addEventListener('input', function() {
						this.style.height = 'auto';
						this.style.height = this.scrollHeight + 'px';
					});
				}
			</script>
		</body>
		</html>`;
	}

	private async executeCommit(message: string, workspacePath: string, config: GitCueConfig, shouldPush: boolean) {
		const maxRetries = 3;
		let retryCount = 0;
		
		while (retryCount < maxRetries) {
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
					title: `GitCue: Committing changes${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}...`,
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 30, message: 'Adding files...' });
				await execAsync('git add .', { cwd: workspacePath });
				
				progress.report({ increment: 40, message: 'Creating commit...' });
				await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: workspacePath });
				
				if (shouldPush) {
					progress.report({ increment: 30, message: 'Pushing to remote...' });
					await execAsync('git push', { cwd: workspacePath });
				}
			});

			const pushText = shouldPush ? ' and pushed' : '';
			if (config.enableNotifications) {
					vscode.window.showInformationMessage(`GitCue: Changes committed${pushText} successfully!`);
			}
			
			this.outputChannel.appendLine(`Commit successful: ${message}`);
			this.statusProvider.refresh();
				this.watchStatus.lastCommit = new Date().toLocaleTimeString();
				this.watchStatus.filesChanged = 0;
				this.watchStatus.changedFiles.clear();
				
				// Log commit activity
				this.logActivity('commit', `Committed: ${message}`, shouldPush ? 'Pushed to remote' : 'Local commit only');
				
				this.updateDashboards();
				return; // Success, exit retry loop
			
		} catch (error) {
				retryCount++;
				const errorMsg = error instanceof Error ? error.message : String(error);
				this.outputChannel.appendLine(`Commit attempt ${retryCount} failed: ${errorMsg}`);
				
				if (retryCount >= maxRetries) {
					// Final failure - prompt user for manual intervention
					const action = await vscode.window.showErrorMessage(
						`GitCue: Commit failed after ${maxRetries} attempts. Please fix the issue manually.`,
						'Open Terminal',
						'View Output',
						'Retry Later'
					);
					
					switch (action) {
						case 'Open Terminal':
							this.openTerminal();
							break;
						case 'View Output':
							this.outputChannel.show();
							break;
						case 'Retry Later':
							// Schedule retry in 5 minutes
							setTimeout(() => {
								this.executeCommit(message, workspacePath, config, shouldPush);
							}, 5 * 60 * 1000);
							break;
					}
					
					logger.error(`Commit failed after ${maxRetries} attempts: ${errorMsg}`);
					throw error;
				} else {
					// Wait before retry (exponential backoff)
					const waitTime = Math.pow(2, retryCount) * 1000;
					await new Promise(resolve => setTimeout(resolve, waitTime));
					
					if (config.enableNotifications) {
						vscode.window.showWarningMessage(`GitCue: Commit failed, retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
					}
				}
			}
		}
	}

	private toggleWatching() {
		if (this.isWatching) {
			this.stopWatching();
		} else {
			this.startWatching();
		}
	}

	private startWatching() {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		const config = this.getConfig();
		if (!config.geminiApiKey) {
			vscode.window.showWarningMessage('Gemini API key not configured. Please configure it in settings.');
			return;
		}

		// Use comprehensive watch patterns
		const watchPatterns = configManager.getWatchPatterns();
		const watchPattern = `{${watchPatterns.join(',')}}`;
		
		this.fileWatcher = vscode.workspace.createFileSystemWatcher(watchPattern);
		
		// Track changes to avoid duplicate processing - similar to auto-git library
		const changeTracker = new Set<string>();
		let lastDiffHash: string | null = null;
		
		const onFileChange = async (uri: vscode.Uri) => {
			const filePath = uri.fsPath;
			const fileName = path.basename(filePath);
			
			// Filter out Git internal files and other system files
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
				return;
			}
			
			// Skip files in .git directory
			if (filePath.includes('/.git/') || filePath.includes('\\.git\\')) {
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
			
			// Check actual git changes to get accurate count (like auto-git library)
			try {
				const { stdout: gitStatus } = await execAsync('git status --porcelain', { 
					cwd: workspaceFolder.uri.fsPath 
				});
				
				if (gitStatus.trim()) {
					// Parse git status to get unique changed files
					const changedFiles = gitStatus.trim().split('\n')
						.map(line => line.substring(3).trim()) // Remove status prefix
						.filter(file => file.length > 0);
					
					// Update changed files set
					this.watchStatus.changedFiles.clear();
					changedFiles.forEach(file => this.watchStatus.changedFiles.add(file));
					this.watchStatus.filesChanged = this.watchStatus.changedFiles.size;
					
					// Only log and update if there are actual changes
					if (this.watchStatus.filesChanged > 0) {
						// Log the file change activity only for actual user files
						this.logActivity('file_change', `File changed: ${fileName}`, filePath);
						
						// Update last change info
						this.watchStatus.lastChange = fileName + ' at ' + new Date().toLocaleTimeString();
						
						// Log the change
						this.outputChannel.appendLine(`File changed: ${uri.fsPath}`);
						logger.debug(`File change detected: ${uri.fsPath}`);
					}
					
					// Create diff hash to avoid duplicate processing (like auto-git library)
					const { stdout: diff } = await execAsync('git diff', { cwd: workspaceFolder.uri.fsPath });
					const currentDiffHash = this.createDiffHash(diff);
					
					// Skip if this is the same diff we already processed
					if (currentDiffHash === lastDiffHash) {
						this.updateStatusBar();
						this.updateDashboards();
						return;
					}
					
					lastDiffHash = currentDiffHash;
				} else {
					// No git changes, reset counters
					this.watchStatus.changedFiles.clear();
					this.watchStatus.filesChanged = 0;
				}
			} catch (error) {
				// If git commands fail, fall back to simple file counting but still filter out Git files
				if (!gitInternalFiles.includes(fileName) && !systemFiles.includes(fileName)) {
					this.watchStatus.changedFiles.add(filePath);
					this.watchStatus.filesChanged = this.watchStatus.changedFiles.size;
					
					// Log the file change activity only for actual user files
					this.logActivity('file_change', `File changed: ${fileName}`, filePath);
					
					// Update last change info
					this.watchStatus.lastChange = fileName + ' at ' + new Date().toLocaleTimeString();
					
					// Log the change
					this.outputChannel.appendLine(`File changed: ${uri.fsPath}`);
					logger.debug(`File change detected: ${uri.fsPath}`);
				}
				this.logActivity('error', 'Git status check failed', error instanceof Error ? error.message : String(error));
			}
			
			this.updateStatusBar();
			this.updateDashboards();
			
			// Clear existing debounce timer
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}
			
			// Set new debounce timer
			this.debounceTimer = setTimeout(async () => {
				try {
					this.logActivity('ai_analysis', 'Starting AI analysis for changes');
					
				if (config.commitMode === 'intelligent') {
						await this.handleIntelligentCommit();
				} else {
					// For periodic mode, also use buffer notification
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
					if (workspaceFolder) {
							await this.commitWithBuffer(workspaceFolder.uri.fsPath, config);
						}
					}
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : String(error);
					logger.error('Error processing file changes: ' + errorMsg);
					this.logActivity('error', 'Failed to process file changes', errorMsg);
					
					if (config.enableNotifications) {
						vscode.window.showErrorMessage(`GitCue: Error processing changes - ${errorMsg}`);
					}
				}
			}, config.debounceMs);
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
		
		this.context.subscriptions.push(workspaceWatcher);

		this.isWatching = true;
		this.watchStatus.isWatching = true;
		this.watchStatus.filesChanged = 0;
		this.watchStatus.changedFiles.clear();
		this.updateStatusBar();
		this.updateDashboards();
		
		// Log watch start activity
		this.logActivity('watch_start', 'File watching started', `Patterns: ${watchPatterns.join(', ')}`);
		
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('GitCue: Started watching for changes');
		}
		this.outputChannel.appendLine('Started watching for file changes with patterns: ' + watchPatterns.join(', '));
		logger.info('File watching started with enhanced detection');
	}

	// Helper method to create diff hash (similar to auto-git library)
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

	private stopWatching() {
		if (this.fileWatcher) {
			this.fileWatcher.dispose();
			this.fileWatcher = undefined;
		}
		
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		// Cancel any pending commits
		if (this.bufferNotification) {
			this.cancelBufferedCommit();
		}

		this.isWatching = false;
		this.watchStatus.isWatching = false;
		this.watchStatus.filesChanged = 0;
		this.watchStatus.changedFiles.clear();
		this.watchStatus.lastChange = 'None';
		this.updateStatusBar();
		this.updateDashboards();
		
		// Log watch stop activity
		this.logActivity('watch_stop', 'File watching stopped');
		
		const config = this.getConfig();
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('GitCue: Stopped watching');
		}
		this.outputChannel.appendLine('Stopped watching for file changes');
	}

	private async handleIntelligentCommit() {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return;

		const config = this.getConfig();
		if (!config.geminiApiKey) return;

		// Use buffer notification for intelligent commits
		await this.commitWithBuffer(workspaceFolder.uri.fsPath, config);
	}

	private openDashboard() {
		const panel = vscode.window.createWebviewPanel(
			'gitcueDashboard',
			'GitCue Dashboard',
			vscode.ViewColumn.One,
			{ 
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		// Add to dashboard panels list
		this.dashboardPanels.push(panel);

		panel.webview.html = this.getDashboardHtml();

		let panelDisposed = false;
		
		// Handle panel disposal
		panel.onDidDispose(() => {
			panelDisposed = true;
			// Remove from dashboard panels list
			const index = this.dashboardPanels.indexOf(panel);
			if (index > -1) {
				this.dashboardPanels.splice(index, 1);
			}
		});

		// Handle messages from the dashboard
		panel.webview.onDidReceiveMessage(async (message) => {
			try {
				switch (message.action) {
					case 'toggleWatching':
						this.toggleWatching();
						// Send updated status back to dashboard
						setTimeout(() => {
							if (!panelDisposed) {
								panel.webview.postMessage({
									action: 'statusUpdate',
									data: { 
										isWatching: this.isWatching,
										config: this.getConfig(),
										watchStatus: this.watchStatus
									}
								});
							}
						}, 100);
						break;
					case 'openSettings':
						this.openSettings();
						break;
					case 'manualCommit':
						this.commitWithPreview();
						break;
					case 'openTerminal':
						this.openTerminal();
						break;
					case 'keepAlive':
						// Dashboard is alive, send status update
						if (!panelDisposed) {
							panel.webview.postMessage({
								action: 'statusUpdate',
								data: { 
									isWatching: this.isWatching,
									config: this.getConfig(),
									watchStatus: this.watchStatus
								}
							});
						}
						break;
				}
			} catch (error) {
				this.outputChannel.appendLine(`Dashboard message error: ${error}`);
			}
		});

		// Initial status update
		setTimeout(() => {
			if (!panelDisposed) {
				panel.webview.postMessage({
					action: 'statusUpdate',
					data: { 
						isWatching: this.isWatching,
						config: this.getConfig(),
						watchStatus: this.watchStatus
					}
				});
			}
		}, 500);
	}

	private getDashboardHtml(): string {
		const config = this.getConfig();
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>GitCue Dashboard</title>
			<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
			<style>
				:root {
					--primary: #007acc;
					--success: #4caf50;
					--warning: #ff9800;
					--danger: #f44336;
					--info: #2196f3;
					--bg-primary: var(--vscode-editor-background);
					--bg-secondary: var(--vscode-sideBar-background);
					--bg-tertiary: var(--vscode-panel-background);
					--text-primary: var(--vscode-foreground);
					--text-secondary: var(--vscode-descriptionForeground);
					--border: var(--vscode-panel-border);
					--radius: 12px;
					--shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
					--transition: all 0.2s ease;
				}

				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}

				body {
					font-family: var(--vscode-font-family);
					background: var(--bg-primary);
					color: var(--text-primary);
					line-height: 1.6;
					overflow-x: hidden;
					min-height: 100vh;
				}

				.dashboard {
					min-height: 100vh;
					padding: 24px;
					background: var(--bg-primary);
				}

				.container {
					max-width: 1200px;
					margin: 0 auto;
				}

				.header {
					text-align: center;
					margin-bottom: 32px;
				}

				.logo {
					width: 64px;
					height: 64px;
					margin: 0 auto 16px;
					background: linear-gradient(135deg, var(--primary), var(--info));
					border-radius: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					box-shadow: var(--shadow);
				}

				.logo .material-icons {
					font-size: 32px;
				}

				.title {
					font-size: 32px;
					font-weight: 700;
					margin-bottom: 8px;
					background: linear-gradient(135deg, var(--primary), var(--info));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}

				.subtitle {
					font-size: 16px;
					color: var(--text-secondary);
					margin-bottom: 32px;
				}

				.main-grid {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 24px;
					margin-bottom: 24px;
				}

				.card {
					background: var(--bg-secondary);
					border: 1px solid var(--border);
					border-radius: var(--radius);
					padding: 24px;
					transition: var(--transition);
					position: relative;
				}

				.card:hover {
					border-color: var(--primary);
					box-shadow: var(--shadow);
				}

				.card-header {
					display: flex;
					align-items: center;
					gap: 12px;
					margin-bottom: 20px;
				}

				.card-icon {
					width: 40px;
					height: 40px;
					border-radius: 8px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					background: linear-gradient(135deg, var(--primary), var(--info));
				}

				.card-icon .material-icons {
					font-size: 20px;
				}

				.card-title {
					font-size: 18px;
					font-weight: 600;
					color: var(--text-primary);
				}

				.status-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 0;
					border-bottom: 1px solid var(--border);
				}

				.status-item:last-child {
					border-bottom: none;
				}

				.status-label {
					font-size: 14px;
					color: var(--text-primary);
					font-weight: 500;
				}

				.status-value {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.badge {
					padding: 4px 8px;
					border-radius: 12px;
					font-size: 12px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}

				.badge.success {
					background: rgba(76, 175, 80, 0.2);
					color: var(--success);
				}

				.badge.danger {
					background: rgba(244, 67, 54, 0.2);
					color: var(--danger);
				}

				.badge.warning {
					background: rgba(255, 152, 0, 0.2);
					color: var(--warning);
				}

				.badge.info {
					background: rgba(33, 150, 243, 0.2);
					color: var(--info);
				}

				.indicator {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					animation: pulse 2s infinite;
				}

				.indicator.active {
					background: var(--success);
				}

				.indicator.inactive {
					background: var(--danger);
				}

				.indicator.pending {
					background: var(--warning);
				}

				.watch-status {
					grid-column: 1 / -1;
					background: var(--bg-secondary);
					border: 1px solid var(--border);
					border-radius: var(--radius);
					padding: 24px;
					margin-bottom: 24px;
				}

				.watch-stats {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
					gap: 16px;
					margin-top: 16px;
				}

				.stat-card {
					background: var(--bg-tertiary);
					border: 1px solid var(--border);
					border-radius: 8px;
					padding: 16px;
					text-align: center;
				}

				.stat-value {
					font-size: 24px;
					font-weight: 700;
					color: var(--primary);
					margin-bottom: 4px;
				}

				.stat-label {
					font-size: 12px;
					color: var(--text-secondary);
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}

				.actions {
					display: grid;
					grid-template-columns: repeat(2, 1fr);
					gap: 12px;
					margin-bottom: 24px;
				}

				.btn {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
					padding: 12px 16px;
					border: none;
					border-radius: var(--radius);
					font-size: 14px;
					font-weight: 600;
					cursor: pointer;
					transition: var(--transition);
					text-decoration: none;
					position: relative;
					overflow: hidden;
				}

				.btn:hover {
					transform: translateY(-1px);
				}

				.btn-primary {
					background: linear-gradient(135deg, var(--primary), var(--info));
					color: white;
				}

				.btn-primary:hover {
					box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
				}

				.btn-success {
					background: linear-gradient(135deg, var(--success), #388e3c);
					color: white;
				}

				.btn-success:hover {
					box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
				}

				.btn-secondary {
					background: var(--bg-tertiary);
					color: var(--text-primary);
					border: 1px solid var(--border);
				}

				.btn-secondary:hover {
					border-color: var(--primary);
					background: var(--bg-secondary);
				}

				.material-icons {
					font-size: 18px;
				}

				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				@keyframes spin {
					0% { transform: rotate(0deg); }
					100% { transform: rotate(360deg); }
				}

				.spinner {
					animation: spin 1s linear infinite;
				}

				@media (max-width: 768px) {
					.main-grid {
						grid-template-columns: 1fr;
					}
					
					.actions {
						grid-template-columns: 1fr;
					}
				}

				.activity-history {
					grid-column: 1 / -1;
					background: var(--bg-secondary);
					border: 1px solid var(--border);
					border-radius: var(--radius);
					padding: 24px;
					margin-bottom: 24px;
				}

				.btn-toggle {
					background: none;
					border: none;
					color: var(--text-primary);
					cursor: pointer;
					padding: 4px;
					border-radius: 4px;
					transition: var(--transition);
					margin-left: auto;
				}

				.btn-toggle:hover {
					background: var(--bg-tertiary);
				}

				.btn-toggle .material-icons {
					transition: transform 0.3s ease;
				}

				.btn-toggle.expanded .material-icons {
					transform: rotate(180deg);
				}

				.activity-content {
					margin-top: 16px;
					border-top: 1px solid var(--border);
					padding-top: 16px;
				}

				.activity-list {
					max-height: 300px;
					overflow-y: auto;
					padding-right: 8px;
				}

				.activity-list::-webkit-scrollbar {
					width: 6px;
				}

				.activity-list::-webkit-scrollbar-track {
					background: var(--bg-tertiary);
					border-radius: 3px;
				}

				.activity-list::-webkit-scrollbar-thumb {
					background: var(--border);
					border-radius: 3px;
				}

				.activity-list::-webkit-scrollbar-thumb:hover {
					background: var(--text-secondary);
				}

				.activity-item {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 8px 12px;
					border-radius: 6px;
					margin-bottom: 4px;
					transition: var(--transition);
				}

				.activity-item:hover {
					background: var(--bg-tertiary);
				}

				.activity-time {
					font-size: 12px;
					color: var(--text-secondary);
					font-family: monospace;
					min-width: 60px;
				}

				.activity-type {
					font-size: 10px;
					padding: 2px 6px;
					border-radius: 10px;
					text-transform: uppercase;
					font-weight: 600;
					letter-spacing: 0.5px;
					min-width: 80px;
					text-align: center;
				}

				.activity-type.file_change {
					background: rgba(33, 150, 243, 0.2);
					color: var(--info);
				}

				.activity-type.ai_analysis {
					background: rgba(156, 39, 176, 0.2);
					color: #9c27b0;
				}

				.activity-type.commit {
					background: rgba(76, 175, 80, 0.2);
					color: var(--success);
					}

				.activity-type.error {
					background: rgba(244, 67, 54, 0.2);
					color: var(--danger);
				}

				.activity-type.watch_start,
				.activity-type.watch_stop {
					background: rgba(255, 152, 0, 0.2);
					color: var(--warning);
				}

				.activity-message {
					flex: 1;
					font-size: 14px;
					color: var(--text-primary);
				}
			</style>
		</head>
		<body>
			<div class="dashboard">
				<div class="container">
					<div class="header">
						<div class="logo">
							<span class="material-icons">code</span>
						</div>
						<h1 class="title">GitCue Dashboard v0.3.8</h1>
						<p class="subtitle">Monitor your AI-powered Git automation in real-time</p>
					</div>

					<div class="watch-status">
						<div class="card-header">
							<div class="card-icon" id="watchIcon">
								<span class="material-icons">visibility</span>
							</div>
							<h3 class="card-title">Watch Status</h3>
						</div>
						<div class="watch-stats">
							<div class="stat-card">
								<div class="stat-value" id="filesChanged">0</div>
								<div class="stat-label">Files Changed</div>
							</div>
							<div class="stat-card">
								<div class="stat-value" id="lastChange">None</div>
								<div class="stat-label">Last Change</div>
							</div>
							<div class="stat-card">
								<div class="stat-value" id="lastCommit">None</div>
								<div class="stat-label">Last Commit</div>
							</div>
							<div class="stat-card">
								<div class="stat-value" id="aiStatus">Idle</div>
								<div class="stat-label">AI Status</div>
							</div>
						</div>
					</div>

					<div class="activity-history">
						<div class="card-header">
							<div class="card-icon">
								<span class="material-icons">history</span>
							</div>
							<h3 class="card-title">Activity History</h3>
							<button class="btn-toggle" onclick="toggleActivityHistory()" id="historyToggle">
								<span class="material-icons">expand_more</span>
							</button>
						</div>
						<div class="activity-content" id="activityContent" style="display: none;">
							<div class="activity-list" id="activityList">
								<div class="activity-item">
									<span class="activity-time">--:--:--</span>
									<span class="activity-type info">system</span>
									<span class="activity-message">No activity yet</span>
								</div>
							</div>
						</div>
					</div>

					<div class="main-grid">
						<div class="card">
							<div class="card-header">
								<div class="card-icon">
									<span class="material-icons">check_circle</span>
								</div>
								<h3 class="card-title">System Status</h3>
							</div>
							<div class="status-item">
								<span class="status-label">Watching mode</span>
								<div class="status-value">
									<span class="indicator" id="watchIndicator"></span>
									<span class="badge" id="watchBadge">Disabled</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Commit mode</span>
								<div class="status-value">
									<span class="badge" id="commitModeBadge">intelligent</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Auto push</span>
								<div class="status-value">
									<span class="badge" id="autoPushBadge">Enabled</span>
								</div>
							</div>
						</div>

						<div class="card">
							<div class="card-header">
								<div class="card-icon">
									<span class="material-icons">psychology</span>
								</div>
								<h3 class="card-title">AI Configuration</h3>
							</div>
							<div class="status-item">
								<span class="status-label">Gemini API Key</span>
								<div class="status-value">
									<span class="badge" id="apiKeyBadge">Not Set</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">AI Suggestions</span>
								<div class="status-value">
									<span class="badge" id="suggestionsBadge">Enabled</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Rate-limit</span>
								<div class="status-value">
									<span class="badge info" id="rateLimitBadge">15 calls/min</span>
						</div>
					</div>
						</div>
					</div>

					<div class="actions">
						<button class="btn btn-primary" onclick="toggleWatching()" id="watchToggleBtn">
							<span class="material-icons">visibility</span>
							<span>Start Watching</span>
						</button>
						<button class="btn btn-secondary" onclick="openSettings()">
							<span>⚙️</span>
							<span>Configure Settings</span>
						</button>
						<button class="btn btn-success" onclick="manualCommit()">
							<span>🔄</span>
							<span>Manual Commit</span>
						</button>
						<button class="btn btn-secondary" onclick="openTerminal()">
							<span>🖥️</span>
							<span>AI Terminal</span>
						</button>
					</div>
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				let currentState = {
					isWatching: false,
					config: {},
					watchStatus: {
						isWatching: false,
						filesChanged: 0,
						lastChange: 'None',
						lastCommit: 'None',
						pendingCommit: false,
						aiAnalysisInProgress: false,
						activityHistory: [],
						changedFiles: new Set()
					}
				};

				function toggleWatching() {
					vscode.postMessage({ action: 'toggleWatching' });
				}

				function openSettings() {
					vscode.postMessage({ action: 'openSettings' });
				}

				function manualCommit() {
					vscode.postMessage({ action: 'manualCommit' });
				}

				function openTerminal() {
					vscode.postMessage({ action: 'openTerminal' });
				}

				function toggleActivityHistory() {
					const content = document.getElementById('activityContent');
					const toggle = document.getElementById('historyToggle');
					
					if (content.style.display === 'none') {
						content.style.display = 'block';
						toggle.classList.add('expanded');
					} else {
						content.style.display = 'none';
						toggle.classList.remove('expanded');
					}
				}

				function updateActivityHistory(activities) {
					// Simple implementation without template literals to avoid TypeScript issues
					const activityList = document.getElementById('activityList');
					activityList.innerHTML = '';
					
					if (!activities || activities.length === 0) {
						const item = document.createElement('div');
						item.className = 'activity-item';
						item.innerHTML = '<span class="activity-time">--:--:--</span>' +
							'<span class="activity-type info">system</span>' +
							'<span class="activity-message">No activity yet</span>';
						activityList.appendChild(item);
						return;
					}
					
					activities.forEach(function(activity) {
						const item = document.createElement('div');
						item.className = 'activity-item';
						item.title = activity.details || '';
						item.innerHTML = '<span class="activity-time">' + activity.timestamp + '</span>' +
							'<span class="activity-type ' + activity.type + '">' + activity.type.replace('_', ' ') + '</span>' +
							'<span class="activity-message">' + activity.message + '</span>';
						activityList.appendChild(item);
					});
				}

				function updateUI() {
					const { isWatching, config, watchStatus } = currentState;
					
					// Update watch status
					const watchIndicator = document.getElementById('watchIndicator');
					const watchBadge = document.getElementById('watchBadge');
					const watchToggleBtn = document.getElementById('watchToggleBtn');
					const watchIcon = document.getElementById('watchIcon');
					
					if (isWatching) {
						watchIndicator.className = 'indicator active';
						watchBadge.className = 'badge success';
						watchBadge.textContent = 'Active';
						watchToggleBtn.innerHTML = '<span class="material-icons">visibility_off</span><span>Stop Watching</span>';
						watchIcon.innerHTML = '<span class="material-icons">visibility</span>';
					} else {
						watchIndicator.className = 'indicator inactive';
						watchBadge.className = 'badge danger';
						watchBadge.textContent = 'Inactive';
						watchToggleBtn.innerHTML = '<span class="material-icons">visibility</span><span>Start Watching</span>';
						watchIcon.innerHTML = '<span class="material-icons">visibility_off</span>';
					}

					// Update watch statistics
					document.getElementById('filesChanged').textContent = watchStatus.filesChanged || 0;
					document.getElementById('lastChange').textContent = watchStatus.lastChange || 'None';
					document.getElementById('lastCommit').textContent = watchStatus.lastCommit || 'None';
					
					// Update AI status
					const aiStatusEl = document.getElementById('aiStatus');
					if (watchStatus.pendingCommit) {
						aiStatusEl.textContent = 'Committing';
						aiStatusEl.style.color = 'var(--warning)';
					} else if (watchStatus.aiAnalysisInProgress) {
						aiStatusEl.textContent = 'Analyzing';
						aiStatusEl.style.color = 'var(--info)';
					} else {
						aiStatusEl.textContent = 'Idle';
						aiStatusEl.style.color = 'var(--text-secondary)';
					}

					// Update configuration badges
					document.getElementById('commitModeBadge').textContent = config.commitMode || 'intelligent';
					document.getElementById('autoPushBadge').textContent = config.autoPush ? 'Enabled' : 'Disabled';
					document.getElementById('autoPushBadge').className = config.autoPush ? 'badge success' : 'badge danger';
					
					document.getElementById('apiKeyBadge').textContent = config.geminiApiKey ? 'Configured' : 'Not Set';
					document.getElementById('apiKeyBadge').className = config.geminiApiKey ? 'badge success' : 'badge danger';
					
					document.getElementById('suggestionsBadge').textContent = config.enableSuggestions ? 'Enabled' : 'Disabled';
					document.getElementById('suggestionsBadge').className = config.enableSuggestions ? 'badge success' : 'badge danger';
					
					document.getElementById('rateLimitBadge').textContent = (config.maxCallsPerMinute || 15) + ' calls/min';
					
					// Update activity history
					updateActivityHistory(watchStatus.activityHistory);
				}

				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'statusUpdate' && message.data) {
						currentState = message.data;
						updateUI();
					}
				});

				// Keep the dashboard alive
				setInterval(() => {
					vscode.postMessage({ action: 'keepAlive' });
				}, 5000);

				// Initial UI update
				updateUI();
			</script>
		</body>
		</html>`;
	}

	private async resetCommits() {
		const count = await vscode.window.showInputBox({
			prompt: 'How many commits to reset?',
			value: '1',
			validateInput: (value) => {
				const num = parseInt(value);
				if (isNaN(num) || num < 1) {
					return 'Please enter a valid positive number';
				}
				return null;
			}
		});

		if (!count) return;

		const resetType = await vscode.window.showQuickPick([
			{ label: 'Mixed (default)', value: 'mixed', description: 'Reset commits but keep changes in working directory' },
			{ label: 'Soft', value: 'soft', description: 'Reset commits but keep changes staged' },
			{ label: 'Hard', value: 'hard', description: '⚠️ Reset commits and discard all changes' }
		], {
			placeHolder: 'Select reset type'
		});

		if (!resetType) return;

		if (resetType.value === 'hard') {
			const confirm = await vscode.window.showWarningMessage(
				`⚠️ This will permanently discard ${count} commit(s) and all changes. Are you sure?`,
				'Yes, Reset Hard',
				'Cancel'
			);
			if (confirm !== 'Yes, Reset Hard') return;
		}

		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No workspace folder found');
				return;
			}

			const resetFlag = resetType.value === 'mixed' ? '' : `--${resetType.value}`;
			await execAsync(`git reset ${resetFlag} HEAD~${count}`, { 
				cwd: workspaceFolder.uri.fsPath 
			});

			vscode.window.showInformationMessage(`✅ Reset ${count} commit(s) (${resetType.value})`);
			this.statusProvider.refresh();
			
		} catch (error) {
			vscode.window.showErrorMessage(`Reset failed: ${error}`);
		}
	}

	private openSettings() {
		vscode.commands.executeCommand('workbench.action.openSettings', 'gitcue');
	}

	private openTerminal() {
		if (!this.terminal) {
			this.terminal = vscode.window.createTerminal({
				name: 'GitCue',
				pty: new GitCuePty(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath)
			});
		}
		this.terminal.show();
	}

	private showStatus() {
		this.outputChannel.show();
		const config = this.getConfig();
		this.outputChannel.appendLine('=== GitCue Status ===');
		this.outputChannel.appendLine(`Watching: ${this.isWatching}`);
		this.outputChannel.appendLine(`Mode: ${config.commitMode}`);
		this.outputChannel.appendLine(`API Key: ${config.geminiApiKey ? 'Configured' : 'Not Set'}`);
		this.outputChannel.appendLine(`Auto Push: ${config.autoPush}`);
		this.outputChannel.appendLine(`Watch Paths: ${config.watchPaths.join(', ')}`);
	}

	dispose() {
		this.stopWatching();
		this.statusBarItem.dispose();
		this.outputChannel.dispose();
		logger.dispose();
		if (this.terminal) {
			this.terminal.dispose();
		}
	}

	private logActivity(type: ActivityLogEntry['type'], message: string, details?: string) {
		const entry: ActivityLogEntry = {
			timestamp: new Date().toLocaleTimeString(),
			type,
			message,
			details
		};
		
		this.watchStatus.activityHistory.unshift(entry);
		
		// Keep only last 50 entries
		if (this.watchStatus.activityHistory.length > 50) {
			this.watchStatus.activityHistory = this.watchStatus.activityHistory.slice(0, 50);
		}
		
		this.updateDashboards();
	}
}

class GitCueStatusProvider implements vscode.TreeDataProvider<GitCueStatusItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<GitCueStatusItem | undefined | null | void> = new vscode.EventEmitter<GitCueStatusItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<GitCueStatusItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: GitCueStatusItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: GitCueStatusItem): Thenable<GitCueStatusItem[]> {
		if (!element) {
			const config = this.getConfig();
			const isWatching = gitCueExtension?.isWatching || false;
			
			return Promise.resolve([
				new GitCueStatusItem(
					`Status: ${isWatching ? 'Active' : 'Idle'}`, 
					vscode.TreeItemCollapsibleState.None, 
					isWatching ? 'check' : 'circle-outline',
					isWatching ? 'GitCue is actively watching for changes' : 'GitCue is not currently watching'
				),
				new GitCueStatusItem(
					`Mode: ${config.commitMode}`, 
					vscode.TreeItemCollapsibleState.None, 
					config.commitMode === 'intelligent' ? 'brain' : 'clock',
					`Current commit mode: ${config.commitMode}`
				),
				new GitCueStatusItem(
					`API: ${config.geminiApiKey ? 'Configured' : 'Not Set'}`, 
					vscode.TreeItemCollapsibleState.None, 
					config.geminiApiKey ? 'key' : 'warning',
					config.geminiApiKey ? 'Gemini API key is configured' : 'Gemini API key needs to be set'
				),
				new GitCueStatusItem(
					`Auto Push: ${config.autoPush ? 'On' : 'Off'}`, 
					vscode.TreeItemCollapsibleState.None, 
					config.autoPush ? 'cloud-upload' : 'cloud',
					`Auto push to remote: ${config.autoPush ? 'enabled' : 'disabled'}`
				),
				new GitCueStatusItem(
					`Watch Paths: ${config.watchPaths.length}`, 
					vscode.TreeItemCollapsibleState.None, 
					'folder',
					`Monitoring ${config.watchPaths.length} path pattern(s)`
				)
			]);
		}
		return Promise.resolve([]);
	}

	private getConfig(): GitCueConfig {
		const config = vscode.workspace.getConfiguration('gitcue');
		return {
			geminiApiKey: config.get('geminiApiKey') || process.env.GEMINI_API_KEY || '',
			commitMode: config.get('commitMode') || 'periodic',
			autoPush: config.get('autoPush') ?? true,
			watchPaths: config.get('watchPaths') || ['**/*'],
			debounceMs: config.get('debounceMs') || 30000,
			bufferTimeSeconds: config.get('bufferTimeSeconds') || 30,
			maxCallsPerMinute: config.get('maxCallsPerMinute') || 15,
			enableNotifications: config.get('enableNotifications') ?? true,
			autoWatch: config.get('autoWatch') ?? false,
			// Interactive terminal settings
			interactiveOnError: config.get('interactiveOnError') ?? false,
			enableSuggestions: config.get('enableSuggestions') ?? false,
			terminalVerbose: config.get('terminalVerbose') ?? false,
			sessionPersistence: config.get('sessionPersistence') ?? false,
			maxHistorySize: config.get('maxHistorySize') || 100
		};
	}
}

class GitCueStatusItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		iconName: string,
		tooltip?: string
	) {
		super(label, collapsibleState);
		this.iconPath = new vscode.ThemeIcon(iconName);
		if (tooltip) {
			this.tooltip = tooltip;
		}
	}
}

let gitCueExtension: GitCueExtension;

export function activate(context: vscode.ExtensionContext) {
	logger.info('GitCue extension activated');
	
	gitCueExtension = new GitCueExtension(context);

	// Show terminal on activation if configured
	const config = configManager.getConfig();
	if (config.autoWatch) {
		vscode.commands.executeCommand('gitcue.openInteractiveTerminal');
	}
}

export function deactivate() {
	if (gitCueExtension) {
		gitCueExtension.dispose();
	}
	logger.info('GitCue extension deactivated');
}
