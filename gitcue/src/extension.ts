// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GitCuePty } from './terminal/interactivePty';
import { configManager } from './utils/config';
import logger from './utils/logger';
import { GitCueStatusProvider } from './services/statusProvider';
import { DashboardService } from './services/dashboardService';
import { ActivityLogger } from './services/activityLogger';
import { CommitService } from './services/commitService';
import { FileWatcherService } from './services/fileWatcherService';
import { GitCueDashboardProvider, GitCueActivityProvider, GitCueSettingsProvider } from './services/sidebarProvider';
import { GitCueConfig, DashboardState } from './types/interfaces';

const execAsync = promisify(exec);

class GitCueExtension {
	private statusBarItem: vscode.StatusBarItem;
	private outputChannel: vscode.OutputChannel;
	private statusProvider: GitCueStatusProvider;
	private terminals: vscode.Terminal[] = [];
	private terminalCounter = 0;
	private dashboardService: DashboardService;
	private activityLogger: ActivityLogger;
	private commitService: CommitService;
	private fileWatcherService: FileWatcherService;
	private sidebarDashboardProvider: GitCueDashboardProvider;
	private sidebarActivityProvider: GitCueActivityProvider;
	private sidebarSettingsProvider: GitCueSettingsProvider;

	constructor(private context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel('GitCue');
		this.statusProvider = new GitCueStatusProvider();
		this.dashboardService = DashboardService.getInstance();
		this.activityLogger = ActivityLogger.getInstance();
		this.commitService = CommitService.getInstance();
		this.fileWatcherService = FileWatcherService.getInstance();
		this.sidebarDashboardProvider = new GitCueDashboardProvider();
		this.sidebarActivityProvider = new GitCueActivityProvider();
		this.sidebarSettingsProvider = new GitCueSettingsProvider();
		
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.setupStatusBar();
		this.updateStatusBar();
		this.registerCommands();
		
		// Register views after a short delay to ensure proper initialization
		setTimeout(() => {
			this.registerViews();
		}, 100);
		
		// Set up activity logger callback for real-time updates
		this.activityLogger.setUpdateCallback(() => {
			this.updateStatusBar();
			this.updateDashboards();
			this.refreshSidebarViews();
		});
		
		// Auto-watch initialization
		const config = this.getConfig();
		if (config.autoWatch) {
			this.startWatching();
		}
		
		// Clean up terminals when they are disposed
		vscode.window.onDidCloseTerminal((terminal) => {
			const index = this.terminals.indexOf(terminal);
			if (index > -1) {
				this.terminals.splice(index, 1);
			}
		});
	}

	private getConfig(): GitCueConfig {
		return configManager.getConfig();
	}

	private setupStatusBar() {
		this.statusBarItem.command = 'gitcue.openDashboard';
		this.statusBarItem.show();
	}

	private updateStatusBar() {
		const isWatching = this.fileWatcherService.getIsWatching();
		const watchStatus = this.activityLogger.getWatchStatus();
		
		if (isWatching) {
			this.statusBarItem.text = `$(eye) GitCue: Watching (${watchStatus.filesChanged} changes)`;
			this.statusBarItem.tooltip = 'GitCue is actively watching for file changes. Click to open dashboard.';
			this.statusBarItem.color = undefined;
		} else {
			this.statusBarItem.text = `$(eye-closed) GitCue: Idle`;
			this.statusBarItem.tooltip = 'GitCue is not watching. Click to open dashboard or start watching.';
			this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
		}
		
		this.statusBarItem.show();
	}

	private updateDashboards() {
		const state: DashboardState = {
			isWatching: this.fileWatcherService.getIsWatching(),
			config: this.getConfig(),
			watchStatus: this.activityLogger.getWatchStatus()
		};
		
		this.dashboardService.updateDashboards(state);
		this.updateStatusBar();
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
			vscode.commands.registerCommand('gitcue.dashboard', () => this.openDashboard()),
			
			// Additional commands for sidebar interactivity
			vscode.commands.registerCommand('gitcue.resetConfig', () => this.resetConfig()),
			vscode.commands.registerCommand('gitcue.exportConfig', () => this.exportConfig()),
			vscode.commands.registerCommand('gitcue.importConfig', () => this.importConfig()),
			vscode.commands.registerCommand('gitcue.openDocumentation', () => this.openDocumentation()),
			vscode.commands.registerCommand('gitcue.refreshViews', () => this.refreshSidebarViews())
		];

