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

		// Status Overview Card
		items.push(new DashboardItem(
			`GitCue ${isWatching ? 'Active' : 'Idle'}`,
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-status-overview',
			[
				// Status with inline action
				new DashboardItem(
					`File Watching: ${isWatching ? 'ON' : 'OFF'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-status-toggle',
					[],
					isWatching ? 'eye' : 'eye-closed',
					{
						command: 'gitcue.watchToggle',
						title: isWatching ? 'Stop Watching' : 'Start Watching',
						arguments: []
					},
					isWatching ? 'Currently watching - click to stop' : 'Not watching - click to start'
				),
				// Files changed with commit action
				new DashboardItem(
					`${watchStatus.filesChanged || 0} Files Changed`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-files-changed',
					[],
					watchStatus.filesChanged && watchStatus.filesChanged > 0 ? 'file-code' : 'file',
					watchStatus.filesChanged && watchStatus.filesChanged > 0 ? {
						command: 'gitcue.commit',
						title: 'Commit Changes',
						arguments: []
					} : undefined,
					watchStatus.filesChanged && watchStatus.filesChanged > 0 ? 'Click to commit changes' : 'No changes to commit'
				),
				// Last activity
				new DashboardItem(
					`Last Change: ${this.formatTimeAgo(watchStatus.lastChange)}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-last-change',
					[],
					'clock',
					undefined,
					watchStatus.lastChange || 'No recent changes'
				)
			],
			isWatching ? 'pulse' : 'circle-outline',
			undefined,
			`GitCue is ${isWatching ? 'actively monitoring' : 'idle'}`
		));

		// Quick Actions Panel
		items.push(new DashboardItem(
			'Quick Actions',
			vscode.TreeItemCollapsibleState.Expanded,
			'gitcue-actions-panel',
			[
				new DashboardItem(
					'Create AI Commit',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action-commit',
					[],
					'git-commit',
					{
						command: 'gitcue.commit',
						title: 'Create AI Commit',
						arguments: []
					},
					'Generate and create an AI-powered commit'
				),
				new DashboardItem(
					'Open AI Terminal',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action-terminal',
					[],
					'terminal',
					{
						command: 'gitcue.openAITerminal',
						title: 'Open AI Terminal',
						arguments: []
					},
					'Open AI-powered terminal assistant'
				),
				new DashboardItem(
					'Web Dashboard',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action-dashboard',
					[],
					'dashboard',
					{
						command: 'gitcue.openDashboard',
						title: 'Open Web Dashboard',
						arguments: []
					},
					'Open the full GitCue web dashboard'
				),
				new DashboardItem(
					'Extension Settings',
					vscode.TreeItemCollapsibleState.None,
					'gitcue-action-settings',
					[],
					'gear',
					{
						command: 'gitcue.configure',
						title: 'Configure GitCue',
						arguments: []
					},
					'Configure GitCue settings and preferences'
				)
			],
			'zap',
			undefined,
			'Quick access to GitCue actions'
		));

		// Repository Information Card
		if (gitInfo) {
			items.push(new DashboardItem(
				'Repository Info',
				vscode.TreeItemCollapsibleState.Expanded,
				'gitcue-repo-info',
				[
					new DashboardItem(
						`${gitInfo.branch} • ${gitInfo.commits} commits`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-repo-branch',
						[],
						'git-branch',
						{
							command: 'git.checkout',
							title: 'Switch Branch',
							arguments: []
						},
						`Current branch: ${gitInfo.branch} with ${gitInfo.commits} commits`
					),
					new DashboardItem(
						`${gitInfo.uncommittedChanges} Uncommitted`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-repo-uncommitted',
						[],
						gitInfo.uncommittedChanges > 0 ? 'diff-modified' : 'check',
						gitInfo.uncommittedChanges > 0 ? {
							command: 'git.stage',
							title: 'Stage Changes',
							arguments: []
						} : undefined,
						`${gitInfo.uncommittedChanges} files with uncommitted changes`
					),
					new DashboardItem(
						`${gitInfo.stagedChanges} Staged`,
						vscode.TreeItemCollapsibleState.None,
						'gitcue-repo-staged',
						[],
						gitInfo.stagedChanges > 0 ? 'diff-added' : 'circle-outline',
						gitInfo.stagedChanges > 0 ? {
							command: 'gitcue.commit',
							title: 'Commit Staged',
							arguments: []
						} : undefined,
						`${gitInfo.stagedChanges} files staged for commit`
					)
				],
				'source-control',
				undefined,
				'Current Git repository status'
			));
		}

		// Configuration Panel
		items.push(new DashboardItem(
			'Configuration',
			vscode.TreeItemCollapsibleState.Collapsed,
			'gitcue-config-panel',
			[
				new DashboardItem(
					`Mode: ${config.commitMode}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-mode',
					[],
					config.commitMode === 'intelligent' ? 'beaker' : 'clock',
					{
						command: 'workbench.action.openSettings',
						title: 'Change Commit Mode',
						arguments: ['@ext:sbeeredd04.gitcue commitMode']
					},
					`Current mode: ${config.commitMode} - click to change`
				),
				new DashboardItem(
					`Auto Push: ${config.autoPush ? 'ON' : 'OFF'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-push',
					[],
					config.autoPush ? 'repo-push' : 'repo',
					{
						command: 'workbench.action.openSettings',
						title: 'Toggle Auto Push',
						arguments: ['@ext:sbeeredd04.gitcue autoPush']
					},
					`Auto push is ${config.autoPush ? 'enabled' : 'disabled'} - click to toggle`
				),
				new DashboardItem(
					`Buffer: ${config.bufferTimeSeconds}s`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-buffer',
					[],
					'timer',
					{
						command: 'workbench.action.openSettings',
						title: 'Adjust Buffer Time',
						arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
					},
					`${config.bufferTimeSeconds} second buffer time - click to adjust`
				),
				new DashboardItem(
					`API: ${config.geminiApiKey ? 'Ready' : 'Setup Required'}`,
					vscode.TreeItemCollapsibleState.None,
					'gitcue-config-api',
					[],
					config.geminiApiKey ? 'key' : 'warning',
					{
						command: 'gitcue.configure',
						title: config.geminiApiKey ? 'Manage API Key' : 'Setup API Key',
						arguments: []
					},
					config.geminiApiKey ? 'API key configured - click to manage' : 'Setup required - click to configure'
				)
			],
			'gear',
			undefined,
			'GitCue configuration settings'
		));

		return items;
	}

	private formatTimeAgo(timestamp: string | undefined): string {
		if (!timestamp || timestamp === 'None' || timestamp === 'Never') {
			return 'Never';
		}
		
		// If it's already formatted as relative time, return as is
		if (timestamp.includes('ago') || timestamp === 'Just now') {
			return timestamp;
		}
		
		try {
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
		} catch {
			return timestamp;
		}
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
		return [];
	}

	private async getRecentActivity(): Promise<ActivityItem[]> {
		const activityLogger = ActivityLogger.getInstance();
		const activities = activityLogger.getActivityHistory().slice(-20); // Show last 20 activities
		
		if (activities.length === 0) {
			return [
				new ActivityItem(
					'No Recent Activity',
					'Start watching to see activity',
					'info',
					{
						command: 'gitcue.watchToggle',
						title: 'Start Watching',
						arguments: []
					},
					'Click to start watching and see activity'
				)
			];
		}

		// Group activities by type for better organization
		const recentActivities = activities.reverse();
		const groupedActivities: ActivityItem[] = [];
		
		// Add summary header
		const fileChanges = recentActivities.filter(a => a.type === 'file_change').length;
		const commits = recentActivities.filter(a => a.type === 'commit').length;
		const errors = recentActivities.filter(a => a.type === 'error').length;
		
		if (fileChanges > 0 || commits > 0 || errors > 0) {
			groupedActivities.push(new ActivityItem(
				'Recent Summary',
				`${fileChanges} changes, ${commits} commits, ${errors} errors`,
				'graph',
				undefined,
				'Activity summary for this session'
			));
		}

		// Add recent activities with enhanced formatting
		const displayActivities = recentActivities.slice(0, 15).map((activity: any) => {
			const timeAgo = this.formatTime(activity.timestamp);
			const enhancedMessage = this.enhanceActivityMessage(activity);
			
			return new ActivityItem(
				enhancedMessage,
				timeAgo,
				this.getIconForActivityType(activity.type),
				this.getCommandForActivity(activity),
				`${enhancedMessage} - ${timeAgo}`
			);
		});

		return [...groupedActivities, ...displayActivities];
	}

	private enhanceActivityMessage(activity: any): string {
		const type = activity.type;
		const message = activity.message;
		
		switch (type) {
			case 'commit':
				return `✓ ${message}`;
			case 'error':
				return `✗ ${message}`;
			case 'file_change':
				return `📝 ${message}`;
			case 'ai_analysis':
				return `🤖 ${message}`;
			case 'watch_start':
				return `👁️ ${message}`;
			case 'watch_stop':
				return `⏹️ ${message}`;
			default:
				return message;
		}
	}

	private getCommandForActivity(activity: any): vscode.Command | undefined {
		switch (activity.type) {
			case 'error':
				return {
					command: 'gitcue.showStatus',
					title: 'Show Details',
					arguments: []
				};
			case 'file_change':
				return {
					command: 'gitcue.commit',
					title: 'Commit Changes',
					arguments: []
				};
			case 'commit':
				return {
					command: 'git.log',
					title: 'View Commit',
					arguments: []
				};
			default:
				return undefined;
		}
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
			case 'config_change': return 'gear';
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
			// Quick Setup Panel
			new SettingsItem(
				'Quick Setup',
				'Essential configuration',
				'rocket',
				undefined,
				vscode.TreeItemCollapsibleState.Expanded,
				[
					new SettingsItem(
						'API Key Setup',
						config.geminiApiKey ? 'Configured ✓' : 'Required ⚠️',
						config.geminiApiKey ? 'key' : 'warning',
						{
							command: 'gitcue.configure',
							title: 'Setup API Key',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						config.geminiApiKey ? 'API key is configured' : 'Setup your Gemini API key to enable AI features'
					),
					new SettingsItem(
						'Commit Mode',
						config.commitMode === 'intelligent' ? 'AI-Powered' : 'Time-Based',
						config.commitMode === 'intelligent' ? 'beaker' : 'clock',
						{
							command: 'workbench.action.openSettings',
							title: 'Change Commit Mode',
							arguments: ['@ext:sbeeredd04.gitcue commitMode']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Currently using ${config.commitMode} commit mode`
					),
					new SettingsItem(
						'Auto-Watch',
						config.autoWatch ? 'Enabled' : 'Disabled',
						config.autoWatch ? 'eye' : 'eye-closed',
						{
							command: 'workbench.action.openSettings',
							title: 'Toggle Auto-Watch',
							arguments: ['@ext:sbeeredd04.gitcue autoWatch']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Auto-watch is ${config.autoWatch ? 'enabled' : 'disabled'}`
					)
				],
				'Quick access to essential settings'
			),

			// Advanced Configuration
			new SettingsItem(
				'Advanced Settings',
				'Fine-tune GitCue behavior',
				'gear',
				undefined,
				vscode.TreeItemCollapsibleState.Collapsed,
				[
					new SettingsItem(
						'Auto Push',
						config.autoPush ? 'Enabled' : 'Disabled',
						config.autoPush ? 'repo-push' : 'repo',
						{
							command: 'workbench.action.openSettings',
							title: 'Toggle Auto Push',
							arguments: ['@ext:sbeeredd04.gitcue autoPush']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Auto push after commit: ${config.autoPush ? 'enabled' : 'disabled'}`
					),
					new SettingsItem(
						'Buffer Time',
						`${config.bufferTimeSeconds} seconds`,
						'timer',
						{
							command: 'workbench.action.openSettings',
							title: 'Adjust Buffer Time',
							arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Commit buffer time: ${config.bufferTimeSeconds} seconds`
					),
					new SettingsItem(
						'Rate Limiting',
						`${config.maxCallsPerMinute} calls/min`,
						'graph',
						{
							command: 'workbench.action.openSettings',
							title: 'Adjust Rate Limit',
							arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`API rate limit: ${config.maxCallsPerMinute} calls per minute`
					),
					new SettingsItem(
						'Notifications',
						config.enableNotifications ? 'Enabled' : 'Disabled',
						config.enableNotifications ? 'bell' : 'bell-slash',
						{
							command: 'workbench.action.openSettings',
							title: 'Toggle Notifications',
							arguments: ['@ext:sbeeredd04.gitcue enableNotifications']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						`Notifications are ${config.enableNotifications ? 'enabled' : 'disabled'}`
					)
				],
				'Advanced configuration options'
			),

			// Management Tools
			new SettingsItem(
				'Management Tools',
				'Manage your GitCue setup',
				'tools',
				undefined,
				vscode.TreeItemCollapsibleState.Collapsed,
				[
					new SettingsItem(
						'Open All Settings',
						'VS Code Settings Panel',
						'settings',
						{
							command: 'workbench.action.openSettings',
							title: 'Open GitCue Settings',
							arguments: ['@ext:sbeeredd04.gitcue']
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Open the full GitCue settings panel'
					),
					new SettingsItem(
						'Reset to Defaults',
						'Restore default settings',
						'refresh',
						{
							command: 'gitcue.resetConfig',
							title: 'Reset Configuration',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Reset all GitCue settings to default values'
					),
					new SettingsItem(
						'Export Config',
						'Save current settings',
						'export',
						{
							command: 'gitcue.exportConfig',
							title: 'Export Configuration',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Export your current GitCue configuration'
					),
					new SettingsItem(
						'View Documentation',
						'Help & guides',
						'book',
						{
							command: 'gitcue.openDocumentation',
							title: 'View Documentation',
							arguments: []
						},
						vscode.TreeItemCollapsibleState.None,
						undefined,
						'Open GitCue documentation and guides'
					)
				],
				'Tools for managing your GitCue configuration'
			)
		];
	}
}

// Enhanced base classes for tree items
class DashboardItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly children?: DashboardItem[],
		iconName?: string,
		public readonly command?: vscode.Command,
		public readonly tooltip?: string
	) {
		super(label, collapsibleState);
		this.contextValue = contextValue;
		
		if (iconName) {
			this.iconPath = new vscode.ThemeIcon(iconName);
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
		public readonly command?: vscode.Command,
		public readonly tooltip?: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = description;
		this.iconPath = new vscode.ThemeIcon(iconName);
		
		if (command) {
			this.command = command;
		}
		
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