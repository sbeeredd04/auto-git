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

interface BufferNotification {
	panel: vscode.WebviewPanel;
	timer: NodeJS.Timeout;
	cancelled: boolean;
}

class GitCueExtension {
	private statusBarItem: vscode.StatusBarItem;
	private fileWatcher: vscode.FileSystemWatcher | undefined;
	public isWatching = false;
	private outputChannel: vscode.OutputChannel;
	private statusProvider: GitCueStatusProvider;
	private debounceTimer: NodeJS.Timeout | undefined;
	private bufferNotification: BufferNotification | undefined;

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
			geminiApiKey: config.get('geminiApiKey') || process.env.GEMINI_API_KEY || '',
			commitMode: config.get('commitMode') || 'periodic',
			autoPush: config.get('autoPush') ?? true,
			watchPaths: config.get('watchPaths') || ['**/*'],
			debounceMs: config.get('debounceMs') || 30000,
			bufferTimeSeconds: config.get('bufferTimeSeconds') || 30,
			maxCallsPerMinute: config.get('maxCallsPerMinute') || 15,
			enableNotifications: config.get('enableNotifications') ?? true,
			autoWatch: config.get('autoWatch') ?? false
		};
	}

	private setupStatusBar() {
		this.statusBarItem.command = 'gitcue.watchToggle';
		this.updateStatusBar();
		this.statusBarItem.show();
	}

	private updateStatusBar() {
		if (this.isWatching) {
			this.statusBarItem.text = `$(eye) GitCue: Watching`;
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

	private registerCommands() {
		const commands = [
			vscode.commands.registerCommand('gitcue.commit', () => this.commitWithPreview()),
			vscode.commands.registerCommand('gitcue.watchToggle', () => this.toggleWatching()),
			vscode.commands.registerCommand('gitcue.openDashboard', () => this.openDashboard()),
			vscode.commands.registerCommand('gitcue.reset', () => this.resetCommits()),
			vscode.commands.registerCommand('gitcue.configure', () => this.openSettings()),
			vscode.commands.registerCommand('gitcue.showStatus', () => this.showStatus()),
			vscode.commands.registerCommand('gitcue.cancelCommit', () => this.cancelBufferedCommit())
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

			const timer = setInterval(() => {
				timeLeft--;
				if (timeLeft <= 0 || cancelled) {
					clearInterval(timer);
					panel.dispose();
					
					if (!cancelled) {
						// Proceed with commit
						this.executeCommit(message, workspacePath, config, config.autoPush)
							.finally(() => resolve());
					} else {
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
					margin-top: auto;
					display: flex;
					gap: 16px;
					animation: slideUp 0.6s ease-out 0.4s both;
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
						<span>��</span>
						<span>Cancel Commit</span>
					</button>
				</div>

				<div class="keyboard-hint">
					Press 'c' to cancel or click the button above
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();

				function cancelCommit() {
					vscode.postMessage({ action: 'cancel' });
				}

				// Listen for keyboard shortcuts
				document.addEventListener('keydown', function(e) {
					if (e.key.toLowerCase() === 'c') {
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
		return new Promise((resolve, reject) => {
			const env = {
				...process.env,
				GEMINI_API_KEY: config.geminiApiKey,
				AUTO_GIT_COMMIT_MODE: config.commitMode,
				AUTO_GIT_NO_PUSH: 'true', // Always preview first
				AUTO_GIT_BUFFER_TIME: config.bufferTimeSeconds.toString()
			};

			// Use npx to run auto-git commit with buffer support
			const autoGitProcess = spawn('npx', ['@sbeeredd04/auto-git', 'commit', '--no-push', '--buffer'], {
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
					// Fallback to basic commit message generation
					this.outputChannel.appendLine(`Auto-git warning: ${errorOutput || output}`);
					resolve('feat: automated commit via GitCue');
				}
			});

			// Handle process errors
			autoGitProcess.on('error', (error) => {
				this.outputChannel.appendLine(`Auto-git process error: ${error.message}`);
				resolve('feat: automated commit via GitCue');
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
					// For periodic mode, also use buffer notification
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
					if (workspaceFolder) {
						this.commitWithBuffer(workspaceFolder.uri.fsPath, config);
					}
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

		// Cancel any pending commits
		if (this.bufferNotification) {
			this.cancelBufferedCommit();
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

		panel.webview.html = this.getDashboardHtml();

		// Handle messages from the dashboard
		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.action) {
				case 'toggleWatching':
					this.toggleWatching();
					// Send updated status back to dashboard
					panel.webview.postMessage({
						action: 'statusUpdate',
						data: { isWatching: this.isWatching }
					});
					break;
				case 'openSettings':
					this.openSettings();
					break;
				case 'manualCommit':
					this.commitWithPreview();
					break;
				case 'showLogs':
					this.showStatus();
					break;
				case 'refreshStatus':
					// Send current status to dashboard
					panel.webview.postMessage({
						action: 'statusUpdate',
						data: { 
							isWatching: this.isWatching,
							config: this.getConfig()
						}
					});
					break;
			}
		});

		// Auto-refresh dashboard when status changes
		const refreshDashboard = () => {
			if (panel.visible) {
				panel.webview.postMessage({
					action: 'statusUpdate',
					data: { 
						isWatching: this.isWatching,
						config: this.getConfig()
					}
				});
			}
		};

		// Set up periodic refresh
		const refreshInterval = setInterval(refreshDashboard, 2000);
		
		// Clean up interval when panel is disposed
		panel.onDidDispose(() => {
			clearInterval(refreshInterval);
		});
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
					--primary: #007acc;
					--success: #4caf50;
					--warning: #ff9800;
					--danger: #f44336;
					--info: #2196f3;
					--bg-primary: var(--vscode-editor-background);
					--bg-secondary: var(--vscode-sideBar-background);
					--bg-tertiary: var(--vscode-textCodeBlock-background);
					--text-primary: var(--vscode-foreground);
					--text-secondary: var(--vscode-descriptionForeground);
					--border: var(--vscode-panel-border);
					--radius: 16px;
					--shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
					--transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
				}

				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}

				body {
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					background: var(--bg-primary);
					color: var(--text-primary);
					line-height: 1.6;
					overflow-x: hidden;
				}

				.dashboard {
					min-height: 100vh;
					background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
				}

				.container {
					max-width: 1400px;
					margin: 0 auto;
					padding: 32px;
				}

				.header {
					text-align: center;
					margin-bottom: 48px;
					animation: fadeInUp 0.8s ease-out;
				}

				.logo {
					width: 80px;
					height: 80px;
					margin: 0 auto 24px;
					background: linear-gradient(135deg, var(--primary), var(--info));
					border-radius: 24px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 36px;
					color: white;
					box-shadow: var(--shadow);
				}

				.title {
					font-size: 48px;
					font-weight: 700;
					margin-bottom: 12px;
					background: linear-gradient(135deg, var(--primary), var(--info));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}

				.subtitle {
					font-size: 20px;
					color: var(--text-secondary);
					font-weight: 400;
				}

				.grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
					gap: 24px;
					margin-bottom: 32px;
				}

				.card {
					background: var(--bg-tertiary);
					border: 1px solid var(--border);
					border-radius: var(--radius);
					padding: 32px;
					transition: var(--transition);
					position: relative;
					overflow: hidden;
				}

				.card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 4px;
					background: linear-gradient(90deg, var(--primary), var(--info));
				}

				.card:hover {
					transform: translateY(-8px);
					box-shadow: var(--shadow);
					border-color: var(--primary);
				}

				.card-header {
					display: flex;
					align-items: center;
					gap: 16px;
					margin-bottom: 24px;
				}

				.card-icon {
					width: 56px;
					height: 56px;
					border-radius: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 24px;
					color: white;
					background: linear-gradient(135deg, var(--primary), var(--info));
				}

				.card-title {
					font-size: 24px;
					font-weight: 600;
					color: var(--text-primary);
				}

				.status-item {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 16px 0;
					border-bottom: 1px solid var(--border);
				}

				.status-item:last-child {
					border-bottom: none;
				}

				.status-label {
					font-size: 16px;
					color: var(--text-primary);
					font-weight: 500;
				}

				.status-value {
					display: flex;
					align-items: center;
					gap: 8px;
				}

				.badge {
					padding: 6px 12px;
					border-radius: 20px;
					font-size: 14px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}

				.badge.success {
					background: rgba(76, 175, 80, 0.15);
					color: var(--success);
				}

				.badge.danger {
					background: rgba(244, 67, 54, 0.15);
					color: var(--danger);
				}

				.badge.warning {
					background: rgba(255, 152, 0, 0.15);
					color: var(--warning);
				}

				.badge.info {
					background: rgba(33, 150, 243, 0.15);
					color: var(--info);
				}

				.indicator {
					width: 12px;
					height: 12px;
					border-radius: 50%;
					animation: pulse 2s infinite;
				}

				.indicator.active {
					background: var(--success);
					box-shadow: 0 0 12px rgba(76, 175, 80, 0.5);
				}

				.indicator.inactive {
					background: var(--danger);
					box-shadow: 0 0 12px rgba(244, 67, 54, 0.5);
				}

				.patterns-grid {
					display: grid;
					grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
					gap: 12px;
					margin-top: 16px;
				}

				.pattern {
					background: var(--bg-secondary);
					border: 1px solid var(--border);
					border-radius: 12px;
					padding: 12px 16px;
					font-family: 'SF Mono', Monaco, monospace;
					font-size: 14px;
					transition: var(--transition);
				}

				.pattern:hover {
					border-color: var(--primary);
					background: var(--bg-primary);
				}

				.actions {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
					gap: 16px;
					margin-top: 32px;
				}

				.btn {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 12px;
					padding: 20px 32px;
					border: none;
					border-radius: var(--radius);
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
					background: linear-gradient(135deg, var(--primary), var(--info));
					color: white;
					box-shadow: 0 4px 16px rgba(0, 122, 204, 0.3);
				}

				.btn-primary:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 24px rgba(0, 122, 204, 0.4);
				}

				.btn-success {
					background: linear-gradient(135deg, var(--success), #388e3c);
					color: white;
					box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
				}

				.btn-success:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 24px rgba(76, 175, 80, 0.4);
				}

				.btn-secondary {
					background: var(--bg-secondary);
					color: var(--text-primary);
					border: 2px solid var(--border);
				}

				.btn-secondary:hover {
					border-color: var(--primary);
					background: var(--bg-tertiary);
					transform: translateY(-2px);
				}

				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.6; }
				}

				.animate-in {
					animation: fadeInUp 0.6s ease-out;
				}

				@media (max-width: 768px) {
					.container {
						padding: 16px;
					}
					
					.title {
						font-size: 36px;
					}
					
					.grid {
						grid-template-columns: 1fr;
					}
					
					.actions {
						grid-template-columns: 1fr;
					}
				}
			</style>
		</head>
		<body>
			<div class="dashboard">
				<div class="container">
					<div class="header">
						<div class="logo">🎯</div>
						<h1 class="title">GitCue</h1>
						<p class="subtitle">AI-Powered Git Automation Dashboard</p>
					</div>

					<div class="grid">
						<div class="card animate-in" style="animation-delay: 0.1s">
							<div class="card-header">
								<div class="card-icon">📊</div>
								<h3 class="card-title">System Status</h3>
							</div>
							<div class="status-item">
								<span class="status-label">Watching Mode</span>
								<div class="status-value">
									<span class="indicator ${this.isWatching ? 'active' : 'inactive'}"></span>
									<span class="badge ${this.isWatching ? 'success' : 'danger'}">
										${this.isWatching ? 'Active' : 'Inactive'}
									</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Commit Mode</span>
								<div class="status-value">
									<span class="badge info">${config.commitMode}</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Auto Push</span>
								<div class="status-value">
									<span class="badge ${config.autoPush ? 'success' : 'danger'}">
										${config.autoPush ? 'Enabled' : 'Disabled'}
									</span>
								</div>
							</div>
						</div>

						<div class="card animate-in" style="animation-delay: 0.2s">
							<div class="card-header">
								<div class="card-icon">🔑</div>
								<h3 class="card-title">API Configuration</h3>
							</div>
							<div class="status-item">
								<span class="status-label">Gemini API Key</span>
								<div class="status-value">
									<span class="badge ${config.geminiApiKey ? 'success' : 'danger'}">
										${config.geminiApiKey ? 'Configured' : 'Not Set'}
									</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Rate Limit</span>
								<div class="status-value">
									<span class="badge info">${config.maxCallsPerMinute}/min</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Buffer Time</span>
								<div class="status-value">
									<span class="badge warning">${config.bufferTimeSeconds}s</span>
								</div>
							</div>
						</div>

						<div class="card animate-in" style="animation-delay: 0.3s">
							<div class="card-header">
								<div class="card-icon">⚡</div>
								<h3 class="card-title">Performance</h3>
							</div>
							<div class="status-item">
								<span class="status-label">Debounce Time</span>
								<div class="status-value">
									<span class="badge info">${config.debounceMs}ms</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Notifications</span>
								<div class="status-value">
									<span class="badge ${config.enableNotifications ? 'success' : 'danger'}">
										${config.enableNotifications ? 'Enabled' : 'Disabled'}
									</span>
								</div>
							</div>
							<div class="status-item">
								<span class="status-label">Auto Start</span>
								<div class="status-value">
									<span class="badge ${config.autoWatch ? 'success' : 'danger'}">
										${config.autoWatch ? 'Enabled' : 'Disabled'}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div class="card animate-in" style="animation-delay: 0.4s">
						<div class="card-header">
							<div class="card-icon">📁</div>
							<h3 class="card-title">Watch Patterns</h3>
						</div>
						<div class="patterns-grid">
							${config.watchPaths.map(pattern => `
								<div class="pattern">📄 ${pattern}</div>
							`).join('')}
						</div>
					</div>

					<div class="actions">
						<button class="btn btn-primary" onclick="toggleWatching()">
							<span style="font-size: 20px;">${this.isWatching ? '⏸️' : '▶️'}</span>
							<span>${this.isWatching ? 'Stop Watching' : 'Start Watching'}</span>
						</button>
						<button class="btn btn-success" onclick="manualCommit()">
							<span style="font-size: 20px;">🚀</span>
							<span>Manual Commit</span>
						</button>
						<button class="btn btn-secondary" onclick="openSettings()">
							<span style="font-size: 20px;">⚙️</span>
							<span>Settings</span>
						</button>
						<button class="btn btn-secondary" onclick="showLogs()">
							<span style="font-size: 20px;">📋</span>
							<span>View Logs</span>
						</button>
					</div>
				</div>
			</div>

			<script>
				const vscode = acquireVsCodeApi();

				document.addEventListener('DOMContentLoaded', function() {
					const cards = document.querySelectorAll('.card');
					cards.forEach((card, index) => {
						card.style.animationDelay = \`\${index * 0.1}s\`;
					});

					setInterval(refreshStatus, 3000);
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

				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'statusUpdate') {
						// Update UI with new status
						location.reload();
					}
				});

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
			autoWatch: config.get('autoWatch') ?? false
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
	console.log('GitCue extension is now active!');
	gitCueExtension = new GitCueExtension(context);
}

export function deactivate() {
	if (gitCueExtension) {
		gitCueExtension.dispose();
	}
}
