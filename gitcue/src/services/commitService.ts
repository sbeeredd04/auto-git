import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitCueConfig, BufferNotification } from '../types/interfaces';
import { makeCommitDecisionWithAI, generateCommitMessageWithAI } from '../utils/ai';
import logger from '../utils/logger';
import { DashboardService } from './dashboardService';
import { ActivityLogger } from './activityLogger';

const execAsync = promisify(exec);

export class CommitService {
	private static instance: CommitService;
	private bufferNotification: BufferNotification | undefined;
	private dashboardService: DashboardService;
	private activityLogger: ActivityLogger;

	private constructor() {
		this.dashboardService = DashboardService.getInstance();
		this.activityLogger = ActivityLogger.getInstance();
	}

	static getInstance(): CommitService {
		if (!CommitService.instance) {
			CommitService.instance = new CommitService();
		}
		return CommitService.instance;
	}

	async commitWithPreview(workspacePath: string, config: GitCueConfig): Promise<void> {
		try {
			if (!config.geminiApiKey) {
				const action = await vscode.window.showWarningMessage(
					'Gemini API key not configured. Would you like to set it up?',
					'Configure'
				);
				if (action === 'Configure') {
					vscode.commands.executeCommand('workbench.action.openSettings', 'gitcue');
				}
				return;
			}

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'GitCue: Generating AI commit message...',
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 30, message: 'Analyzing changes...' });
				
				const { stdout: status } = await execAsync('git status --porcelain', { 
					cwd: workspacePath 
				});
				
				if (!status.trim()) {
					vscode.window.showInformationMessage('No changes to commit');
					return;
				}

				progress.report({ increment: 40, message: 'Generating commit message...' });
				
				const commitMessage = await this.generateCommitMessage(workspacePath, config);
				
				progress.report({ increment: 30, message: 'Opening preview...' });
				
