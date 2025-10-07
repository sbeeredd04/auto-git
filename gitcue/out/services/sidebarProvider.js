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
exports.GitCueSettingsProvider = exports.GitCueActivityProvider = exports.GitCueDashboardProvider = void 0;
const vscode = __importStar(require("vscode"));
const fileWatcherService_1 = require("./fileWatcherService");
const activityLogger_1 = require("./activityLogger");
const gitService_1 = require("./gitService");
const config_1 = require("../utils/config");
class GitCueDashboardProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    config;
    watchStatus;
    constructor() {
        this.refresh();
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
        const fileWatcher = fileWatcherService_1.FileWatcherService.getInstance();
        const activityLogger = activityLogger_1.ActivityLogger.getInstance();
        const gitService = gitService_1.GitService.getInstance();
        const config = config_1.configManager.getConfig();
        const isWatching = fileWatcher.getIsWatching();
        const watchStatus = activityLogger.getWatchStatus();
        const gitInfo = await gitService.getRepositoryInfo();
        const items = [];
        // Status Overview Card
        items.push(new DashboardItem(`GitCue ${isWatching ? 'Active' : 'Idle'}`, vscode.TreeItemCollapsibleState.Expanded, 'gitcue-status-overview', [
            // Status with inline action
            new DashboardItem(`File Watching: ${isWatching ? 'ON' : 'OFF'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-status-toggle', [], isWatching ? 'eye' : 'eye-closed', {
                command: 'gitcue.watchToggle',
                title: isWatching ? 'Stop Watching' : 'Start Watching',
                arguments: []
            }, isWatching ? 'Currently watching - click to stop' : 'Not watching - click to start'),
            // Files changed with commit action
            new DashboardItem(`${watchStatus.filesChanged || 0} Files Changed`, vscode.TreeItemCollapsibleState.None, 'gitcue-files-changed', [], watchStatus.filesChanged && watchStatus.filesChanged > 0 ? 'file-code' : 'file', watchStatus.filesChanged && watchStatus.filesChanged > 0 ? {
                command: 'gitcue.commit',
                title: 'Commit Changes',
                arguments: []
            } : undefined, watchStatus.filesChanged && watchStatus.filesChanged > 0 ? 'Click to commit changes' : 'No changes to commit'),
            // Last activity
            new DashboardItem(`Last Change: ${this.formatTimeAgo(watchStatus.lastChange)}`, vscode.TreeItemCollapsibleState.None, 'gitcue-last-change', [], 'clock', undefined, watchStatus.lastChange || 'No recent changes')
        ], isWatching ? 'pulse' : 'circle-outline', undefined, `GitCue is ${isWatching ? 'actively monitoring' : 'idle'}`));
        // Quick Actions Panel
        items.push(new DashboardItem('Quick Actions', vscode.TreeItemCollapsibleState.Expanded, 'gitcue-actions-panel', [
            new DashboardItem('Create AI Commit', vscode.TreeItemCollapsibleState.None, 'gitcue-action-commit', [], 'git-commit', {
                command: 'gitcue.commit',
                title: 'Create AI Commit',
                arguments: []
            }, 'Generate and create an AI-powered commit'),
            new DashboardItem('Open AI Terminal', vscode.TreeItemCollapsibleState.None, 'gitcue-action-terminal', [], 'terminal', {
                command: 'gitcue.openAITerminal',
                title: 'Open AI Terminal',
                arguments: []
            }, 'Open AI-powered terminal assistant'),
            new DashboardItem('Web Dashboard', vscode.TreeItemCollapsibleState.None, 'gitcue-action-dashboard', [], 'dashboard', {
                command: 'gitcue.openDashboard',
                title: 'Open Web Dashboard',
                arguments: []
            }, 'Open the full GitCue web dashboard'),
            new DashboardItem('Extension Settings', vscode.TreeItemCollapsibleState.None, 'gitcue-action-settings', [], 'gear', {
                command: 'gitcue.configure',
                title: 'Configure GitCue',
                arguments: []
            }, 'Configure GitCue settings and preferences')
        ], 'zap', undefined, 'Quick access to GitCue actions'));
        // Repository Information Card
        if (gitInfo) {
            items.push(new DashboardItem('Repository Info', vscode.TreeItemCollapsibleState.Expanded, 'gitcue-repo-info', [
                new DashboardItem(`${gitInfo.branch} • ${gitInfo.commits} commits`, vscode.TreeItemCollapsibleState.None, 'gitcue-repo-branch', [], 'git-branch', {
                    command: 'git.checkout',
                    title: 'Switch Branch',
                    arguments: []
                }, `Current branch: ${gitInfo.branch} with ${gitInfo.commits} commits`),
                new DashboardItem(`${gitInfo.uncommittedChanges} Uncommitted`, vscode.TreeItemCollapsibleState.None, 'gitcue-repo-uncommitted', [], gitInfo.uncommittedChanges > 0 ? 'diff-modified' : 'check', gitInfo.uncommittedChanges > 0 ? {
                    command: 'git.stage',
                    title: 'Stage Changes',
                    arguments: []
                } : undefined, `${gitInfo.uncommittedChanges} files with uncommitted changes`),
                new DashboardItem(`${gitInfo.stagedChanges} Staged`, vscode.TreeItemCollapsibleState.None, 'gitcue-repo-staged', [], gitInfo.stagedChanges > 0 ? 'diff-added' : 'circle-outline', gitInfo.stagedChanges > 0 ? {
                    command: 'gitcue.commit',
                    title: 'Commit Staged',
                    arguments: []
                } : undefined, `${gitInfo.stagedChanges} files staged for commit`)
            ], 'source-control', undefined, 'Current Git repository status'));
        }
        // Configuration Panel
        items.push(new DashboardItem('Configuration', vscode.TreeItemCollapsibleState.Collapsed, 'gitcue-config-panel', [
            new DashboardItem(`Mode: ${config.commitMode}`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-mode', [], config.commitMode === 'intelligent' ? 'beaker' : 'clock', {
                command: 'workbench.action.openSettings',
                title: 'Change Commit Mode',
                arguments: ['@ext:sbeeredd04.gitcue commitMode']
            }, `Current mode: ${config.commitMode} - click to change`),
            new DashboardItem(`Auto Push: ${config.autoPush ? 'ON' : 'OFF'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-push', [], config.autoPush ? 'repo-push' : 'repo', {
                command: 'workbench.action.openSettings',
                title: 'Toggle Auto Push',
                arguments: ['@ext:sbeeredd04.gitcue autoPush']
            }, `Auto push is ${config.autoPush ? 'enabled' : 'disabled'} - click to toggle`),
            new DashboardItem(`Buffer: ${config.bufferTimeSeconds}s`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-buffer', [], 'timer', {
                command: 'workbench.action.openSettings',
                title: 'Adjust Buffer Time',
                arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
            }, `${config.bufferTimeSeconds} second buffer time - click to adjust`),
            new DashboardItem(`API: ${config.geminiApiKey ? 'Ready' : 'Setup Required'}`, vscode.TreeItemCollapsibleState.None, 'gitcue-config-api', [], config.geminiApiKey ? 'key' : 'warning', {
                command: 'gitcue.configure',
                title: config.geminiApiKey ? 'Manage API Key' : 'Setup API Key',
                arguments: []
            }, config.geminiApiKey ? 'API key configured - click to manage' : 'Setup required - click to configure')
        ], 'gear', undefined, 'GitCue configuration settings'));
        return items;
    }
    formatTimeAgo(timestamp) {
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
            return timestamp;
        }
    }
}
exports.GitCueDashboardProvider = GitCueDashboardProvider;
class GitCueActivityProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor() {
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            return this.getRecentActivity();
        }
        return [];
    }
    async getRecentActivity() {
        const activityLogger = activityLogger_1.ActivityLogger.getInstance();
        const activities = activityLogger.getActivityHistory().slice(-20); // Show last 20 activities
        if (activities.length === 0) {
            return [
                new ActivityItem('No Recent Activity', 'Start watching to see activity', 'info', {
                    command: 'gitcue.watchToggle',
                    title: 'Start Watching',
                    arguments: []
                }, 'Click to start watching and see activity')
            ];
        }
        // Group activities by type for better organization
        const recentActivities = activities.reverse();
        const groupedActivities = [];
        // Add summary header
        const fileChanges = recentActivities.filter(a => a.type === 'file_change').length;
        const commits = recentActivities.filter(a => a.type === 'commit').length;
        const errors = recentActivities.filter(a => a.type === 'error').length;
        if (fileChanges > 0 || commits > 0 || errors > 0) {
            groupedActivities.push(new ActivityItem('Recent Summary', `${fileChanges} changes, ${commits} commits, ${errors} errors`, 'graph', undefined, 'Activity summary for this session'));
        }
        // Add recent activities with enhanced formatting
        const displayActivities = recentActivities.slice(0, 15).map((activity) => {
            const timeAgo = this.formatTime(activity.timestamp);
            const enhancedMessage = this.enhanceActivityMessage(activity);
            return new ActivityItem(enhancedMessage, timeAgo, this.getIconForActivityType(activity.type), this.getCommandForActivity(activity), `${enhancedMessage} - ${timeAgo}`);
        });
        return [...groupedActivities, ...displayActivities];
    }
    enhanceActivityMessage(activity) {
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
    getCommandForActivity(activity) {
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
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
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
    getIconForActivityType(type) {
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
exports.GitCueActivityProvider = GitCueActivityProvider;
class GitCueSettingsProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor() {
        this.refresh();
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        if (!element) {
            return this.getSettingsItems();
        }
        return element.children || [];
    }
    async getSettingsItems() {
        const config = config_1.configManager.getConfig();
        return [
            // Quick Setup Panel
            new SettingsItem('Quick Setup', 'Essential configuration', 'rocket', undefined, vscode.TreeItemCollapsibleState.Expanded, [
                new SettingsItem('API Key Setup', config.geminiApiKey ? 'Configured ✓' : 'Required ⚠️', config.geminiApiKey ? 'key' : 'warning', {
                    command: 'gitcue.configure',
                    title: 'Setup API Key',
                    arguments: []
                }, vscode.TreeItemCollapsibleState.None, undefined, config.geminiApiKey ? 'API key is configured' : 'Setup your Gemini API key to enable AI features'),
                new SettingsItem('Commit Mode', config.commitMode === 'intelligent' ? 'AI-Powered' : 'Time-Based', config.commitMode === 'intelligent' ? 'beaker' : 'clock', {
                    command: 'workbench.action.openSettings',
                    title: 'Change Commit Mode',
                    arguments: ['@ext:sbeeredd04.gitcue commitMode']
                }, vscode.TreeItemCollapsibleState.None, undefined, `Currently using ${config.commitMode} commit mode`),
                new SettingsItem('Auto-Watch', config.autoWatch ? 'Enabled' : 'Disabled', config.autoWatch ? 'eye' : 'eye-closed', {
                    command: 'workbench.action.openSettings',
                    title: 'Toggle Auto-Watch',
                    arguments: ['@ext:sbeeredd04.gitcue autoWatch']
                }, vscode.TreeItemCollapsibleState.None, undefined, `Auto-watch is ${config.autoWatch ? 'enabled' : 'disabled'}`)
            ], 'Quick access to essential settings'),
            // Advanced Configuration
            new SettingsItem('Advanced Settings', 'Fine-tune GitCue behavior', 'gear', undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new SettingsItem('Auto Push', config.autoPush ? 'Enabled' : 'Disabled', config.autoPush ? 'repo-push' : 'repo', {
                    command: 'workbench.action.openSettings',
                    title: 'Toggle Auto Push',
                    arguments: ['@ext:sbeeredd04.gitcue autoPush']
                }, vscode.TreeItemCollapsibleState.None, undefined, `Auto push after commit: ${config.autoPush ? 'enabled' : 'disabled'}`),
                new SettingsItem('Buffer Time', `${config.bufferTimeSeconds} seconds`, 'timer', {
                    command: 'workbench.action.openSettings',
                    title: 'Adjust Buffer Time',
                    arguments: ['@ext:sbeeredd04.gitcue bufferTimeSeconds']
                }, vscode.TreeItemCollapsibleState.None, undefined, `Commit buffer time: ${config.bufferTimeSeconds} seconds`),
                new SettingsItem('Rate Limiting', `${config.maxCallsPerMinute} calls/min`, 'graph', {
                    command: 'workbench.action.openSettings',
                    title: 'Adjust Rate Limit',
                    arguments: ['@ext:sbeeredd04.gitcue maxCallsPerMinute']
                }, vscode.TreeItemCollapsibleState.None, undefined, `API rate limit: ${config.maxCallsPerMinute} calls per minute`),
                new SettingsItem('Notifications', config.enableNotifications ? 'Enabled' : 'Disabled', config.enableNotifications ? 'bell' : 'bell-slash', {
                    command: 'workbench.action.openSettings',
                    title: 'Toggle Notifications',
                    arguments: ['@ext:sbeeredd04.gitcue enableNotifications']
                }, vscode.TreeItemCollapsibleState.None, undefined, `Notifications are ${config.enableNotifications ? 'enabled' : 'disabled'}`)
            ], 'Advanced configuration options'),
            // Management Tools
            new SettingsItem('Management Tools', 'Manage your GitCue setup', 'tools', undefined, vscode.TreeItemCollapsibleState.Collapsed, [
                new SettingsItem('Open All Settings', 'VS Code Settings Panel', 'settings', {
                    command: 'workbench.action.openSettings',
                    title: 'Open GitCue Settings',
                    arguments: ['@ext:sbeeredd04.gitcue']
                }, vscode.TreeItemCollapsibleState.None, undefined, 'Open the full GitCue settings panel'),
                new SettingsItem('Reset to Defaults', 'Restore default settings', 'refresh', {
                    command: 'gitcue.resetConfig',
                    title: 'Reset Configuration',
                    arguments: []
                }, vscode.TreeItemCollapsibleState.None, undefined, 'Reset all GitCue settings to default values'),
                new SettingsItem('Export Config', 'Save current settings', 'export', {
                    command: 'gitcue.exportConfig',
                    title: 'Export Configuration',
                    arguments: []
                }, vscode.TreeItemCollapsibleState.None, undefined, 'Export your current GitCue configuration'),
                new SettingsItem('View Documentation', 'Help & guides', 'book', {
                    command: 'gitcue.openDocumentation',
                    title: 'View Documentation',
                    arguments: []
                }, vscode.TreeItemCollapsibleState.None, undefined, 'Open GitCue documentation and guides')
            ], 'Tools for managing your GitCue configuration')
        ];
    }
}
exports.GitCueSettingsProvider = GitCueSettingsProvider;
// Enhanced base classes for tree items
class DashboardItem extends vscode.TreeItem {
    label;
    collapsibleState;
    contextValue;
    children;
    command;
    tooltip;
    constructor(label, collapsibleState, contextValue, children, iconName, command, tooltip) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.children = children;
        this.command = command;
        this.tooltip = tooltip;
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
    label;
    description;
    command;
    tooltip;
    constructor(label, description, iconName, command, tooltip) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.label = label;
        this.description = description;
        this.command = command;
        this.tooltip = tooltip;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon(iconName);
        if (command) {
            this.command = command;
        }
        if (tooltip) {
            this.tooltip = tooltip;
        }
        else {
            this.tooltip = `${this.label} - ${this.description}`;
        }
    }
}
class SettingsItem extends vscode.TreeItem {
    label;
    description;
    command;
    children;
    tooltip;
    constructor(label, description, iconName, command, collapsibleState = vscode.TreeItemCollapsibleState.None, children, tooltip) {
        super(label, collapsibleState);
        this.label = label;
        this.description = description;
        this.command = command;
        this.children = children;
        this.tooltip = tooltip;
        this.description = description;
        this.iconPath = new vscode.ThemeIcon(iconName);
        if (command) {
            this.command = command;
        }
        if (tooltip) {
            this.tooltip = tooltip;
        }
        else {
            this.tooltip = `${this.label}: ${this.description}`;
        }
    }
}
//# sourceMappingURL=sidebarProvider.js.map