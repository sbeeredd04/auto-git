// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

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
}

class GitCueExtension {
	private statusBarItem: vscode.StatusBarItem;
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	private isWatching = false;
	private outputChannel: vscode.OutputChannel;
	private statusProvider: GitCueStatusProvider;
	private debounceTimer: NodeJS.Timeout | undefined;

	constructor(private context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.outputChannel = vscode.window.createOutputChannel('GitCue');
		this.statusProvider = new GitCueStatusProvider();
		
		this.setupStatusBar();
		this.registerCommands();
		this.registerViews();
		
		// Auto-start watching if configured
		const config = this.getConfig();
		if (config.autoWatch) {
			this.startWatching();
		}
	}

	private getConfig(): GitCueConfig {
		const config = vscode.workspace.getConfiguration('gitcue');
		return {
			geminiApiKey: config.get('geminiApiKey', ''),
			commitMode: config.get('commitMode', 'intelligent'),
			autoPush: config.get('autoPush', true),
			watchPaths: config.get('watchPaths', ['src/**', 'lib/**', '*.js', '*.ts']),
			debounceMs: config.get('debounceMs', 30000),
			bufferTimeSeconds: config.get('bufferTimeSeconds', 30),
			maxCallsPerMinute: config.get('maxCallsPerMinute', 15),
			enableNotifications: config.get('enableNotifications', true),
			autoWatch: config.get('autoWatch', false)
		};
	}

	private setupStatusBar() {
		this.statusBarItem.command = 'gitcue.watchToggle';
		this.updateStatusBar();
		this.statusBarItem.show();
	}

	private updateStatusBar() {
		if (this.isWatching) {
			this.statusBarItem.text = '$(eye) GitCue: Watching';
			this.statusBarItem.tooltip = 'GitCue is actively watching for changes. Click to stop.';
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
		} else {
			this.statusBarItem.text = '$(eye-closed) GitCue: Idle';
			this.statusBarItem.tooltip = 'GitCue is idle. Click to start watching.';
			this.statusBarItem.backgroundColor = undefined;
		}
	}

	private registerCommands() {
		const commands = [
			vscode.commands.registerCommand('gitcue.commit', () => this.commitWithPreview()),
			vscode.commands.registerCommand('gitcue.watchToggle', () => this.toggleWatching()),
			vscode.commands.registerCommand('gitcue.openDashboard', () => this.openDashboard()),
			vscode.commands.registerCommand('gitcue.reset', () => this.resetCommits()),
			vscode.commands.registerCommand('gitcue.configure', () => this.openSettings()),
			vscode.commands.registerCommand('gitcue.showStatus', () => this.showStatus())
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

	private async generateCommitMessage(workspacePath: string, config: GitCueConfig): Promise<string> {
		return new Promise((resolve, reject) => {
			const env = {
				...process.env,
				GEMINI_API_KEY: config.geminiApiKey,
				AUTO_GIT_COMMIT_MODE: config.commitMode,
				AUTO_GIT_NO_PUSH: 'true' // Always preview first
			};

			// Use npx to run auto-git commit
			const autoGitProcess = spawn('npx', ['@sbeeredd04/auto-git', 'commit', '--no-push'], {
				cwd: workspacePath,
				env,
				stdio: ['pipe', 'pipe', 'pipe']
			});

			let output = '';
			let errorOutput = '';

			autoGitProcess.stdout.on('data', (data) => {
				output += data.toString();
			});

			autoGitProcess.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});

			autoGitProcess.on('close', (code) => {
				if (code === 0) {
					// Extract commit message from output
					const lines = output.split('\n');
					const commitLine = lines.find(line => line.includes('Commit:') || line.includes('💬'));
					if (commitLine) {
						const message = commitLine.replace(/.*💬\s*/, '').replace(/.*Commit:\s*/, '').trim();
						resolve(message || 'feat: automated commit via GitCue');
					} else {
						resolve('feat: automated commit via GitCue');
					}
				} else {
					reject(new Error(`Auto-git failed: ${errorOutput || output}`));
				}
			});
		});
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
					padding: 24px;
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
					min-width: 140px;
					justify-content: center;
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
					background: linear-gradient(135deg, var(--primary-color), #005a9e);
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
					background: var(--vscode-button-secondaryHoverBackground);
					border-color: var(--primary-color);
					transform: translateY(-1px);
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
		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'GitCue: Committing changes...',
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
				vscode.window.showInformationMessage(`✅ GitCue: Changes committed${pushText} successfully!`);
			}
			
			this.outputChannel.appendLine(`Commit successful: ${message}`);
			this.statusProvider.refresh();
			
		} catch (error) {
			this.outputChannel.appendLine(`Commit failed: ${error}`);
			vscode.window.showErrorMessage(`GitCue: Commit failed - ${error}`);
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

		const watchPattern = `{${config.watchPaths.join(',')}}`;
		this.fileWatcher = vscode.workspace.createFileSystemWatcher(watchPattern);
		
		const onFileChange = () => {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}
			
			this.debounceTimer = setTimeout(() => {
				if (config.commitMode === 'intelligent') {
					this.handleIntelligentCommit();
				} else {
					this.commitWithPreview();
				}
			}, config.debounceMs);
		};

