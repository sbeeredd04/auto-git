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
exports.CommitService = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const ai_1 = require("../utils/ai");
const logger_1 = __importDefault(require("../utils/logger"));
const dashboardService_1 = require("./dashboardService");
const activityLogger_1 = require("./activityLogger");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class CommitService {
    static instance;
    bufferNotification;
    dashboardService;
    activityLogger;
    constructor() {
        this.dashboardService = dashboardService_1.DashboardService.getInstance();
        this.activityLogger = activityLogger_1.ActivityLogger.getInstance();
    }
    static getInstance() {
        if (!CommitService.instance) {
            CommitService.instance = new CommitService();
        }
        return CommitService.instance;
    }
    async commitWithPreview(workspacePath, config) {
        try {
            if (!config.geminiApiKey) {
                const action = await vscode.window.showWarningMessage('Gemini API key not configured. Would you like to set it up?', 'Configure');
                if (action === 'Configure') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'gitcue');
                }
                return;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'GitCue: Generating AI commit message...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 30, message: 'Analyzing changes...' });
                const { stdout: status } = await execAsync('git status --porcelain', {
                    cwd: workspacePath
                });
                if (!status.trim()) {
                    vscode.window.showInformationMessage('No changes to commit');
                    return;
                }
                progress.report({ increment: 40, message: 'Generating commit message...' });
                const commitMessage = await this.generateCommitMessage(workspacePath, config);
                progress.report({ increment: 30, message: 'Opening preview...' });
                this.showCommitPreview(commitMessage, status, workspacePath, config);
            });
        }
        catch (error) {
            logger_1.default.error(`Error in commitWithPreview: ${error}`);
            vscode.window.showErrorMessage(`GitCue Error: ${error}`);
        }
    }
    async commitWithBuffer(workspacePath, config) {
        try {
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: workspacePath
            });
            if (!status.trim()) {
                logger_1.default.info('No changes to commit');
                return;
            }
            await execAsync('git add .', { cwd: workspacePath });
            let aiAnalysis = null;
            let commitReason = 'periodic';
            if (config.commitMode === 'intelligent') {
                aiAnalysis = await this.analyzeChangesWithAI(workspacePath);
                commitReason = 'ai_decision';
                if (!aiAnalysis.shouldCommit) {
                    logger_1.default.info(`AI decided not to commit: ${aiAnalysis.reason}`);
                    if (config.enableNotifications) {
                        vscode.window.showInformationMessage(`[GitCue AI] ${aiAnalysis.reason}`);
                    }
                    return;
                }
                logger_1.default.info(`AI analysis: ${aiAnalysis.reason} (${aiAnalysis.significance})`);
            }
            else {
                commitReason = 'buffer_timeout';
            }
            const commitMessage = await this.generateCommitMessage(workspacePath, config);
            // Get changed files list for metadata
            const changedFiles = status.trim().split('\n').map(line => line.substring(3).trim());
            const { stdout: diff } = await execAsync('git diff --cached --stat', { cwd: workspacePath });
            // Store metadata for logging
            this.pendingCommitMetadata = {
                aiAnalysis,
                commitReason,
                changedFiles,
                diffSummary: diff.trim(),
                config
            };
            await this.showBufferNotification(commitMessage, status, workspacePath, config);
        }
        catch (error) {
            logger_1.default.error(`Error in commitWithBuffer: ${error}`);
            if (config.enableNotifications) {
                vscode.window.showErrorMessage(`GitCue Error: ${error}`);
            }
        }
    }
    /**
     * Commit with intelligent analysis using threshold and completeness
     */
    async commitWithIntelligentAnalysis(workspacePath, config) {
        try {
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: workspacePath
            });
            if (!status.trim()) {
                logger_1.default.info('No changes to commit');
                return;
            }
            await execAsync('git add .', { cwd: workspacePath });
            // Enhanced AI analysis with threshold and completeness
            const intelligentConfig = config.intelligentCommit;
            const analysis = await this.analyzeChangesWithIntelligentCriteria(workspacePath, intelligentConfig.commitThreshold, intelligentConfig.requireCompleteness);
            if (!analysis.shouldCommit) {
                logger_1.default.info(`AI decided not to commit: ${analysis.reason}`);
                if (config.enableNotifications) {
                    const settleMinutes = Math.ceil(intelligentConfig.activitySettleTime / 60000);
                    vscode.window.showInformationMessage(`🤖 GitCue: ${analysis.reason}\n\nContinuing to monitor (next analysis in ${settleMinutes}min after activity settles)...`);
                }
                this.activityLogger.logActivity('ai_analysis', 'Skipped commit', analysis.reason);
                return;
            }
            // Log detailed analysis
            logger_1.default.info(`AI Analysis - Significance: ${analysis.significance}, Completeness: ${analysis.completeness}, Type: ${analysis.changeType}`);
            this.activityLogger.logActivity('ai_analysis', 'Commit approved', `${analysis.significance} ${analysis.changeType} (${analysis.completeness})`);
            const commitMessage = analysis.suggestedMessage || await this.generateCommitMessage(workspacePath, config);
            await this.showBufferNotification(commitMessage, status, workspacePath, config, analysis);
        }
        catch (error) {
            logger_1.default.error(`Error in commitWithIntelligentAnalysis: ${error}`);
            if (config.enableNotifications) {
                vscode.window.showErrorMessage(`GitCue Error: ${error}`);
            }
        }
    }
    async analyzeChangesWithAI(workspacePath) {
        try {
            this.activityLogger.setAiAnalysisInProgress(true);
            const { stdout: diff } = await execAsync('git diff', { cwd: workspacePath });
            const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });
            if (!diff.trim() && !status.trim()) {
                return { shouldCommit: false, reason: 'No changes detected', significance: 'NONE' };
            }
            await execAsync('git add .', { cwd: workspacePath });
            const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });
            const decision = await (0, ai_1.makeCommitDecisionWithAI)(stagedDiff, status);
            return {
                shouldCommit: decision.shouldCommit,
                reason: decision.reason,
                significance: decision.significance
            };
        }
        catch (error) {
            logger_1.default.error('AI analysis failed: ' + (error instanceof Error ? error.message : String(error)));
            return { shouldCommit: true, reason: 'AI analysis failed, defaulting to commit', significance: 'MEDIUM' };
        }
        finally {
            this.activityLogger.setAiAnalysisInProgress(false);
        }
    }
    /**
     * Analyze changes with intelligent criteria (threshold and completeness)
     */
    async analyzeChangesWithIntelligentCriteria(workspacePath, threshold, requireCompleteness) {
        try {
            this.activityLogger.setAiAnalysisInProgress(true);
            const { stdout: diff } = await execAsync('git diff', { cwd: workspacePath });
            const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });
            if (!diff.trim() && !status.trim()) {
                return {
                    shouldCommit: false,
                    reason: 'No changes detected',
                    significance: 'NONE',
                    completeness: 'complete',
                    changeType: 'none'
                };
            }
            await execAsync('git add .', { cwd: workspacePath });
            const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });
            const decision = await (0, ai_1.makeCommitDecisionWithAI)(stagedDiff, status, threshold, requireCompleteness);
            return {
                shouldCommit: decision.shouldCommit,
                reason: decision.reason,
                significance: decision.significance,
                completeness: decision.completeness,
                changeType: decision.changeType,
                riskLevel: decision.riskLevel,
                suggestedMessage: decision.suggestedMessage
            };
        }
        catch (error) {
            logger_1.default.error('AI analysis failed: ' + (error instanceof Error ? error.message : String(error)));
            return {
                shouldCommit: true,
                reason: 'AI analysis failed, defaulting to commit',
                significance: 'MEDIUM',
                completeness: 'unknown',
                changeType: 'chore'
            };
        }
        finally {
            this.activityLogger.setAiAnalysisInProgress(false);
        }
    }
    async generateCommitMessage(workspacePath, config) {
        try {
            const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });
            if (!status.trim()) {
                return 'feat: automated commit via GitCue';
            }
            await execAsync('git add .', { cwd: workspacePath });
            const { stdout: stagedDiff } = await execAsync('git diff --cached', { cwd: workspacePath });
            const { stdout: unstagedDiff } = await execAsync('git diff', { cwd: workspacePath });
            const commitMessage = await (0, ai_1.generateCommitMessageWithAI)(stagedDiff || unstagedDiff, status);
            return commitMessage || 'feat: automated commit via GitCue';
        }
        catch (error) {
            logger_1.default.error('Commit message generation failed: ' + (error instanceof Error ? error.message : String(error)));
            return 'feat: automated commit via GitCue';
        }
    }
    showCommitPreview(message, status, workspacePath, config) {
        const panel = this.dashboardService.createCommitPreview({ message, status, workspacePath, config }, async (messageData) => {
            switch (messageData.action) {
                case 'commit':
                    await this.executeCommit(messageData.commitMessage, workspacePath, config, messageData.shouldPush);
                    panel.dispose();
                    break;
                case 'cancel':
                    panel.dispose();
                    break;
                case 'edit':
                    const newMessage = await vscode.window.showInputBox({
                        value: messageData.commitMessage,
                        prompt: 'Edit commit message',
                        placeHolder: 'Enter your commit message'
                    });
                    if (newMessage) {
                        panel.webview.postMessage({ action: 'updateMessage', message: newMessage });
                    }
                    break;
            }
        });
    }
    async showBufferNotification(message, status, workspacePath, config, analysis) {
        return new Promise((resolve) => {
            if (this.bufferNotification) {
                this.cancelBufferedCommit();
            }
            this.activityLogger.setPendingCommit(true);
            let timeLeft = config.intelligentCommit?.bufferTimeSeconds || config.bufferTimeSeconds;
            let cancelled = false;
            const panel = this.dashboardService.createBufferNotification({
                message, status, timeLeft, config
            });
            // Enhanced notification message with analysis details
            let notificationMsg = `⏰ GitCue: Committing in ${timeLeft} seconds. Click to cancel.`;
            if (analysis) {
                notificationMsg = `⏰ GitCue: ${analysis.changeType || 'change'} (${analysis.significance || 'medium'}) - Committing in ${timeLeft}s`;
            }
            if (config.enableNotifications) {
                vscode.window.showWarningMessage(`[GitCue] Committing in ${timeLeft} seconds. Click to cancel.`, 'Cancel Commit').then(action => {
                    if (action === 'Cancel Commit') {
                        cancelled = true;
                        clearInterval(timer);
                        panel.dispose();
                        this.bufferNotification = undefined;
                        this.activityLogger.setPendingCommit(false);
                        resolve();
                    }
                });
            }
            const timer = setInterval(() => {
                timeLeft--;
                // Send timer update to webview
                if (!cancelled && timeLeft > 0) {
                    panel.webview.postMessage({
                        action: 'updateTimer',
                        timeLeft: timeLeft
                    });
                }
                if (timeLeft <= 0 || cancelled) {
                    clearInterval(timer);
                    panel.dispose();
                    if (!cancelled) {
                        this.executeCommit(message, workspacePath, config, config.autoPush)
                            .finally(() => {
                            this.activityLogger.setPendingCommit(false);
                            resolve();
                        });
                    }
                    else {
                        this.activityLogger.setPendingCommit(false);
                        resolve();
                    }
                    this.bufferNotification = undefined;
                }
            }, 1000);
            panel.webview.onDidReceiveMessage((msg) => {
                if (msg.action === 'cancel') {
                    cancelled = true;
                    clearInterval(timer);
                    panel.dispose();
                    this.bufferNotification = undefined;
                    this.activityLogger.setPendingCommit(false);
                    if (config.enableNotifications) {
                        vscode.window.showInformationMessage('[GitCue] Commit cancelled');
                    }
                    logger_1.default.info('Commit cancelled by user');
                    resolve();
                }
            });
            panel.onDidDispose(() => {
                if (!cancelled && timeLeft > 0) {
                    cancelled = true;
                    clearInterval(timer);
                    this.bufferNotification = undefined;
                    this.activityLogger.setPendingCommit(false);
                    resolve();
                }
            });
            this.bufferNotification = { panel, timer, cancelled: false };
        });
    }
    async executeCommit(message, workspacePath, config, shouldPush) {
        const maxRetries = 3;
        let retryCount = 0;
        while (retryCount < maxRetries) {
            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `GitCue: Committing changes${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}...`,
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 30, message: 'Adding files...' });
                    await execAsync('git add .', { cwd: workspacePath });
                    progress.report({ increment: 40, message: 'Creating commit...' });
                    await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: workspacePath });
                    if (shouldPush) {
                        progress.report({ increment: 30, message: 'Pushing to remote...' });
                        await execAsync('git push', { cwd: workspacePath });
                    }
                });
                const pushText = shouldPush ? ' and pushed' : '';
                if (config.enableNotifications) {
                    vscode.window.showInformationMessage(`GitCue: Changes committed${pushText} successfully!`);
                }
                logger_1.default.info(`Commit successful: ${message}`);
                // Get metadata if available
                const metadata = this.pendingCommitMetadata;
                if (metadata) {
                    this.activityLogger.setCommitCompleted(message, shouldPush, metadata.changedFiles, metadata.diffSummary, metadata.commitReason, metadata.aiAnalysis, metadata.config);
                    this.pendingCommitMetadata = null;
                }
                else {
                    this.activityLogger.setCommitCompleted(message, shouldPush);
                }
                return;
            }
            catch (error) {
                retryCount++;
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger_1.default.error(`Commit attempt ${retryCount} failed: ${errorMsg}`);
                if (retryCount >= maxRetries) {
                    const action = await vscode.window.showErrorMessage(`GitCue: Commit failed after ${maxRetries} attempts. Please fix the issue manually.`, 'Open Terminal', 'View Output', 'Retry Later');
                    switch (action) {
                        case 'Open Terminal':
                            vscode.commands.executeCommand('gitcue.openInteractiveTerminal');
                            break;
                        case 'View Output':
                            logger_1.default.show();
                            break;
                        case 'Retry Later':
                            setTimeout(() => {
                                this.executeCommit(message, workspacePath, config, shouldPush);
                            }, 5 * 60 * 1000);
                            break;
                    }
                    logger_1.default.error(`Commit failed after ${maxRetries} attempts: ${errorMsg}`);
                    throw error;
                }
                else {
                    const waitTime = Math.pow(2, retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    if (config.enableNotifications) {
                        vscode.window.showWarningMessage(`GitCue: Commit failed, retrying in ${waitTime / 1000}s... (${retryCount}/${maxRetries})`);
                    }
                }
            }
        }
    }
    cancelBufferedCommit() {
        if (this.bufferNotification) {
            this.bufferNotification.cancelled = true;
            clearInterval(this.bufferNotification.timer);
            this.bufferNotification.panel.dispose();
            this.bufferNotification = undefined;
            vscode.window.showInformationMessage('🚫 GitCue: Commit cancelled');
            logger_1.default.info('Commit cancelled by user');
        }
    }
}
exports.CommitService = CommitService;
//# sourceMappingURL=commitService.js.map