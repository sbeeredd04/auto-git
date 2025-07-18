import * as vscode from 'vscode';
import { GitCueConfig } from '../types/interfaces';
import { configManager } from '../utils/config';
import { ActivityLogger } from './activityLogger';
import { FileWatcherService } from './fileWatcherService';
import { GitService } from './gitService';

export class GitCueStatusProvider implements vscode.TreeDataProvider<GitCueStatusItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<GitCueStatusItem | undefined | null | void> = new vscode.EventEmitter<GitCueStatusItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<GitCueStatusItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private activityLogger: ActivityLogger;
	private fileWatcherService: FileWatcherService;
	private gitService: GitService;

	constructor() {
		this.activityLogger = ActivityLogger.getInstance();
		this.fileWatcherService = FileWatcherService.getInstance();
		this.gitService = GitService.getInstance();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: GitCueStatusItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: GitCueStatusItem): Promise<GitCueStatusItem[]> {
		if (!element) {
			return this.getRootItems();
		}
		return element.children || [];
	}

	private async getRootItems(): Promise<GitCueStatusItem[]> {
		const config = this.getConfig();
		const watchStatus = this.activityLogger.getWatchStatus();
		const isWatching = this.getWatchingStatus();
		const gitInfo = await this.gitService.getRepositoryInfo();
		
		const items: GitCueStatusItem[] = [];

		// System Status Section
		items.push(new GitCueStatusItem(
			'System Status',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-system',
			[
				new GitCueStatusItem(
					`Status: ${isWatching ? 'Watching' : 'Idle'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					isWatching ? 'eye' : 'eye-closed',
					isWatching ? 'GitCue is actively monitoring file changes' : 'GitCue is idle - click to start watching',
					{
						command: 'gitcue.watchToggle',
						title: 'Toggle Watching',
						arguments: []
					}
				),
				new GitCueStatusItem(
					`Buffer: ${watchStatus.pendingCommit ? 'Active' : 'Inactive'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					watchStatus.pendingCommit ? 'loading~spin' : 'circle-outline',
					watchStatus.pendingCommit ? 'Commit buffer is active - changes will be committed soon' : 'No pending commits in buffer'
				),
				new GitCueStatusItem(
					`API: ${config.geminiApiKey ? 'Ready' : 'Not Configured'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					config.geminiApiKey ? 'key' : 'warning',
					config.geminiApiKey ? 'Gemini API is configured and ready' : 'API key needs to be configured for AI features',
					config.geminiApiKey ? undefined : {
						command: 'gitcue.configure',
						title: 'Configure API Key',
						arguments: []
					}
				)
			],
			'pulse',
			'Current system status and monitoring state'
		));

		// File Activity Section
		items.push(new GitCueStatusItem(
			'File Activity',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-activity',
			[
				new GitCueStatusItem(
					`Files Changed: ${watchStatus.filesChanged || 0}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-activity-item',
					[],
					'diff',
					`${watchStatus.filesChanged || 0} files have been modified since last commit`
				),
				new GitCueStatusItem(
					`Last Change: ${this.formatLastChange(watchStatus.lastChange)}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-activity-item',
					[],
					'clock',
					watchStatus.lastChange ? `Most recent change: ${watchStatus.lastChange}` : 'No recent file changes detected'
				),
				new GitCueStatusItem(
					`Watch Mode: ${isWatching ? 'Active' : 'Stopped'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-activity-item',
					[],
					isWatching ? 'eye' : 'eye-closed',
					isWatching ? 'File watching is active' : 'File watching is stopped',
					{
						command: 'gitcue.watchToggle',
						title: 'Toggle File Watching',
						arguments: []
					}
				)
			],
			'file-code',
			'Current file activity and change tracking'
		));

		// Git Repository Section
		if (gitInfo) {
			items.push(new GitCueStatusItem(
				'Git Repository',
				vscode.TreeItemCollapsibleState.Expanded,
				'gitcue-git',
				[
					new GitCueStatusItem(
						`Branch: ${gitInfo.branch}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						'git-branch',
						`Current branch: ${gitInfo.branch}`
					),
					new GitCueStatusItem(
						`Uncommitted: ${gitInfo.uncommittedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						gitInfo.uncommittedChanges > 0 ? 'diff-modified' : 'check',
						`${gitInfo.uncommittedChanges} files with uncommitted changes`
					),
					new GitCueStatusItem(
						`Staged: ${gitInfo.stagedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						gitInfo.stagedChanges > 0 ? 'diff-added' : 'circle-outline',
						`${gitInfo.stagedChanges} files staged for commit`
					)
				],
				'source-control',
				'Current git repository status and changes'
			));
		}

		// Configuration Section
		items.push(new GitCueStatusItem(
			'Configuration',
			vscode.TreeItemCollapsibleState.Collapsed,
			'gitcue-config',
			[
				new GitCueStatusItem(
					`Commit Mode: ${config.commitMode}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					'settings-gear',
					`Current commit mode: ${config.commitMode}`,
					{
						command: 'workbench.action.openSettings',
						title: 'Open Commit Mode Settings',
						arguments: ['@ext:sbeeredd04.gitcue commitMode']
					}
				),
				new GitCueStatusItem(
					`Auto Push: ${config.autoPush ? 'Enabled' : 'Disabled'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					config.autoPush ? 'repo-push' : 'repo',
					`Auto push after commit: ${config.autoPush ? 'enabled' : 'disabled'}`,
					{
						command: 'workbench.action.openSettings',
						title: 'Open Auto Push Settings',
						arguments: ['@ext:sbeeredd04.gitcue autoPush']
					}
				),
				new GitCueStatusItem(
					`Buffer Time: ${config.bufferTimeSeconds}s`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					'clock',
					`Commit buffer duration: ${config.bufferTimeSeconds} seconds`,
					{
						command: 'workbench.action.openSettings',
						title: 'Open Buffer Time Settings',
						arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
					}
				),
				new GitCueStatusItem(
					`Rate Limit: ${config.maxCallsPerMinute}/min`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					'graph',
					`API rate limit: ${config.maxCallsPerMinute} calls per minute`,
					{
						command: 'workbench.action.openSettings',
						title: 'Open Rate Limiting Settings',
						arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
					}
				)
			],
			'gear',
			'GitCue configuration and settings'
		));

		// Quick Actions Section
		items.push(new GitCueStatusItem(
			'Quick Actions',
			vscode.TreeItemCollapsibleState.Collapsed,
			'gitcue-actions',
			[
				new GitCueStatusItem(
					isWatching ? 'Stop Watching' : 'Start Watching',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					isWatching ? 'eye-closed' : 'eye',
					isWatching ? 'Stop file watching' : 'Start file watching',
					{
						command: 'gitcue.watchToggle',
						title: 'Toggle File Watching',
						arguments: []
					}
				),
				new GitCueStatusItem(
					'Commit Now',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'git-commit',
					'Create a commit with current changes',
					{
						command: 'gitcue.commit',
						title: 'Create Commit Now',
						arguments: []
					}
				),
				new GitCueStatusItem(
					'Open Dashboard',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'dashboard',
					'Open GitCue web dashboard',
					{
						command: 'gitcue.openDashboard',
						title: 'Open GitCue Dashboard',
						arguments: []
					}
				),
				new GitCueStatusItem(
					'Configure Settings',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'gear',
					'Open GitCue configuration',
					{
						command: 'gitcue.configure',
						title: 'Configure GitCue',
						arguments: []
					}
				)
			],
			'zap',
			'Quick actions for GitCue operations'
		));

		return items;
	}

	private getConfig(): GitCueConfig {
		return configManager.getConfig();
	}

	private getWatchingStatus(): boolean {
		return this.fileWatcherService.getIsWatching();
	}

	private formatLastChange(lastChange: string | undefined): string {
		if (!lastChange || lastChange === 'Never') {
			return 'Never';
		}
		
		// If it's already a relative time format, return as is
		if (lastChange.includes('ago') || lastChange === 'Just now') {
			return lastChange;
		}
		
		// Otherwise format as relative time
		try {
			const changeTime = new Date(lastChange);
			const now = new Date();
			const diffMs = now.getTime() - changeTime.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMins / 60);
			const diffDays = Math.floor(diffHours / 24);

			if (diffMins < 1) {
				return 'Just now';
			} else if (diffMins < 60) {
				return `${diffMins}m ago`;
			} else if (diffHours < 24) {
				return `${diffHours}h ago`;
			} else {
				return `${diffDays}d ago`;
			}
		} catch {
			return lastChange; // Return original if parsing fails
		}
	}
}

export class GitCueStatusItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly children?: GitCueStatusItem[],
		iconName?: string,
		tooltip?: string,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.contextValue = contextValue;
		
		if (iconName) {
			this.iconPath = new vscode.ThemeIcon(iconName);
		}
		
		if (tooltip) {
			this.tooltip = tooltip;
		}
		
		if (command) {
			this.command = command;
		}
	}
} 