		this.fileWatcher.onDidChange(onFileChange);
		this.fileWatcher.onDidCreate(onFileChange);
		this.fileWatcher.onDidDelete(onFileChange);

		this.isWatching = true;
		this.updateStatusBar();
		
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('👁️ GitCue: Started watching for changes');
		}
		this.outputChannel.appendLine('Started watching for file changes');
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

		this.isWatching = false;
		this.updateStatusBar();
		
		const config = this.getConfig();
		if (config.enableNotifications) {
			vscode.window.showInformationMessage('👁️ GitCue: Stopped watching');
		}
		this.outputChannel.appendLine('Stopped watching for file changes');
	}

	private async handleIntelligentCommit() {
		// In intelligent mode, we could implement the AI decision logic here
		// For now, we'll just show the preview
		this.commitWithPreview();
	}

	private openDashboard() {
		const panel = vscode.window.createWebviewPanel(
			'gitcueDashboard',
			'GitCue Dashboard',
			vscode.ViewColumn.One,
			{ enableScripts: true }
		);

		panel.webview.html = this.getDashboardHtml();
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
			<style>
				:root {
					--primary-color: #007acc;
					--success-color: #4caf50;
					--warning-color: #ff9800;
					--danger-color: #f44336;
					--info-color: #2196f3;
					--border-radius: 12px;
					--shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
					--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
					--gradient-primary: linear-gradient(135deg, var(--primary-color), #005a9e);
					--gradient-success: linear-gradient(135deg, var(--success-color), #388e3c);
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

				.dashboard-container {
					max-width: 1200px;
					margin: 0 auto;
					padding: 24px;
				}

				.dashboard-header {
					text-align: center;
					padding: 32px 0;
					margin-bottom: 32px;
					background: var(--gradient-primary);
					border-radius: var(--border-radius);
					color: white;
					box-shadow: var(--shadow);
					position: relative;
					overflow: hidden;
				}

				.dashboard-header::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
					opacity: 0.3;
				}

				.dashboard-header h1 {
					margin: 0 0 8px 0;
					font-size: 36px;
					font-weight: 700;
					position: relative;
					z-index: 1;
				}

				.dashboard-header p {
					margin: 0;
					font-size: 18px;
					opacity: 0.9;
					position: relative;
					z-index: 1;
				}

				.status-overview {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
					gap: 24px;
					margin-bottom: 32px;
				}

				.status-card {
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					padding: 24px;
					box-shadow: var(--shadow);
					transition: var(--transition);
					position: relative;
					overflow: hidden;
				}

				.status-card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					width: 4px;
					height: 100%;
					background: var(--primary-color);
					transition: var(--transition);
				}

				.status-card:hover {
					border-color: var(--primary-color);
					transform: translateY(-4px);
					box-shadow: 0 8px 24px rgba(0, 122, 204, 0.2);
				}

				.status-card:hover::before {
					width: 8px;
				}

				.card-header {
					display: flex;
					align-items: center;
					gap: 12px;
					margin-bottom: 16px;
				}

				.card-icon {
					font-size: 24px;
					width: 48px;
					height: 48px;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					background: var(--gradient-primary);
					color: white;
					box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
				}

				.card-title {
					font-size: 20px;
					font-weight: 600;
					margin: 0;
				}

				.status-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 0;
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				.status-item:last-child {
					border-bottom: none;
				}

				.status-label {
					font-weight: 500;
					color: var(--vscode-foreground);
				}

				.status-value {
					display: flex;
					align-items: center;
					gap: 8px;
					font-weight: 600;
				}

				.status-indicator {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					display: inline-block;
					animation: pulse 2s infinite;
				}

				.status-indicator.active {
					background: var(--success-color);
					box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
				}

				.status-indicator.inactive {
					background: var(--danger-color);
					box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
				}

				.status-indicator.warning {
					background: var(--warning-color);
					box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);
				}

				.config-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
					gap: 24px;
					margin-bottom: 32px;
				}

				.config-section {
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					padding: 24px;
					box-shadow: var(--shadow);
					transition: var(--transition);
				}

				.config-section:hover {
					border-color: var(--primary-color);
					transform: translateY(-2px);
				}

				.config-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 12px 0;
					border-bottom: 1px solid var(--vscode-panel-border);
				}

				.config-item:last-child {
					border-bottom: none;
				}

				.config-label {
					font-weight: 500;
					color: var(--vscode-foreground);
				}

				.config-value {
					font-weight: 600;
					padding: 4px 12px;
					border-radius: 20px;
					font-size: 14px;
				}

				.config-value.success {
					background: rgba(76, 175, 80, 0.2);
					color: var(--success-color);
				}

				.config-value.danger {
					background: rgba(244, 67, 54, 0.2);
					color: var(--danger-color);
				}

				.config-value.info {
					background: rgba(33, 150, 243, 0.2);
					color: var(--info-color);
				}

				.watch-patterns {
					background: var(--vscode-textCodeBlock-background);
					border: 2px solid var(--vscode-panel-border);
					border-radius: var(--border-radius);
					padding: 24px;
					box-shadow: var(--shadow);
				}

				.patterns-list {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
					gap: 12px;
					margin-top: 16px;
				}

				.pattern-item {
					background: var(--vscode-input-background);
					border: 1px solid var(--vscode-input-border);
					border-radius: 8px;
					padding: 12px 16px;
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
					font-size: 14px;
					transition: var(--transition);
					position: relative;
				}

				.pattern-item:hover {
					border-color: var(--primary-color);
					background: var(--vscode-list-hoverBackground);
				}

				.pattern-item::before {
					content: '📁';
					margin-right: 8px;
				}

				.actions-section {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
					gap: 16px;
					margin-top: 32px;
				}

				.action-btn {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 16px 24px;
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					border-radius: var(--border-radius);
					font-size: 16px;
					font-weight: 600;
					cursor: pointer;
					transition: var(--transition);
					text-decoration: none;
					justify-content: center;
					box-shadow: var(--shadow);
				}

				.action-btn:hover {
					background: var(--vscode-button-hoverBackground);
					transform: translateY(-2px);
					box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
				}

				.action-btn.primary {
					background: var(--gradient-primary);
					color: white;
				}

				.action-btn.success {
					background: var(--gradient-success);
					color: white;
				}

				.action-icon {
					font-size: 20px;
				}

				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				@keyframes slideInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.animate-in {
					animation: slideInUp 0.6s ease-out;
				}

				@media (max-width: 768px) {
					.dashboard-container {
						padding: 16px;
					}
					
					.status-overview {
						grid-template-columns: 1fr;
					}
					
					.config-grid {
						grid-template-columns: 1fr;
					}
					
					.actions-section {
						grid-template-columns: 1fr;
					}
				}
			</style>
		</head>
		<body>
			<div class="dashboard-container">
				<div class="dashboard-header animate-in">
					<h1>🎯 GitCue Dashboard</h1>
					<p>Monitor your AI-powered Git automation in real-time</p>
				</div>

				<div class="status-overview">
					<div class="status-card animate-in" style="animation-delay: 0.1s">
						<div class="card-header">
							<div class="card-icon">📊</div>
							<h3 class="card-title">System Status</h3>
						</div>
						<div class="status-item">
							<span class="status-label">Watching Mode</span>
							<div class="status-value">
								<span class="status-indicator ${this.isWatching ? 'active' : 'inactive'}"></span>
								${this.isWatching ? 'Active' : 'Inactive'}
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Commit Mode</span>
							<div class="status-value">
								<span class="config-value info">${config.commitMode}</span>
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Auto Push</span>
							<div class="status-value">
								<span class="config-value ${config.autoPush ? 'success' : 'danger'}">
									${config.autoPush ? 'Enabled' : 'Disabled'}
								</span>
							</div>
						</div>
					</div>

					<div class="status-card animate-in" style="animation-delay: 0.2s">
						<div class="card-header">
							<div class="card-icon">🔑</div>
							<h3 class="card-title">API Configuration</h3>
						</div>
						<div class="status-item">
							<span class="status-label">Gemini API Key</span>
							<div class="status-value">
								<span class="config-value ${config.geminiApiKey ? 'success' : 'danger'}">
									${config.geminiApiKey ? '✅ Configured' : '❌ Not Set'}
								</span>
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Rate Limit</span>
							<div class="status-value">
								<span class="config-value info">${config.maxCallsPerMinute} calls/min</span>
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Buffer Time</span>
							<div class="status-value">
								<span class="config-value info">${config.bufferTimeSeconds}s</span>
							</div>
						</div>
					</div>

					<div class="status-card animate-in" style="animation-delay: 0.3s">
						<div class="card-header">
							<div class="card-icon">⚡</div>
							<h3 class="card-title">Performance</h3>
						</div>
						<div class="status-item">
							<span class="status-label">Debounce Time</span>
							<div class="status-value">
								<span class="config-value info">${config.debounceMs}ms</span>
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Notifications</span>
							<div class="status-value">
								<span class="config-value ${config.enableNotifications ? 'success' : 'danger'}">
									${config.enableNotifications ? 'Enabled' : 'Disabled'}
								</span>
							</div>
						</div>
						<div class="status-item">
							<span class="status-label">Auto Start</span>
							<div class="status-value">
								<span class="config-value ${config.autoWatch ? 'success' : 'danger'}">
									${config.autoWatch ? 'Enabled' : 'Disabled'}
								</span>
							</div>
						</div>
					</div>
				</div>

				<div class="watch-patterns animate-in" style="animation-delay: 0.4s">
					<div class="card-header">
						<div class="card-icon">📁</div>
						<h3 class="card-title">Watch Patterns</h3>
					</div>
					<div class="patterns-list">
						${config.watchPaths.map(pattern => `
							<div class="pattern-item">${pattern}</div>
						`).join('')}
					</div>
				</div>

				<div class="actions-section">
					<button class="action-btn primary" onclick="toggleWatching()">
						<span class="action-icon">${this.isWatching ? '⏸️' : '▶️'}</span>
						<span>${this.isWatching ? 'Stop Watching' : 'Start Watching'}</span>
					</button>
					<button class="action-btn" onclick="openSettings()">
						<span class="action-icon">⚙️</span>
						<span>Configure Settings</span>
					</button>
					<button class="action-btn success" onclick="manualCommit()">
						<span class="action-icon">🚀</span>
						<span>Manual Commit</span>
					</button>
					<button class="action-btn" onclick="showLogs()">
						<span class="action-icon">📋</span>
						<span>View Logs</span>
					</button>
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();

				// Add smooth animations on load
				document.addEventListener('DOMContentLoaded', function() {
					const animatedElements = document.querySelectorAll('.animate-in');
					animatedElements.forEach((element, index) => {
						element.style.opacity = '0';
						element.style.transform = 'translateY(30px)';
						
						setTimeout(() => {
							element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
							element.style.opacity = '1';
							element.style.transform = 'translateY(0)';
						}, index * 100);
					});

					// Add hover effects to cards
					const cards = document.querySelectorAll('.status-card, .config-section');
					cards.forEach(card => {
						card.addEventListener('mouseenter', function() {
							this.style.transform = 'translateY(-4px) scale(1.02)';
						});
						
						card.addEventListener('mouseleave', function() {
							this.style.transform = 'translateY(0) scale(1)';
						});
					});

					// Auto-refresh status every 5 seconds
					setInterval(refreshStatus, 5000);
				});

				function toggleWatching() {
					vscode.postMessage({ action: 'toggleWatching' });
				}

				function openSettings() {
					vscode.postMessage({ action: 'openSettings' });
				}

				function manualCommit() {
					vscode.postMessage({ action: 'manualCommit' });
				}

				function showLogs() {
					vscode.postMessage({ action: 'showLogs' });
				}

				function refreshStatus() {
					vscode.postMessage({ action: 'refreshStatus' });
				}

				// Listen for status updates
				window.addEventListener('message', event => {
					const message = event.data;
					switch (message.action) {
						case 'statusUpdate':
							updateStatus(message.data);
							break;
						case 'configUpdate':
							updateConfig(message.data);
							break;
					}
				});

				function updateStatus(data) {
					// Update status indicators with smooth transitions
					const indicators = document.querySelectorAll('.status-indicator');
					indicators.forEach(indicator => {
						if (data.isWatching) {
							indicator.classList.remove('inactive');
							indicator.classList.add('active');
						} else {
							indicator.classList.remove('active');
							indicator.classList.add('inactive');
						}
					});
				}

				function updateConfig(data) {
					// Update configuration values
					// This would be implemented to update the UI when config changes
				}

				// Add keyboard shortcuts
				document.addEventListener('keydown', function(e) {
					if (e.ctrlKey || e.metaKey) {
						switch (e.key) {
							case 'w':
								e.preventDefault();
								toggleWatching();
								break;
							case 'c':
								e.preventDefault();
								manualCommit();
								break;
							case ',':
								e.preventDefault();
								openSettings();
								break;
						}
					}
				});
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
			return Promise.resolve([
				new GitCueStatusItem('Status', vscode.TreeItemCollapsibleState.None, 'info'),
				new GitCueStatusItem('Recent Commits', vscode.TreeItemCollapsibleState.None, 'git-commit'),
				new GitCueStatusItem('Configuration', vscode.TreeItemCollapsibleState.None, 'settings-gear')
			]);
		}
		return Promise.resolve([]);
	}
}

class GitCueStatusItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		iconName: string
	) {
		super(label, collapsibleState);
		this.iconPath = new vscode.ThemeIcon(iconName);
	}
}

let gitCueExtension: GitCueExtension;

export function activate(context: vscode.ExtensionContext) {
	console.log('GitCue extension is now active!');
	gitCueExtension = new GitCueExtension(context);
}

export function deactivate() {
	if (gitCueExtension) {
		gitCueExtension.dispose();
	}
}
