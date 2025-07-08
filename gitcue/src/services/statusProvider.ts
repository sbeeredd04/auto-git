import * as vscode from 'vscode';
import { GitCueConfig } from '../types/interfaces';

export class GitCueStatusProvider implements vscode.TreeDataProvider<GitCueStatusItem> {
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
			const isWatching = this.getWatchingStatus();
			
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
			autoWatch: config.get('autoWatch') ?? false,
			// Interactive terminal settings
			interactiveOnError: config.get('interactiveOnError') ?? false,
			enableSuggestions: config.get('enableSuggestions') ?? false,
			terminalVerbose: config.get('terminalVerbose') ?? false,
			sessionPersistence: config.get('sessionPersistence') ?? false,
			maxHistorySize: config.get('maxHistorySize') || 100
		};
	}

	private getWatchingStatus(): boolean {
		// This will be injected by the main extension
		return (global as any).gitCueIsWatching || false;
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