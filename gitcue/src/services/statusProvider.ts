import * as vscode from 'vscode';
import { GitCueConfig } from '../types/interfaces';
import { configManager } from '../utils/config';
import { ActivityLogger } from './activityLogger';
import { FileWatcherService } from './fileWatcherService';

export class GitCueStatusProvider implements vscode.TreeDataProvider<GitCueStatusItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<GitCueStatusItem | undefined | null | void> = new vscode.EventEmitter<GitCueStatusItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<GitCueStatusItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private activityLogger: ActivityLogger;
	private fileWatcherService: FileWatcherService;

	constructor() {
		this.activityLogger = ActivityLogger.getInstance();
		this.fileWatcherService = FileWatcherService.getInstance();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: GitCueStatusItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: GitCueStatusItem): Thenable<GitCueStatusItem[]> {
		if (!element) {
			// Root items
			const config = this.getConfig();
			const watchStatus = this.activityLogger.getWatchStatus();
			const isWatching = this.getWatchingStatus();
			
			return Promise.resolve([
				new GitCueStatusItem(
					`Status: ${isWatching ? 'Watching' : 'Idle'}`,
					vscode.TreeItemCollapsibleState.None,
					isWatching ? 'eye' : 'eye-closed',
					isWatching ? 'Currently watching for file changes' : 'Not watching - click to start'
				),
				new GitCueStatusItem(
					`Files Changed: ${watchStatus.filesChanged}`,
					vscode.TreeItemCollapsibleState.None,
					'file-code',
					`${watchStatus.filesChanged} files have been modified`
				),
				new GitCueStatusItem(
					`Last Change: ${watchStatus.lastChange}`,
					vscode.TreeItemCollapsibleState.None,
					'clock',
					`Most recent file change: ${watchStatus.lastChange}`
				),
				new GitCueStatusItem(
					`Commit Mode: ${config.commitMode}`,
					vscode.TreeItemCollapsibleState.None,
					'git-commit',
					`Current commit mode: ${config.commitMode}`
				),
				new GitCueStatusItem(
					`Auto Push: ${config.autoPush ? 'Enabled' : 'Disabled'}`,
					vscode.TreeItemCollapsibleState.None,
					config.autoPush ? 'arrow-up' : 'arrow-down',
					`Auto push to remote: ${config.autoPush ? 'enabled' : 'disabled'}`
				),
				new GitCueStatusItem(
					`API Key: ${config.geminiApiKey ? 'Configured' : 'Not Set'}`,
					vscode.TreeItemCollapsibleState.None,
					config.geminiApiKey ? 'key' : 'warning',
					config.geminiApiKey ? 'Gemini API key is configured' : 'Gemini API key needs to be configured'
				),
				new GitCueStatusItem(
					`Pending Commit: ${watchStatus.pendingCommit ? 'Yes' : 'No'}`,
					vscode.TreeItemCollapsibleState.None,
					watchStatus.pendingCommit ? 'loading' : 'check',
					watchStatus.pendingCommit ? 'Commit is pending' : 'No pending commits'
				)
			]);
		}
		
		return Promise.resolve([]);
	}

	private getConfig(): GitCueConfig {
		return configManager.getConfig();
	}

	private getWatchingStatus(): boolean {
		return this.fileWatcherService.getIsWatching();
	}
}

export class GitCueStatusItem extends vscode.TreeItem {
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