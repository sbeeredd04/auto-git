import { ActivityLogEntry, WatchStatus } from '../types/interfaces';

export class ActivityLogger {
	private static instance: ActivityLogger;
	private watchStatus: WatchStatus;
	private updateCallback?: () => void;

	private constructor() {
		this.watchStatus = {
			isWatching: false,
			filesChanged: 0,
			lastChange: 'None',
			lastCommit: 'None',
			pendingCommit: false,
			aiAnalysisInProgress: false,
			activityHistory: [],
			changedFiles: new Set()
		};
	}

	static getInstance(): ActivityLogger {
		if (!ActivityLogger.instance) {
			ActivityLogger.instance = new ActivityLogger();
		}
		return ActivityLogger.instance;
	}

	setUpdateCallback(callback: () => void): void {
		this.updateCallback = callback;
	}

	getWatchStatus(): WatchStatus {
		return this.watchStatus;
	}

	updateWatchStatus(updates: Partial<WatchStatus>): void {
		this.watchStatus = { ...this.watchStatus, ...updates };
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	logActivity(type: ActivityLogEntry['type'], message: string, details?: string): void {
		const entry: ActivityLogEntry = {
			timestamp: new Date().toLocaleTimeString(),
			type,
			message,
			details
		};
		
		this.watchStatus.activityHistory.unshift(entry);
		
		// Keep only last 50 entries
		if (this.watchStatus.activityHistory.length > 50) {
			this.watchStatus.activityHistory = this.watchStatus.activityHistory.slice(0, 50);
		}
		
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	clearActivity(): void {
		this.watchStatus.activityHistory = [];
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	getActivityHistory(): ActivityLogEntry[] {
		return this.watchStatus.activityHistory;
	}

	resetWatchStatus(): void {
		this.watchStatus = {
			isWatching: false,
			filesChanged: 0,
			lastChange: 'None',
			lastCommit: 'None',
			pendingCommit: false,
			aiAnalysisInProgress: false,
			activityHistory: this.watchStatus.activityHistory, // Keep activity history
			changedFiles: new Set()
		};
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	setFileChanged(fileName: string, filePath: string): void {
		this.watchStatus.changedFiles.add(filePath);
		this.watchStatus.filesChanged = this.watchStatus.changedFiles.size;
		this.watchStatus.lastChange = fileName + ' at ' + new Date().toLocaleTimeString();
		
		this.logActivity('file_change', `File changed: ${fileName}`, filePath);
		
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	setCommitCompleted(message: string, shouldPush: boolean): void {
		this.watchStatus.lastCommit = new Date().toLocaleTimeString();
		this.watchStatus.filesChanged = 0;
		this.watchStatus.changedFiles.clear();
		this.watchStatus.pendingCommit = false;
		
		this.logActivity('commit', `Committed: ${message}`, shouldPush ? 'Pushed to remote' : 'Local commit only');
		
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	setPendingCommit(pending: boolean): void {
		this.watchStatus.pendingCommit = pending;
		if (this.updateCallback) {
			this.updateCallback();
		}
	}

	setAiAnalysisInProgress(inProgress: boolean): void {
		this.watchStatus.aiAnalysisInProgress = inProgress;
		if (this.updateCallback) {
			this.updateCallback();
		}
	}
} 