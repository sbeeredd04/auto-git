import * as vscode from 'vscode';
import { GitCueConfig, WatchStatus } from '../types/interfaces';
import { FileWatcherService } from './fileWatcherService';
import { ActivityLogger } from './activityLogger';
import { GitService } from './gitService';

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
		const isWatching = fileWatcher.getIsWatching();
		const watchStatus = activityLogger.getWatchStatus();
		const gitInfo = await gitService.getRepositoryInfo();
		
		const items: DashboardItem[] = [];

		// Git Repository Section
		if (gitInfo) {
			items.push(new DashboardItem(
				'Git Repository',
				vscode.TreeItemCollapsibleState.Expanded,
				'git-repo',
				[
					new DashboardItem(
						`Branch: ${gitInfo.branch}`,
						vscode.TreeItemCollapsibleState.None,
						'git-item',
						[],
						'git-branch'
					),
					new DashboardItem(
						`Commits: ${gitInfo.commits}`,
						vscode.TreeItemCollapsibleState.None,
						'git-item',
						[],
						'git-commit'
					),
					new DashboardItem(
						`Uncommitted: ${gitInfo.uncommittedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'git-item',
						[],
						'diff'
					),
					new DashboardItem(
						`Staged: ${gitInfo.stagedChanges}`,
						vscode.TreeItemCollapsibleState.None,
						'git-item',
						[],
						'diff-added'
					)
				],
				'source-control'
			));
		}

		// Status Section
		items.push(new DashboardItem(
			'GitCue Status',
			vscode.TreeItemCollapsibleState.Expanded,
			'status',
			[
				new DashboardItem(
					`Watching: ${isWatching ? 'Active' : 'Inactive'}`,
					vscode.TreeItemCollapsibleState.None,
					'status-item',
					[],
					isWatching ? 'check' : 'close'
				),
				new DashboardItem(
					`Files Changed: ${watchStatus.filesChanged || 0}`,
					vscode.TreeItemCollapsibleState.None,
					'status-item',
					[],
					'file'
				),
				new DashboardItem(
					`Last Change: ${watchStatus.lastChange}`,
					vscode.TreeItemCollapsibleState.None,
					'status-item',
					[],
					'clock'
				)
			],
			'pulse'
		));

		// Actions Section
		items.push(new DashboardItem(
			'Quick Actions',
			vscode.TreeItemCollapsibleState.Expanded,
			'actions',
			[
				new DashboardItem(
					isWatching ? 'Stop Watching' : 'Start Watching',
					vscode.TreeItemCollapsibleState.None,
					'action',
					[],
					isWatching ? 'eye-closed' : 'eye',
					{
						command: 'gitcue.watchToggle',
						title: 'Toggle Watching',
						arguments: []
					}
				),
				new DashboardItem(
					'Commit Now',
					vscode.TreeItemCollapsibleState.None,
					'action',
					[],
					'git-commit',
					{
						command: 'gitcue.commit',
						title: 'Commit Now',
						arguments: []
					}
				),
				new DashboardItem(
					'AI Terminal',
					vscode.TreeItemCollapsibleState.None,
					'action',
					[],
					'terminal',
					{
						command: 'gitcue.openAITerminal',
						title: 'Open AI Terminal',
						arguments: []
					}
				),
				new DashboardItem(
					'Settings',
					vscode.TreeItemCollapsibleState.None,
					'action',
					[],
					'settings-gear',
					{
						command: 'gitcue.configure',
						title: 'Configure Settings',
						arguments: []
					}
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
		return [];
	}

	private async getRecentActivity(): Promise<ActivityItem[]> {
		const activityLogger = ActivityLogger.getInstance();
		const activities = activityLogger.getActivityHistory().slice(0, 10);
		
		if (activities.length === 0) {
			return [new ActivityItem('No recent activity', 'Start watching to see activity', 'info')];
		}

		return activities.map((activity: any) => 
			new ActivityItem(
				activity.message,
				activity.timestamp,
				this.getIconForActivityType(activity.type)
			)
		);
	}

	private formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString();
	}

	private getIconForActivityType(type: string): string {
		switch (type) {
			case 'commit': return 'check';
			case 'error': return 'error';
			case 'file_change': return 'file';
			case 'ai_analysis': return 'beaker';
			case 'watch_start': return 'eye';
			case 'watch_stop': return 'eye-closed';
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
		return [];
	}

	private async getSettingsItems(): Promise<SettingsItem[]> {
		const config = vscode.workspace.getConfiguration('gitcue');
		
		return [
			new SettingsItem(
				'Commit Mode',
				config.get('commitMode', 'intelligent'),
				'settings-gear',
				{
					command: 'workbench.action.openSettings',
					title: 'Open Settings',
					arguments: ['@ext:sbeeredd04.gitcue commitMode']
				}
			),
			new SettingsItem(
				'Auto Push',
				config.get('autoPush', true) ? 'Enabled' : 'Disabled',
				'repo-push',
				{
					command: 'workbench.action.openSettings',
					title: 'Open Settings',
					arguments: ['@ext:sbeeredd04.gitcue autoPush']
				}
			),
			new SettingsItem(
				'Buffer Time',
				`${config.get('bufferTimeSeconds', 30)}s`,
				'clock',
				{
					command: 'workbench.action.openSettings',
					title: 'Open Settings',
					arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
				}
			),
			new SettingsItem(
				'Max Calls Per Minute',
				`${config.get('maxCallsPerMinute', 15)}`,
				'graph',
				{
					command: 'workbench.action.openSettings',
					title: 'Open Settings',
					arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
				}
			),
			new SettingsItem(
				'Configure All',
				'Open GitCue Settings',
				'gear',
				{
					command: 'gitcue.configure',
					title: 'Configure GitCue',
					arguments: []
				}
			)
		];
	}
}

class DashboardItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly contextValue: string,
		public readonly children?: DashboardItem[],
		public readonly iconPath?: string | vscode.ThemeIcon,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);
		this.tooltip = this.label;
		this.contextValue = contextValue;
		
		if (iconPath) {
			this.iconPath = new vscode.ThemeIcon(iconPath as string);
		}
		
		if (command) {
			this.command = command;
		}
	}
}

class ActivityItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		iconName: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = `${this.label} - ${this.description}`;
		this.description = description;
		this.iconPath = new vscode.ThemeIcon(iconName);
	}
}

class SettingsItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly description: string,
		iconName: string,
		public readonly command?: vscode.Command
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = `${this.label}: ${this.description}`;
		this.description = description;
		this.iconPath = new vscode.ThemeIcon(iconName);
		
		if (command) {
			this.command = command;
		}
	}
} 