				this.showCommitPreview(commitMessage, status, workspacePath, config);
			});

		} catch (error) {
			logger.error(`Error in commitWithPreview: ${error}`);
			vscode.window.showErrorMessage(`GitCue Error: ${error}`);
		}
	}

	async commitWithBuffer(workspacePath: string, config: GitCueConfig): Promise<void> {
		try {
			const { stdout: status } = await execAsync('git status --porcelain', { 
				cwd: workspacePath 
			});
			
			if (!status.trim()) {
				logger.info('No changes to commit');
				return;
			}

			await execAsync('git add .', { cwd: workspacePath });

			if (config.commitMode === 'intelligent') {
				const analysis = await this.analyzeChangesWithAI(workspacePath);
				
				if (!analysis.shouldCommit) {
					logger.info(`AI decided not to commit: ${analysis.reason}`);
					if (config.enableNotifications) {
						vscode.window.showInformationMessage(`🤖 GitCue: ${analysis.reason}`);
					}
					return;
				}
				
				logger.info(`AI analysis: ${analysis.reason} (${analysis.significance})`);
			}

			const commitMessage = await this.generateCommitMessage(workspacePath, config);
			await this.showBufferNotification(commitMessage, status, workspacePath, config);

		} catch (error) {
			logger.error(`Error in commitWithBuffer: ${error}`);
			if (config.enableNotifications) {
				vscode.window.showErrorMessage(`GitCue Error: ${error}`);
			}
		}
	}

	private async analyzeChangesWithAI(workspacePath: string): Promise<{ shouldCommit: boolean; reason: string; significance: string }> {
		try {
			this.activityLogger.setAiAnalysisInProgress(true);

			const { stdout: diff } = await execAsync('git diff', { cwd: workspacePath });
			const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });

			if (!diff.trim() && !status.trim()) {
				return { shouldCommit: false, reason: 'No changes detected', significance: 'NONE' };
			}

			await execAsync('git add .', { cwd: workspacePath });
			const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });

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
			this.activityLogger.setAiAnalysisInProgress(false);
		}
	}

	private async generateCommitMessage(workspacePath: string, config: GitCueConfig): Promise<string> {
		try {
			const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });

			if (!status.trim()) {
				return 'feat: automated commit via GitCue';
			}

			await execAsync('git add .', { cwd: workspacePath });
			
			const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });
			const { stdout: unstagedDiff } = await execAsync('git diff', { cwd: workspacePath });

			const commitMessage = await generateCommitMessageWithAI(stagedDiff || unstagedDiff, status);
			return commitMessage || 'feat: automated commit via GitCue';

		} catch (error) {
			logger.error('Commit message generation failed: ' + (error instanceof Error ? error.message : String(error)));
			return 'feat: automated commit via GitCue';
		}
	}

	private showCommitPreview(message: string, status: string, workspacePath: string, config: GitCueConfig): void {
		const panel = this.dashboardService.createCommitPreview(
			{ message, status, workspacePath, config },
			async (messageData) => {
				switch (messageData.action) {
					case 'commit':
						await this.executeCommit(messageData.commitMessage, workspacePath, config, messageData.shouldPush);
						panel.dispose();
						break;
					case 'cancel':
						panel.dispose();
						break;
					case 'edit':
						const newMessage = await vscode.window.showInputBox({
							value: messageData.commitMessage,
							prompt: 'Edit commit message',
							placeHolder: 'Enter your commit message'
						});
						if (newMessage) {
							panel.webview.postMessage({ action: 'updateMessage', message: newMessage });
						}
						break;
				}
			}
		);
	}

	private async showBufferNotification(message: string, status: string, workspacePath: string, config: GitCueConfig): Promise<void> {
		return new Promise((resolve) => {
			if (this.bufferNotification) {
				this.cancelBufferedCommit();
			}

			this.activityLogger.setPendingCommit(true);

			let timeLeft = config.bufferTimeSeconds;
			let cancelled = false;

			const panel = this.dashboardService.createBufferNotification({
				message, status, timeLeft, config
			});

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
						this.activityLogger.setPendingCommit(false);
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
						this.executeCommit(message, workspacePath, config, config.autoPush)
							.finally(() => {
								this.activityLogger.setPendingCommit(false);
								resolve();
							});
					} else {
						this.activityLogger.setPendingCommit(false);
						resolve();
					}
					
					this.bufferNotification = undefined;
				}
			}, 1000);

			panel.webview.onDidReceiveMessage((msg) => {
				if (msg.action === 'cancel') {
					cancelled = true;
					clearInterval(timer);
					panel.dispose();
					this.bufferNotification = undefined;
					this.activityLogger.setPendingCommit(false);
					
					if (config.enableNotifications) {
						vscode.window.showInformationMessage('🚫 GitCue: Commit cancelled');
					}
					logger.info('Commit cancelled by user');
					resolve();
				}
			});

			panel.onDidDispose(() => {
				if (!cancelled && timeLeft > 0) {
					cancelled = true;
					clearInterval(timer);
					this.bufferNotification = undefined;
					this.activityLogger.setPendingCommit(false);
					resolve();
				}
			});

			this.bufferNotification = { panel, timer, cancelled: false };
		});
	}

	private async executeCommit(message: string, workspacePath: string, config: GitCueConfig, shouldPush: boolean): Promise<void> {
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
				
				logger.info(`Commit successful: ${message}`);
				this.activityLogger.setCommitCompleted(message, shouldPush);
				return;
				
			} catch (error) {
				retryCount++;
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.error(`Commit attempt ${retryCount} failed: ${errorMsg}`);
				
				if (retryCount >= maxRetries) {
					const action = await vscode.window.showErrorMessage(
						`GitCue: Commit failed after ${maxRetries} attempts. Please fix the issue manually.`,
						'Open Terminal',
						'View Output',
						'Retry Later'
					);
					
					switch (action) {
						case 'Open Terminal':
							vscode.commands.executeCommand('gitcue.openInteractiveTerminal');
							break;
						case 'View Output':
							logger.show();
							break;
						case 'Retry Later':
							setTimeout(() => {
								this.executeCommit(message, workspacePath, config, shouldPush);
							}, 5 * 60 * 1000);
							break;
					}
					
					logger.error(`Commit failed after ${maxRetries} attempts: ${errorMsg}`);
					throw error;
				} else {
					const waitTime = Math.pow(2, retryCount) * 1000;
					await new Promise(resolve => setTimeout(resolve, waitTime));
					
					if (config.enableNotifications) {
						vscode.window.showWarningMessage(`GitCue: Commit failed, retrying in ${waitTime/1000}s... (${retryCount}/${maxRetries})`);
					}
				}
			}
		}
	}

	cancelBufferedCommit(): void {
		if (this.bufferNotification) {
			this.bufferNotification.cancelled = true;
			clearInterval(this.bufferNotification.timer);
			this.bufferNotification.panel.dispose();
			this.bufferNotification = undefined;
			
			vscode.window.showInformationMessage('🚫 GitCue: Commit cancelled');
			logger.info('Commit cancelled by user');
		}
	}
} 