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
				body { 
					font-family: var(--vscode-font-family); 
					padding: 20px; 
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
				}
				.header { 
					border-bottom: 1px solid var(--vscode-panel-border); 
					padding-bottom: 15px; 
					margin-bottom: 20px; 
				}
				.commit-message { 
					background: var(--vscode-textCodeBlock-background); 
					padding: 15px; 
					border-radius: 5px; 
					margin: 15px 0; 
					font-family: var(--vscode-editor-font-family);
					border: 1px solid var(--vscode-panel-border);
				}
				.changes { 
					background: var(--vscode-textCodeBlock-background); 
					padding: 15px; 
					border-radius: 5px; 
					margin: 15px 0; 
					font-family: monospace; 
					white-space: pre-wrap;
					border: 1px solid var(--vscode-panel-border);
					max-height: 300px;
					overflow-y: auto;
				}
				.buttons { 
					margin-top: 20px; 
					display: flex; 
					gap: 10px; 
					flex-wrap: wrap;
				}
				button { 
					padding: 8px 16px; 
					border: none; 
					border-radius: 3px; 
					cursor: pointer; 
					font-size: 13px;
				}
				.primary { 
					background: var(--vscode-button-background); 
					color: var(--vscode-button-foreground); 
				}
				.primary:hover { 
					background: var(--vscode-button-hoverBackground); 
				}
				.secondary { 
					background: var(--vscode-button-secondaryBackground); 
					color: var(--vscode-button-secondaryForeground); 
				}
				.secondary:hover { 
					background: var(--vscode-button-secondaryHoverBackground); 
				}
				.checkbox-container {
					margin: 15px 0;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				input[type="checkbox"] {
					margin: 0;
				}
				.icon { margin-right: 5px; }
			</style>
		</head>
		<body>
			<div class="header">
				<h2>🤖 GitCue: AI-Generated Commit Preview</h2>
				<p>Review the AI-generated commit message and changes before committing.</p>
			</div>
			
			<h3>📝 Commit Message:</h3>
			<div class="commit-message" id="commitMessage">${message}</div>
			
			<h3>📊 Changes to be committed:</h3>
			<div class="changes">${status}</div>
			
			<div class="checkbox-container">
				<input type="checkbox" id="shouldPush" ${config.autoPush ? 'checked' : ''}>
				<label for="shouldPush">Push to remote repository after commit</label>
			</div>
			
			<div class="buttons">
				<button class="primary" onclick="commit()">
					<span class="icon">✅</span>Commit${config.autoPush ? ' & Push' : ''}
				</button>
				<button class="secondary" onclick="editMessage()">
					<span class="icon">✏️</span>Edit Message
				</button>
				<button class="secondary" onclick="cancel()">
					<span class="icon">❌</span>Cancel
				</button>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				
				function commit() {
					const shouldPush = document.getElementById('shouldPush').checked;
					const commitMessage = document.getElementById('commitMessage').textContent;
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
						document.getElementById('commitMessage').textContent = message.message;
					}
				});
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
				body { 
					font-family: var(--vscode-font-family); 
					padding: 20px; 
					color: var(--vscode-foreground);
				}
				.status-card {
					background: var(--vscode-textCodeBlock-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 5px;
					padding: 15px;
					margin: 10px 0;
				}
				.status-indicator {
					display: inline-block;
					width: 10px;
					height: 10px;
					border-radius: 50%;
					margin-right: 8px;
				}
				.active { background-color: #4CAF50; }
				.inactive { background-color: #f44336; }
			</style>
		</head>
		<body>
			<h1>🎯 GitCue Dashboard</h1>
			
			<div class="status-card">
				<h3>📊 Status</h3>
				<p><span class="status-indicator ${this.isWatching ? 'active' : 'inactive'}"></span>
				   Watching: ${this.isWatching ? 'Active' : 'Inactive'}</p>
				<p>Mode: ${config.commitMode}</p>
				<p>Auto Push: ${config.autoPush ? 'Enabled' : 'Disabled'}</p>
			</div>
			
			<div class="status-card">
				<h3>⚙️ Configuration</h3>
				<p>API Key: ${config.geminiApiKey ? '✅ Configured' : '❌ Not Set'}</p>
				<p>Debounce: ${config.debounceMs}ms</p>
				<p>Buffer Time: ${config.bufferTimeSeconds}s</p>
				<p>Rate Limit: ${config.maxCallsPerMinute} calls/min</p>
			</div>
			
			<div class="status-card">
				<h3>📁 Watch Patterns</h3>
				<ul>
					${config.watchPaths.map(pattern => `<li>${pattern}</li>`).join('')}
				</ul>
			</div>
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
