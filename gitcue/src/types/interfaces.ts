import * as vscode from 'vscode';

export interface IntelligentCommitConfig {
	commitThreshold: 'any' | 'medium' | 'major';
	minTimeBetweenCommits: number; // milliseconds
	activitySettleTime: number; // milliseconds
	requireCompleteness: boolean;
	bufferTimeSeconds: number;
	cancelOnNewChanges: boolean;
}

export interface GitCueConfig {
	geminiApiKey: string;
	commitMode: 'periodic' | 'intelligent';
	autoPush: boolean;
	watchPaths: string[];
	debounceMs: number;
	bufferTimeSeconds: number;
	maxCallsPerMinute: number;
	enableNotifications: boolean;
	autoWatch: boolean;
	// Interactive terminal settings
	interactiveOnError: boolean;
	enableSuggestions: boolean;
	terminalVerbose: boolean;
	sessionPersistence: boolean;
	maxHistorySize: number;
	// Intelligent commit configuration
	intelligentCommit: IntelligentCommitConfig;
}

export interface BufferNotification {
	panel: vscode.WebviewPanel;
	timer: NodeJS.Timeout;
	cancelled: boolean;
}

export interface WatchStatus {
	isWatching: boolean;
	filesChanged: number;
	lastChange: string;
	lastCommit: string;
	pendingCommit: boolean;
	aiAnalysisInProgress: boolean;
	activityHistory: ActivityLogEntry[];
	changedFiles: Set<string>;
}

export interface ActivityLogEntry {
	timestamp: string;
	type: 'file_change' | 'ai_analysis' | 'commit' | 'error' | 'watch_start' | 'watch_stop';
	message: string;
	details?: string;
	
	// Enhanced commit metadata
	commitMetadata?: {
		reason: 'ai_decision' | 'manual' | 'buffer_timeout' | 'periodic';
		aiAnalysis?: {
			shouldCommit: boolean;
			significance: 'LOW' | 'MEDIUM' | 'HIGH';
			completeness: string;
			changeType: string;
			reasoning: string;
		};
		config: {
			mode: string;
			bufferTime: number;
			autoPush: boolean;
			threshold?: string;
		};
		changedFiles: string[];
		diffSummary: string;
	};
}

export interface DashboardState {
	isWatching: boolean;
	config: GitCueConfig;
	watchStatus: WatchStatus;
}

export interface CommitPreviewOptions {
	message: string;
	status: string;
	workspacePath: string;
	config: GitCueConfig;
}

export interface BufferNotificationOptions {
	message: string;
	status: string;
	timeLeft: number;
	config: GitCueConfig;
} 