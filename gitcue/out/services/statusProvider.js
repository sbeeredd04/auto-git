"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCueStatusItem = exports.GitCueStatusProvider = void 0;
const vscode = __importStar(require("vscode"));
const config_1 = require("../utils/config");
const activityLogger_1 = require("./activityLogger");
const fileWatcherService_1 = require("./fileWatcherService");
const gitService_1 = require("./gitService");
class GitCueStatusProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    activityLogger;
    fileWatcherService;
    gitService;
    constructor() {
        this.activityLogger = activityLogger_1.ActivityLogger.getInstance();
        this.fileWatcherService = fileWatcherService_1.FileWatcherService.getInstance();
        this.gitService = gitService_1.GitService.getInstance();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            return this.getRootItems();
        }
        return element.children || [];
    }
    async getRootItems() {
        const config = this.getConfig();
        const watchStatus = this.activityLogger.getWatchStatus();
        const isWatching = this.getWatchingStatus();
        const gitInfo = await this.gitService.getRepositoryInfo();
        const items = [];
        // System Status Section
        items.push(new GitCueStatusItem('System Status', vscode.TreeItemCollapsibleState.Expanded, 'gitcue-system', [
            new GitCueStatusItem(`Status: ${isWatching ? 'Watching' : 'Idle'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-status-item', [], isWatching ? 'eye' : 'eye-closed', isWatching ? 'GitCue is actively monitoring file changes' : 'GitCue is idle - click to start watching', {
                command: 'gitcue.watchToggle',
                title: 'Toggle Watching',
                arguments: []
            }),
            new GitCueStatusItem(`Buffer: ${watchStatus.pendingCommit ? 'Active' : 'Inactive'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-status-item', [], watchStatus.pendingCommit ? 'loading~spin' : 'circle-outline', watchStatus.pendingCommit ? 'Commit buffer is active - changes will be committed soon' : 'No pending commits in buffer'),
            new GitCueStatusItem(`API: ${config.geminiApiKey ? 'Ready' : 'Not Configured'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-status-item', [], config.geminiApiKey ? 'key' : 'warning', config.geminiApiKey ? 'Gemini API is configured and ready' : 'API key needs to be configured for AI features', config.geminiApiKey ? undefined : {
                command: 'gitcue.configure',
                title: 'Configure API Key',
                arguments: []
            })
        ], 'pulse', 'Current system status and monitoring state'));
        // File Activity Section
        items.push(new GitCueStatusItem('File Activity', vscode.TreeItemCollapsibleState.Expanded, 'gitcue-activity', [
            new GitCueStatusItem(`Files Changed: ${watchStatus.filesChanged || 0}`, vscode.TreeItemCollapsibleState.None, 'gitcue-activity-item', [], 'diff', `${watchStatus.filesChanged || 0} files have been modified since last commit`),
            new GitCueStatusItem(`Last Change: ${this.formatLastChange(watchStatus.lastChange)}`, vscode.TreeItemCollapsibleState.None, 'gitcue-activity-item', [], 'clock', watchStatus.lastChange ? `Most recent change: ${watchStatus.lastChange}` : 'No recent file changes detected'),
            new GitCueStatusItem(`Watch Mode: ${isWatching ? 'Active' : 'Stopped'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-activity-item', [], isWatching ? 'eye' : 'eye-closed', isWatching ? 'File watching is active' : 'File watching is stopped', {
                command: 'gitcue.watchToggle',
                title: 'Toggle File Watching',
                arguments: []
            })
        ], 'file-code', 'Current file activity and change tracking'));
        // Git Repository Section
        if (gitInfo) {
            items.push(new GitCueStatusItem('Git Repository', vscode.TreeItemCollapsibleState.Expanded, 'gitcue-git', [
                new GitCueStatusItem(`Branch: ${gitInfo.branch}`, vscode.TreeItemCollapsibleState.None, 'gitcue-git-item', [], 'git-branch', `Current branch: ${gitInfo.branch}`),
                new GitCueStatusItem(`Uncommitted: ${gitInfo.uncommittedChanges}`, vscode.TreeItemCollapsibleState.None, 'gitcue-git-item', [], gitInfo.uncommittedChanges > 0 ? 'diff-modified' : 'check', `${gitInfo.uncommittedChanges} files with uncommitted changes`),
                new GitCueStatusItem(`Staged: ${gitInfo.stagedChanges}`, vscode.TreeItemCollapsibleState.None, 'gitcue-git-item', [], gitInfo.stagedChanges > 0 ? 'diff-added' : 'circle-outline', `${gitInfo.stagedChanges} files staged for commit`)
            ], 'source-control', 'Current git repository status and changes'));
        }
        // Configuration Section
        items.push(new GitCueStatusItem('Configuration', vscode.TreeItemCollapsibleState.Collapsed, 'gitcue-config', [
            new GitCueStatusItem(`Commit Mode: ${config.commitMode}`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-item', [], 'settings-gear', `Current commit mode: ${config.commitMode}`, {
                command: 'workbench.action.openSettings',
                title: 'Open Commit Mode Settings',
                arguments: ['@ext:sbeeredd04.gitcue commitMode']
            }),
            new GitCueStatusItem(`Auto Push: ${config.autoPush ? 'Enabled' : 'Disabled'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-item', [], config.autoPush ? 'repo-push' : 'repo', `Auto push after commit: ${config.autoPush ? 'enabled' : 'disabled'}`, {
                command: 'workbench.action.openSettings',
                title: 'Open Auto Push Settings',
                arguments: ['@ext:sbeeredd04.gitcue autoPush']
            }),
            new GitCueStatusItem(`Buffer Time: ${config.bufferTimeSeconds}s`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-item', [], 'clock', `Commit buffer duration: ${config.bufferTimeSeconds} seconds`, {
                command: 'workbench.action.openSettings',
                title: 'Open Buffer Time Settings',
                arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
            }),
            new GitCueStatusItem(`Rate Limit: ${config.maxCallsPerMinute}/min`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-item', [], 'graph', `API rate limit: ${config.maxCallsPerMinute} calls per minute`, {
                command: 'workbench.action.openSettings',
                title: 'Open Rate Limiting Settings',
                arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
            })
        ], 'gear', 'GitCue configuration and settings'));
        // Quick Actions Section
        items.push(new GitCueStatusItem('Quick Actions', vscode.TreeItemCollapsibleState.Collapsed, 'gitcue-actions', [
            new GitCueStatusItem(isWatching ? 'Stop Watching' : 'Start Watching', vscode.TreeItemCollapsibleState.None, 'gitcue-action', [], isWatching ? 'eye-closed' : 'eye', isWatching ? 'Stop file watching' : 'Start file watching', {
                command: 'gitcue.watchToggle',
                title: 'Toggle File Watching',
                arguments: []
            }),
            new GitCueStatusItem('Commit Now', vscode.TreeItemCollapsibleState.None, 'gitcue-action', [], 'git-commit', 'Create a commit with current changes', {
                command: 'gitcue.commit',
                title: 'Create Commit Now',
                arguments: []
            }),
            new GitCueStatusItem('Open Dashboard', vscode.TreeItemCollapsibleState.None, 'gitcue-action', [], 'dashboard', 'Open GitCue web dashboard', {
                command: 'gitcue.openDashboard',
                title: 'Open GitCue Dashboard',
                arguments: []
            }),
            new GitCueStatusItem('Configure Settings', vscode.TreeItemCollapsibleState.None, 'gitcue-action', [], 'gear', 'Open GitCue configuration', {
                command: 'gitcue.configure',
                title: 'Configure GitCue',
                arguments: []
            })
        ], 'zap', 'Quick actions for GitCue operations'));
        return items;
    }
    getConfig() {
        return config_1.configManager.getConfig();
    }
    getWatchingStatus() {
        return this.fileWatcherService.getIsWatching();
    }
    formatLastChange(lastChange) {
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
            }
            else if (diffMins < 60) {
                return `${diffMins}m ago`;
            }
            else if (diffHours < 24) {
                return `${diffHours}h ago`;
            }
            else {
                return `${diffDays}d ago`;
            }
        }
        catch {
            return lastChange; // Return original if parsing fails
        }
    }
}
exports.GitCueStatusProvider = GitCueStatusProvider;
class GitCueStatusItem extends vscode.TreeItem {
    label;
    collapsibleState;
    contextValue;
    children;
    command;
    constructor(label, collapsibleState, contextValue, children, iconName, tooltip, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.children = children;
        this.command = command;
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
exports.GitCueStatusItem = GitCueStatusItem;
//# sourceMappingURL=statusProvider.js.map