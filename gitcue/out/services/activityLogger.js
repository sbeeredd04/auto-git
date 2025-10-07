"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogger = void 0;
class ActivityLogger {
    static instance;
    watchStatus;
    updateCallback;
    constructor() {
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
    static getInstance() {
        if (!ActivityLogger.instance) {
            ActivityLogger.instance = new ActivityLogger();
        }
        return ActivityLogger.instance;
    }
    setUpdateCallback(callback) {
        this.updateCallback = callback;
    }
    getWatchStatus() {
        return this.watchStatus;
    }
    updateWatchStatus(updates) {
        this.watchStatus = { ...this.watchStatus, ...updates };
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
    logActivity(type, message, details, commitMetadata) {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            type,
            message,
            details,
            commitMetadata
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
    clearActivity() {
        this.watchStatus.activityHistory = [];
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
    getActivityHistory() {
        return this.watchStatus.activityHistory;
    }
    resetWatchStatus() {
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
    setFileChanged(fileName, filePath) {
        this.watchStatus.changedFiles.add(filePath);
        this.watchStatus.filesChanged = this.watchStatus.changedFiles.size;
        this.watchStatus.lastChange = fileName + ' at ' + new Date().toLocaleTimeString();
        this.logActivity('file_change', `File changed: ${fileName}`, filePath);
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
    setCommitCompleted(message, shouldPush, changedFiles, diffSummary, commitReason, aiAnalysis, config) {
        this.watchStatus.lastCommit = new Date().toLocaleTimeString();
        this.watchStatus.filesChanged = 0;
        this.watchStatus.changedFiles.clear();
        this.watchStatus.pendingCommit = false;
        // Create detailed commit metadata
        const commitMetadata = {
            reason: commitReason || 'manual',
            config: config ? {
                mode: config.commitMode || 'periodic',
                bufferTime: config.bufferTimeSeconds || 30,
                autoPush: config.autoPush || false,
                threshold: config.commitThreshold
            } : {
                mode: 'periodic',
                bufferTime: 30,
                autoPush: false
            },
            changedFiles: changedFiles || [],
            diffSummary: diffSummary || 'No diff summary available'
        };
        if (aiAnalysis) {
            commitMetadata.aiAnalysis = {
                shouldCommit: aiAnalysis.shouldCommit || true,
                significance: aiAnalysis.significance || 'MEDIUM',
                completeness: aiAnalysis.completeness || 'unknown',
                changeType: aiAnalysis.changeType || 'unknown',
                reasoning: aiAnalysis.reason || 'No reasoning provided'
            };
        }
        this.logActivity('commit', `Committed: ${message}`, shouldPush ? 'Pushed to remote' : 'Local commit only', commitMetadata);
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
    setPendingCommit(pending) {
        this.watchStatus.pendingCommit = pending;
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
    setAiAnalysisInProgress(inProgress) {
        this.watchStatus.aiAnalysisInProgress = inProgress;
        if (this.updateCallback) {
            this.updateCallback();
        }
    }
}
exports.ActivityLogger = ActivityLogger;
//# sourceMappingURL=activityLogger.js.map