		commands.forEach(command => this.context.subscriptions.push(command));
	}

	private registerViews() {
		try {
			// Register status view (in SCM container)
			const statusView = vscode.window.createTreeView('gitcueStatus', {
				treeDataProvider: this.statusProvider,
				showCollapseAll: false
			});
			this.context.subscriptions.push(statusView);

			// Register custom container views with error handling
			try {
				const dashboardView = vscode.window.createTreeView('gitcueDashboard', {
					treeDataProvider: this.sidebarDashboardProvider,
					showCollapseAll: false
				});
				this.context.subscriptions.push(dashboardView);
			} catch (error) {
				logger.error('Failed to register gitcueDashboard view: ' + error);
			}

			try {
				const activityView = vscode.window.createTreeView('gitcueActivity', {
					treeDataProvider: this.sidebarActivityProvider,
					showCollapseAll: false
				});
				this.context.subscriptions.push(activityView);
			} catch (error) {
				logger.error('Failed to register gitcueActivity view: ' + error);
			}

			try {
				const settingsView = vscode.window.createTreeView('gitcueSettings', {
					treeDataProvider: this.sidebarSettingsProvider,
					showCollapseAll: false
				});
				this.context.subscriptions.push(settingsView);
			} catch (error) {
				logger.error('Failed to register gitcueSettings view: ' + error);
			}

			logger.info('Views registered successfully');

		} catch (error) {
			logger.error('Failed to register views: ' + error);
		}
	}

	private refreshSidebarViews() {
		try {
			this.sidebarDashboardProvider.refresh();
			this.sidebarActivityProvider.refresh();
			this.sidebarSettingsProvider.refresh();
		} catch (error) {
			logger.error('Failed to refresh sidebar views: ' + error);
		}
	}

	private async commitWithPreview() {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		const config = this.getConfig();
		await this.commitService.commitWithPreview(workspaceFolder.uri.fsPath, config);
		this.statusProvider.refresh();
	}

	private toggleWatching() {
		if (this.fileWatcherService.getIsWatching()) {
			this.stopWatching();
		} else {
			this.startWatching();
		}
	}

	private async startWatching() {
		const success = await this.fileWatcherService.startWatching();
		if (success) {
			this.updateStatusBar();
			this.updateDashboards();
			this.statusProvider.refresh();
			this.refreshSidebarViews();
		}
	}

	private stopWatching() {
		this.fileWatcherService.stopWatching();
		this.updateStatusBar();
		this.updateDashboards();
		this.statusProvider.refresh();
		this.refreshSidebarViews();
	}

	private openDashboard() {
		const panel = this.dashboardService.createDashboard((message) => {
			this.handleDashboardMessage(message);
		});

		// Send initial status update
		setTimeout(() => {
			panel.webview.postMessage({
				action: 'statusUpdate',
				data: {
					isWatching: this.fileWatcherService.getIsWatching(),
					config: this.getConfig(),
					watchStatus: this.activityLogger.getWatchStatus()
				}
			});
		}, 500);
	}

	private async handleDashboardMessage(message: any) {
		try {
			switch (message.action) {
				case 'toggleWatching':
					this.toggleWatching();
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
					// Dashboard is alive, handled by dashboard service
					break;
			}
		} catch (error) {
			this.outputChannel.appendLine(`Dashboard message error: ${error}`);
		}
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
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('No workspace folder found');
			return;
		}

		const pty = new GitCuePty(workspaceFolder.uri.fsPath);
		const terminal = vscode.window.createTerminal({
			name: `GitCue AI ${this.terminalCounter + 1}`,
			pty: pty
		});
		this.terminals.push(terminal);
		this.terminalCounter++;
		terminal.show();
	}

	private showStatus() {
		this.outputChannel.show();
		const config = this.getConfig();
		const watchStatus = this.activityLogger.getWatchStatus();
		
		this.outputChannel.appendLine('=== GitCue Status ===');
		this.outputChannel.appendLine(`Watching: ${this.fileWatcherService.getIsWatching()}`);
		this.outputChannel.appendLine(`Mode: ${config.commitMode}`);
		this.outputChannel.appendLine(`API Key: ${config.geminiApiKey ? 'Configured' : 'Not Set'}`);
		this.outputChannel.appendLine(`Auto Push: ${config.autoPush}`);
		this.outputChannel.appendLine(`Watch Paths: ${config.watchPaths.join(', ')}`);
		this.outputChannel.appendLine(`Files Changed: ${watchStatus.filesChanged}`);
		this.outputChannel.appendLine(`Last Change: ${watchStatus.lastChange}`);
		this.outputChannel.appendLine(`Last Commit: ${watchStatus.lastCommit}`);
	}

	private cancelBufferedCommit() {
		this.commitService.cancelBufferedCommit();
	}

	private async resetConfig() {
		const selection = await vscode.window.showWarningMessage(
			'Are you sure you want to reset GitCue configuration to defaults?',
			'Reset', 'Cancel'
		);
		
		if (selection === 'Reset') {
			// Reset configuration to defaults
			const config = vscode.workspace.getConfiguration('gitcue');
			await config.update('commitMode', 'intelligent', vscode.ConfigurationTarget.Global);
			await config.update('autoPush', true, vscode.ConfigurationTarget.Global);
			await config.update('bufferTimeSeconds', 30, vscode.ConfigurationTarget.Global);
			await config.update('maxCallsPerMinute', 15, vscode.ConfigurationTarget.Global);
			await config.update('autoWatch', false, vscode.ConfigurationTarget.Global);
			await config.update('enableNotifications', true, vscode.ConfigurationTarget.Global);
			
			vscode.window.showInformationMessage('GitCue configuration reset to defaults');
			this.refreshSidebarViews();
		}
	}

	private async exportConfig() {
		const config = this.getConfig();
		const configJson = JSON.stringify(config, null, 2);
		
		const uri = await vscode.window.showSaveDialog({
			defaultUri: vscode.Uri.file('gitcue-config.json'),
			filters: {
				'JSON files': ['json'],
				'All files': ['*']
			}
		});
		
		if (uri) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.createFile(uri, { ignoreIfExists: false });
			workspaceEdit.insert(uri, new vscode.Position(0, 0), configJson);
			
			const success = await vscode.workspace.applyEdit(workspaceEdit);
			if (success) {
				vscode.window.showInformationMessage(`Configuration exported to ${uri.fsPath}`);
			} else {
				vscode.window.showErrorMessage('Failed to export configuration');
			}
		}
	}

	private async importConfig() {
		const uri = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			filters: {
				'JSON files': ['json'],
				'All files': ['*']
			}
		});
		
		if (uri && uri[0]) {
			try {
				const document = await vscode.workspace.openTextDocument(uri[0]);
				const configData = JSON.parse(document.getText());
				
				const config = vscode.workspace.getConfiguration('gitcue');
				await config.update('commitMode', configData.commitMode, vscode.ConfigurationTarget.Global);
				await config.update('autoPush', configData.autoPush, vscode.ConfigurationTarget.Global);
				await config.update('bufferTimeSeconds', configData.bufferTimeSeconds, vscode.ConfigurationTarget.Global);
				await config.update('maxCallsPerMinute', configData.maxCallsPerMinute, vscode.ConfigurationTarget.Global);
				await config.update('autoWatch', configData.autoWatch, vscode.ConfigurationTarget.Global);
				await config.update('enableNotifications', configData.enableNotifications, vscode.ConfigurationTarget.Global);
				
				vscode.window.showInformationMessage('Configuration imported successfully');
				this.refreshSidebarViews();
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
			}
		}
	}

	private openDocumentation() {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/sbeeredd04/auto-git/tree/main/gitcue'));
	}

	dispose() {
		this.fileWatcherService.dispose();
		this.statusBarItem.dispose();
		this.outputChannel.dispose();
		logger.dispose();
		this.terminals.forEach(terminal => terminal.dispose());
		this.terminals = [];
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