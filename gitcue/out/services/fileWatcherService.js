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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcherService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const config_1 = require("../utils/config");
const logger_1 = __importDefault(require("../utils/logger"));
const activityLogger_1 = require("./activityLogger");
const commitService_1 = require("./commitService");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class FileWatcherService {
    static instance;
    fileWatcher;
    debounceTimer;
    activitySettleTimer;
    isWatching = false;
    activityLogger;
    commitService;
    workspaceFolder;
    // Intelligent commit tracking
    lastCommitTime = 0;
    recentActivity = false;
    activityCount = 0;
    lastDiffHash = null;
    constructor() {
        this.activityLogger = activityLogger_1.ActivityLogger.getInstance();
        this.commitService = commitService_1.CommitService.getInstance();
        this.workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    }
    static getInstance() {
        if (!FileWatcherService.instance) {
            FileWatcherService.instance = new FileWatcherService();
        }
        return FileWatcherService.instance;
    }
    getIsWatching() {
        return this.isWatching;
    }
    async startWatching() {
        if (!this.workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return false;
        }
        const config = config_1.configManager.getConfig();
        if (!config.geminiApiKey) {
            vscode.window.showWarningMessage('Gemini API key not configured. Please configure it in settings.');
            return false;
        }
        // Use comprehensive watch patterns
        const watchPatterns = config_1.configManager.getWatchPatterns();
        const watchPattern = `{${watchPatterns.join(',')}}`;
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(watchPattern);
        // Track changes to avoid duplicate processing
        const changeTracker = new Set();
        let lastDiffHash = null;
        const onFileChange = async (uri) => {
            await this.handleFileChange(uri, changeTracker, lastDiffHash);
        };
        // Listen to all file system events
        this.fileWatcher.onDidChange(onFileChange);
        this.fileWatcher.onDidCreate(onFileChange);
        this.fileWatcher.onDidDelete(onFileChange);
        // Also listen to workspace file changes for better coverage
        const workspaceWatcher = vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.scheme === 'file') {
                onFileChange(event.document.uri);
            }
        });
        // Store for cleanup
        this.fileWatcher.workspaceWatcher = workspaceWatcher;
        this.isWatching = true;
        this.activityLogger.updateWatchStatus({ isWatching: true });
        this.activityLogger.logActivity('watch_start', 'File watching started', `Patterns: ${watchPatterns.join(', ')}`);
        // Trigger callbacks for UI updates
        this.activityLogger.updateWatchStatus({ isWatching: true });
        if (config.enableNotifications) {
            vscode.window.showInformationMessage('GitCue: Started watching for changes');
        }
        logger_1.default.info('Started watching for file changes with patterns: ' + watchPatterns.join(', '));
        return true;
    }
    stopWatching() {
        if (this.fileWatcher) {
            // Clean up workspace watcher if it exists
            if (this.fileWatcher.workspaceWatcher) {
                this.fileWatcher.workspaceWatcher.dispose();
            }
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = undefined;
        }
        // Cancel any pending commits
        this.commitService.cancelBufferedCommit();
        this.isWatching = false;
        this.activityLogger.resetWatchStatus();
        this.activityLogger.logActivity('watch_stop', 'File watching stopped');
        // Trigger callbacks for UI updates
        this.activityLogger.updateWatchStatus({ isWatching: false });
        const config = config_1.configManager.getConfig();
        if (config.enableNotifications) {
            vscode.window.showInformationMessage('GitCue: Stopped watching');
        }
        logger_1.default.info('Stopped watching for file changes');
    }
    async handleFileChange(uri, changeTracker, lastDiffHash) {
        if (!this.workspaceFolder)
            return;
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        // Filter out Git internal files and other system files
        if (this.shouldIgnoreFile(fileName, filePath)) {
            return;
        }
        // Skip if we've already processed this file recently
        if (changeTracker.has(filePath)) {
            return;
        }
        changeTracker.add(filePath);
        // Remove from tracker after a short delay
        setTimeout(() => {
            changeTracker.delete(filePath);
        }, 1000);
        const config = config_1.configManager.getConfig();
        // Track activity for intelligent mode
        this.recentActivity = true;
        this.activityCount++;
        // Cancel pending commit if new changes detected during buffer period
        if (config.commitMode === 'intelligent' && config.intelligentCommit.cancelOnNewChanges) {
            this.commitService.cancelBufferedCommit();
            logger_1.default.debug('New changes detected during buffer period, cancelled pending commit');
        }
        // Check actual git changes to get accurate count
        try {
            const { stdout: gitStatus } = await execAsync('git status --porcelain', {
                cwd: this.workspaceFolder.uri.fsPath
            });
            if (gitStatus.trim()) {
                // Parse git status to get unique changed files
                const changedFiles = gitStatus.trim().split('\n')
                    .map(line => line.substring(3).trim()) // Remove status prefix
                    .filter(file => file.length > 0);
                // Update activity logger with file changes
                if (changedFiles.length > 0) {
                    this.activityLogger.setFileChanged(fileName, filePath);
                    logger_1.default.debug(`File change detected: ${uri.fsPath}`);
                }
                // Create diff hash to avoid duplicate processing
                const { stdout: diff } = await execAsync('git diff', { cwd: this.workspaceFolder.uri.fsPath });
                const currentDiffHash = this.createDiffHash(diff);
                // Skip if this is the same diff we already processed
                if (currentDiffHash === this.lastDiffHash) {
                    logger_1.default.debug('Diff unchanged since last analysis, skipping');
                    return;
                }
                this.lastDiffHash = currentDiffHash;
            }
            else {
                // No git changes, reset counters
                this.activityLogger.updateWatchStatus({
                    filesChanged: 0,
                    changedFiles: new Set()
                });
            }
        }
        catch (error) {
            // If git commands fail, fall back to simple file counting
            if (!this.shouldIgnoreFile(fileName, filePath)) {
                this.activityLogger.setFileChanged(fileName, filePath);
                logger_1.default.debug(`File change detected: ${uri.fsPath}`);
            }
            this.activityLogger.logActivity('error', 'Git status check failed', error instanceof Error ? error.message : String(error));
        }
        // Clear existing timers
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        if (this.activitySettleTimer) {
            clearTimeout(this.activitySettleTimer);
        }
        // Use intelligent mode activity tracking or standard debouncing
        if (config.commitMode === 'intelligent') {
            await this.handleIntelligentModeActivity();
        }
        else {
            // Standard periodic mode debouncing
            this.debounceTimer = setTimeout(async () => {
                try {
                    this.activityLogger.logActivity('ai_analysis', 'Starting AI analysis for changes');
                    if (this.workspaceFolder) {
                        await this.commitService.commitWithBuffer(this.workspaceFolder.uri.fsPath, config);
                    }
                }
                catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    logger_1.default.error('Error processing file changes: ' + errorMsg);
                    this.activityLogger.logActivity('error', 'Failed to process file changes', errorMsg);
                    if (config.enableNotifications) {
                        vscode.window.showErrorMessage(`GitCue: Error processing changes - ${errorMsg}`);
                    }
                }
            }, config.debounceMs);
        }
    }
    shouldIgnoreFile(fileName, filePath) {
        const gitInternalFiles = [
            'index.lock',
            'COMMIT_EDITMSG',
            'MERGE_HEAD',
            'MERGE_MSG',
            'FETCH_HEAD',
            'HEAD.lock',
            'config.lock',
            'packed-refs.lock'
        ];
        const systemFiles = [
            '.DS_Store',
            'Thumbs.db',
            'desktop.ini'
        ];
        // Skip Git internal files and system files
        if (gitInternalFiles.includes(fileName) || systemFiles.includes(fileName)) {
            return true;
        }
        // Skip files in .git directory
        if (filePath.includes('/.git/') || filePath.includes('\\.git\\')) {
            return true;
        }
        return false;
    }
    createDiffHash(diffText) {
        if (!diffText)
            return null;
        // Simple hash function for diff content
        let hash = 0;
        for (let i = 0; i < diffText.length; i++) {
            const char = diffText.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }
    async handleIntelligentCommit() {
        if (!this.workspaceFolder)
            return;
        const config = config_1.configManager.getConfig();
        if (!config.geminiApiKey)
            return;
        // Use buffer notification for intelligent commits
        await this.commitService.commitWithBuffer(this.workspaceFolder.uri.fsPath, config);
    }
    /**
     * Handle intelligent mode activity tracking and debouncing
     */
    async handleIntelligentModeActivity() {
        const config = config_1.configManager.getConfig();
        const intelligentConfig = config.intelligentCommit;
        // Reset activity settle timer - wait for user to stop making changes
        this.activitySettleTimer = setTimeout(async () => {
            this.recentActivity = false;
            // Check if enough time has passed since last commit
            const timeSinceLastCommit = Date.now() - this.lastCommitTime;
            if (timeSinceLastCommit < intelligentConfig.minTimeBetweenCommits) {
                const remainingMinutes = Math.ceil((intelligentConfig.minTimeBetweenCommits - timeSinceLastCommit) / 60000);
                logger_1.default.debug(`Intelligent mode: ${remainingMinutes} minutes remaining before next commit analysis`);
                this.activityLogger.logActivity('ai_analysis', `Waiting ${remainingMinutes}min before next commit`, 'Min time between commits');
                // Schedule analysis for when the minimum time has passed
                this.debounceTimer = setTimeout(async () => {
                    if (!this.recentActivity) {
                        await this.processIntelligentCommit();
                    }
                }, intelligentConfig.minTimeBetweenCommits - timeSinceLastCommit);
                return;
            }
            // Proceed with analysis if no recent activity and enough time has passed
            if (!this.recentActivity) {
                logger_1.default.debug(`Intelligent mode: Activity settled (${this.activityCount} changes), analyzing for commit...`);
                this.activityLogger.logActivity('ai_analysis', `Activity settled after ${this.activityCount} changes`, 'Starting commit analysis');
                this.activityCount = 0; // Reset activity counter
                await this.processIntelligentCommit();
            }
        }, intelligentConfig.activitySettleTime);
        const settleMinutes = Math.ceil(intelligentConfig.activitySettleTime / 60000);
        logger_1.default.debug(`Activity detected, waiting ${settleMinutes} minutes for activity to settle...`);
    }
    /**
     * Process intelligent commit with AI analysis
     */
    async processIntelligentCommit() {
        if (!this.workspaceFolder)
            return;
        const config = config_1.configManager.getConfig();
        if (!config.geminiApiKey)
            return;
        try {
            this.activityLogger.logActivity('ai_analysis', 'Analyzing changes with AI for commit decision');
            // Use intelligent commit with buffer
            await this.commitService.commitWithIntelligentAnalysis(this.workspaceFolder.uri.fsPath, config);
            // Update last commit time
            this.lastCommitTime = Date.now();
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger_1.default.error('Intelligent commit analysis failed: ' + errorMsg);
            this.activityLogger.logActivity('error', 'Intelligent commit failed', errorMsg);
            if (config.enableNotifications) {
                vscode.window.showErrorMessage(`GitCue: Intelligent commit analysis failed - ${errorMsg}`);
            }
        }
    }
    dispose() {
        this.stopWatching();
        // Clear all timers
        if (this.activitySettleTimer) {
            clearTimeout(this.activitySettleTimer);
        }
    }
}
exports.FileWatcherService = FileWatcherService;
//# sourceMappingURL=fileWatcherService.js.map