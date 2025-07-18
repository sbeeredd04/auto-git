import * as vscode from 'vscode';
import { GitCueConfig, WatchStatus } from '../types/interfaces';
import { FileWatcherService } from './fileWatcherService';
import { ActivityLogger } from './activityLogger';
import { GitService } from './gitService';
import { configManager } from '../utils/config';

export class GitCueDashboardProvider implements vscode.TreeDataProvider<DashboardItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<DashboardItem | undefined | null | void> = new vscode.EventEmitter<DashboardItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<DashboardItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private config: GitCueConfig | undefined;
	private watchStatus: WatchStatus | undefined;

	constructor() {
		this.refresh();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: DashboardItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: DashboardItem): Promise<DashboardItem[]> {
		if (!element) {
			return this.getRootItems();
		}
		return element.children || [];
	}

	private async getRootItems(): Promise<DashboardItem[]> {
		const fileWatcher = FileWatcherService.getInstance();
		const activityLogger = ActivityLogger.getInstance();
		const gitService = GitService.getInstance();
		const config = configManager.getConfig();
		const isWatching = fileWatcher.getIsWatching();
		const watchStatus = activityLogger.getWatchStatus();
		const gitInfo = await gitService.getRepositoryInfo();
		
		const items: DashboardItem[] = [];

		// Current Status Section
		items.push(new DashboardItem(
			'Current Status',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-status',
			[
				new DashboardItem(
					`Watching: ${isWatching ? 'Active' : 'Inactive'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					isWatching ? 'eye' : 'eye-closed',
					undefined,
					isWatching ? 'GitCue is actively watching for file changes' : 'GitCue is not watching - click to start'
				),
				new DashboardItem(
					`Files Changed: ${watchStatus.filesChanged || 0}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					'diff',
					undefined,
					`${watchStatus.filesChanged || 0} files have been modified since last commit`
				),
				new DashboardItem(
					`Last Change: ${watchStatus.lastChange || 'Never'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					'clock',
					undefined,
					`Most recent file change: ${watchStatus.lastChange || 'No changes detected'}`
				),
				new DashboardItem(
					`Pending Commit: ${watchStatus.pendingCommit ? 'Yes' : 'No'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-item',
					[],
					watchStatus.pendingCommit ? 'git-commit' : 'check',
					undefined,
					watchStatus.pendingCommit ? 'A commit is currently pending' : 'No pending commits'
				)
			],
			'pulse'
		));

		// Git Repository Section
		if (gitInfo) {
			items.push(new DashboardItem(
				'Git Repository',
				vscode.TreeItemCollapsibleState.Expanded,
				'gitcue-git',
				[
					new DashboardItem(
						`Branch: ${gitInfo.branch}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						'git-branch',
						undefined,
						`Current git branch: ${gitInfo.branch}`
					),
					new DashboardItem(
						`Commits: ${gitInfo.commits}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						'git-commit',
						undefined,
						`Total commits in current branch: ${gitInfo.commits}`
					),
					new DashboardItem(
						`Uncommitted: ${gitInfo.uncommittedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						'diff-modified',
						undefined,
						`Files with uncommitted changes: ${gitInfo.uncommittedChanges}`
					),
					new DashboardItem(
						`Staged: ${gitInfo.stagedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-git-item',
						[],
						'diff-added',
						undefined,
						`Files staged for commit: ${gitInfo.stagedChanges}`
					)
				],
				'source-control'
			));
		}

		// Configuration Section
		items.push(new DashboardItem(
			'Configuration',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-config',
			[
				new DashboardItem(
					`Commit Mode: ${config.commitMode}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					'settings-gear',
					{
						command: 'workbench.action.openSettings',
						title: 'Open Commit Mode Settings',
						arguments: ['@ext:sbeeredd04.gitcue commitMode']
					},
					`Current commit mode: ${config.commitMode}`
				),
				new DashboardItem(
					`Auto Push: ${config.autoPush ? 'Enabled' : 'Disabled'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					config.autoPush ? 'repo-push' : 'repo',
					{
						command: 'workbench.action.openSettings',
						title: 'Open Auto Push Settings',
						arguments: ['@ext:sbeeredd04.gitcue autoPush']
					},
					`Auto push to remote: ${config.autoPush ? 'enabled' : 'disabled'}`
				),
				new DashboardItem(
					`Buffer Time: ${config.bufferTimeSeconds}s`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					'clock',
					{
						command: 'workbench.action.openSettings',
						title: 'Open Buffer Time Settings',
						arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
					},
					`Commit buffer time: ${config.bufferTimeSeconds} seconds`
				),
				new DashboardItem(
					`API Key: ${config.geminiApiKey ? 'Configured' : 'Not Set'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-item',
					[],
					config.geminiApiKey ? 'key' : 'warning',
					{
						command: 'gitcue.configure',
						title: 'Configure API Key',
						arguments: []
					},
					config.geminiApiKey ? 'Gemini API key is configured' : 'Gemini API key needs to be configured'
				)
			],
			'gear'
		));

		// Quick Actions Section
		items.push(new DashboardItem(
			'Quick Actions',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-actions',
			[
				new DashboardItem(
					isWatching ? 'Stop Watching' : 'Start Watching',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					isWatching ? 'eye-closed' : 'eye',
					{
						command: 'gitcue.watchToggle',
						title: 'Toggle File Watching',
						arguments: []
					},
					isWatching ? 'Stop watching for file changes' : 'Start watching for file changes'
				),
				new DashboardItem(
					'Commit Now',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'git-commit',
					{
						command: 'gitcue.commit',
						title: 'Create Commit Now',
						arguments: []
					},
					'Create a commit with current changes'
				),
				new DashboardItem(
					'AI Terminal',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'terminal',
					{
						command: 'gitcue.openAITerminal',
						title: 'Open AI Terminal',
						arguments: []
					},
					'Open GitCue AI-powered terminal'
				),
				new DashboardItem(
					'Open Dashboard',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'dashboard',
					{
						command: 'gitcue.openDashboard',
						title: 'Open GitCue Dashboard',
						arguments: []
					},
					'Open the GitCue web dashboard'
				),
				new DashboardItem(
					'Settings',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action',
					[],
					'gear',
					{
						command: 'gitcue.configure',
						title: 'Configure GitCue Settings',
						arguments: []
					},
					'Configure GitCue settings and preferences'
				)
			],
			'zap'
		));

		return items;
	}
}

export class GitCueActivityProvider implements vscode.TreeDataProvider<ActivityItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ActivityItem | undefined | null | void> = new vscode.EventEmitter<ActivityItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ActivityItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {
		this.refresh();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ActivityItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: ActivityItem): Promise<ActivityItem[]> {
		if (!element) {
			return this.getRecentActivity();
		}
		return element.children || [];
	}

	private async getRecentActivity(): Promise<ActivityItem[]> {
		const activityLogger = ActivityLogger.getInstance();
		const activities = activityLogger.getActivityHistory().slice(-15); // Show last 15 activities
		
		if (activities.length === 0) {
			return [
				new ActivityItem(
					'No Recent Activity',
					'Start watching to see activity',
					'info',
					undefined,
					'Start GitCue watching to begin tracking file changes and commits'
				)
			];
		}

		return activities.reverse().map((activity: any) => 
			new ActivityItem(
				activity.message,
				this.formatTime(activity.timestamp),
				this.getIconForActivityType(activity.type),
				undefined,
				`${activity.message} - ${this.formatTime(activity.timestamp)}`
			)
		);
	}

	private formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
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
	}

	private getIconForActivityType(type: string): string {
		switch (type) {
			case 'commit': return 'git-commit';
			case 'error': return 'error';
			case 'file_change': return 'file-code';
			case 'ai_analysis': return 'beaker';
			case 'watch_start': return 'eye';
			case 'watch_stop': return 'eye-closed';
			case 'push': return 'repo-push';
			case 'config_change': return 'settings-gear';
			default: return 'circle-filled';
		}
	}
}

export class GitCueSettingsProvider implements vscode.TreeDataProvider<SettingsItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<SettingsItem | undefined | null | void> = new vscode.EventEmitter<SettingsItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<SettingsItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {
		this.refresh();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: SettingsItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: SettingsItem): Promise<SettingsItem[]> {
		if (!element) {
			return this.getSettingsItems();
		}
		return element.children || [];
	}

	private async getSettingsItems(): Promise<SettingsItem[]> {
		const config = configManager.getConfig();
		
		return [
			// Core Settings
			new SettingsItem(
				'Core Settings',
				'',
				'settings-gear',
				undefined,
				vscode.TreeItemCollapsibleState.Expanded,
				[
					new SettingsItem(
						'Commit Mode',
						config.commitMode,
						'git-commit',
						{
							command: 'workbench.action.openSettings',
							title: 'Open Commit Mode Settings',
							arguments: ['@ext:sbeeredd04.gitcue commitMode']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Current commit mode: ${config.commitMode}`
					),
					new SettingsItem(
						'Auto Push',
						config.autoPush ? 'Enabled' : 'Disabled',
						config.autoPush ? 'repo-push' : 'repo',
						{
							command: 'workbench.action.openSettings',
							title: 'Open Auto Push Settings',
							arguments: ['@ext:sbeeredd04.gitcue autoPush']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Auto push after commit: ${config.autoPush ? 'enabled' : 'disabled'}`
					),
					new SettingsItem(
						'Buffer Time',
						`${config.bufferTimeSeconds}s`,
						'clock',
						{
							command: 'workbench.action.openSettings',
							title: 'Open Buffer Time Settings',
							arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Commit buffer time: ${config.bufferTimeSeconds} seconds`
					)
				],
				'Core GitCue settings and preferences'
			),

			// API Configuration
			new SettingsItem(
				'API Configuration',
				'',
				'key',
				undefined,
				vscode.TreeItemCollapsibleState.Expanded,
				[
					new SettingsItem(
						'Gemini API Key',
						config.geminiApiKey ? 'Configured' : 'Not Set',
						config.geminiApiKey ? 'key' : 'warning',
						{
							command: 'gitcue.configure',
							title: 'Configure API Key',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						config.geminiApiKey ? 'Gemini API key is configured' : 'Configure your Gemini API key'
					),
					new SettingsItem(
						'Rate Limiting',
						`${config.maxCallsPerMinute}/min`,
						'graph',
						{
							command: 'workbench.action.openSettings',
							title: 'Open Rate Limiting Settings',
							arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Maximum API calls per minute: ${config.maxCallsPerMinute}`
					)
				],
				'API keys and rate limiting configuration'
			),

			// Quick Actions
			new SettingsItem(
				'Quick Actions',
				'',
				'zap',
				undefined,
				vscode.TreeItemCollapsibleState.Expanded,
				[
					new SettingsItem(
						'Open All Settings',
						'GitCue Extension Settings',
						'gear',
						{
							command: 'workbench.action.openSettings',
							title: 'Open GitCue Settings',
							arguments: ['@ext:sbeeredd04.gitcue']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Open all GitCue extension settings'
					),
					new SettingsItem(
						'Reset Configuration',
						'Reset to Defaults',
						'refresh',
						{
							command: 'gitcue.resetConfig',
							title: 'Reset GitCue Configuration',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Reset GitCue configuration to default values'
					),
					new SettingsItem(
						'Export Configuration',
						'Save Current Settings',
						'export',
						{
							command: 'gitcue.exportConfig',
							title: 'Export GitCue Configuration',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Export current GitCue configuration to file'
					)
				],
				'Quick actions for managing GitCue settings'
			)
		];
	}
}

// Base classes for tree items
class DashboardItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly children?: DashboardItem[],
		public readonly iconPath?: string | vscode.ThemeIcon,
		public readonly command?: vscode.Command,
		public readonly tooltip?: string
	) {
		super(label, collapsibleState);
		this.contextValue = contextValue;
		
		if (iconPath) {
			this.iconPath = new vscode.ThemeIcon(iconPath as string);
		}
		
		if (command) {
			this.command = command;
		}

		if (tooltip) {
			this.tooltip = tooltip;
		}
	}
}

class ActivityItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		iconName: string,
		public readonly children?: ActivityItem[],
		public readonly tooltip?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
		this.iconPath = new vscode.ThemeIcon(iconName);
		
		if (tooltip) {
			this.tooltip = tooltip;
		} else {
			this.tooltip = `${this.label} - ${this.description}`;
		}
	}
}

class SettingsItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		iconName: string,
		public readonly command?: vscode.Command,
		collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
		public readonly children?: SettingsItem[],
		public readonly tooltip?: string
	) {
		super(label, collapsibleState);
		this.description = description;
		this.iconPath = new vscode.ThemeIcon(iconName);
		
		if (command) {
			this.command = command;
		}

		if (tooltip) {
			this.tooltip = tooltip;
		} else {
			this.tooltip = `${this.label}: ${this.description}`;
		}
	}
} 