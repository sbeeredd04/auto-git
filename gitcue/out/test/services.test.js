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
const assert = __importStar(require("assert"));
const dashboardService_1 = require("../services/dashboardService");
const fileWatcherService_1 = require("../services/fileWatcherService");
const commitService_1 = require("../services/commitService");
const activityLogger_1 = require("../services/activityLogger");
const statusProvider_1 = require("../services/statusProvider");
suite('GitCue Services Test Suite', () => {
    let dashboardService;
    let fileWatcherService;
    let commitService;
    let activityLogger;
    let statusProvider;
    setup(() => {
        dashboardService = dashboardService_1.DashboardService.getInstance();
        fileWatcherService = fileWatcherService_1.FileWatcherService.getInstance();
        commitService = commitService_1.CommitService.getInstance();
        activityLogger = activityLogger_1.ActivityLogger.getInstance();
        statusProvider = new statusProvider_1.GitCueStatusProvider();
    });
    suite('DashboardService Tests', () => {
        test('should create dashboard panel', () => {
            const onMessage = (message) => { };
            const panel = dashboardService.createDashboard(onMessage);
            assert.ok(panel, 'Panel should be created');
            assert.strictEqual(panel.title, 'GitCue Dashboard');
            assert.strictEqual(panel.webview.options.enableScripts, true);
            panel.dispose();
        });
        test('should create buffer notification with timer elements', () => {
            const options = {
                message: 'Test commit message',
                status: 'M file1.txt\nM file2.txt',
                timeLeft: 30,
                config: {
                    geminiApiKey: 'test-key',
                    commitMode: 'intelligent',
                    autoPush: true,
                    watchPaths: ['**/*.ts'],
                    debounceMs: 2000,
                    bufferTimeSeconds: 30,
                    maxCallsPerMinute: 10,
                    enableNotifications: true,
                    autoWatch: false,
                    interactiveOnError: false,
                    enableSuggestions: true,
                    terminalVerbose: false,
                    sessionPersistence: false,
                    maxHistorySize: 100,
                    intelligentCommit: {
                        commitThreshold: 'medium',
                        minTimeBetweenCommits: 1800000,
                        activitySettleTime: 300000,
                        requireCompleteness: true,
                        bufferTimeSeconds: 30,
                        cancelOnNewChanges: true
                    }
                }
            };
            const panel = dashboardService.createBufferNotification(options);
            assert.ok(panel, 'Buffer notification panel should be created');
            assert.strictEqual(panel.title, '⏰ GitCue Commit Buffer');
            assert.ok(panel.webview.html.includes('id="timer"'), 'HTML should contain timer element');
            assert.ok(panel.webview.html.includes('id="timer-text"'), 'HTML should contain timer text element');
            assert.ok(panel.webview.html.includes('id="progress-fill"'), 'HTML should contain progress bar element');
            assert.ok(panel.webview.html.includes('updateTimer'), 'HTML should contain updateTimer function');
            panel.dispose();
        });
        test('should create commit preview panel', () => {
            const options = {
                message: 'Test commit message',
                status: 'M file1.txt\nM file2.txt',
                workspacePath: '/test/path',
                config: {
                    geminiApiKey: 'test-key',
                    commitMode: 'intelligent',
                    autoPush: true,
                    watchPaths: ['**/*.ts'],
                    debounceMs: 2000,
                    bufferTimeSeconds: 30,
                    maxCallsPerMinute: 10,
                    enableNotifications: true,
                    autoWatch: false,
                    interactiveOnError: false,
                    enableSuggestions: true,
                    terminalVerbose: false,
                    sessionPersistence: false,
                    maxHistorySize: 100,
                    intelligentCommit: {
                        commitThreshold: 'medium',
                        minTimeBetweenCommits: 1800000,
                        activitySettleTime: 300000,
                        requireCompleteness: true,
                        bufferTimeSeconds: 30,
                        cancelOnNewChanges: true
                    }
                }
            };
            const onMessage = (message) => { };
            const panel = dashboardService.createCommitPreview(options, onMessage);
            assert.ok(panel, 'Commit preview panel should be created');
            assert.strictEqual(panel.title, 'GitCue: Commit Preview');
            panel.dispose();
        });
        test('should update multiple dashboards', () => {
            const onMessage = (message) => { };
            const panel1 = dashboardService.createDashboard(onMessage);
            const panel2 = dashboardService.createDashboard(onMessage);
            const state = {
                isWatching: true,
                config: {
                    geminiApiKey: 'test-key',
                    commitMode: 'intelligent',
                    autoPush: true,
                    watchPaths: ['**/*.ts'],
                    debounceMs: 2000,
                    bufferTimeSeconds: 30,
                    maxCallsPerMinute: 10,
                    enableNotifications: true,
                    autoWatch: false,
                    interactiveOnError: false,
                    enableSuggestions: true,
                    terminalVerbose: false,
                    sessionPersistence: false,
                    maxHistorySize: 100,
                    intelligentCommit: {
                        commitThreshold: 'medium',
                        minTimeBetweenCommits: 1800000,
                        activitySettleTime: 300000,
                        requireCompleteness: true,
                        bufferTimeSeconds: 30,
                        cancelOnNewChanges: true
                    }
                },
                watchStatus: {
                    isWatching: true,
                    filesChanged: 2,
                    lastChange: 'now',
                    lastCommit: 'never',
                    pendingCommit: false,
                    aiAnalysisInProgress: false,
                    activityHistory: [],
                    changedFiles: new Set()
                }
            };
            // This should not throw an error
            dashboardService.updateDashboards(state);
            panel1.dispose();
            panel2.dispose();
        });
    });
    suite('FileWatcherService Tests', () => {
        test('should initialize with correct state', () => {
            assert.strictEqual(fileWatcherService.getIsWatching(), false, 'Should not be watching initially');
        });
        test('should be singleton', () => {
            const instance1 = fileWatcherService_1.FileWatcherService.getInstance();
            const instance2 = fileWatcherService_1.FileWatcherService.getInstance();
            assert.strictEqual(instance1, instance2, 'Should return same instance');
        });
        test('should track watching state correctly', () => {
            const initialState = fileWatcherService.getIsWatching();
            assert.strictEqual(typeof initialState, 'boolean', 'Should return boolean');
        });
    });
    suite('CommitService Tests', () => {
        test('should be singleton', () => {
            const instance1 = commitService_1.CommitService.getInstance();
            const instance2 = commitService_1.CommitService.getInstance();
            assert.strictEqual(instance1, instance2, 'Should return same instance');
        });
        test('should handle buffer notification cancellation', () => {
            // This should not throw an error
            commitService.cancelBufferedCommit();
        });
    });
    suite('ActivityLogger Tests', () => {
        test('should be singleton', () => {
            const instance1 = activityLogger_1.ActivityLogger.getInstance();
            const instance2 = activityLogger_1.ActivityLogger.getInstance();
            assert.strictEqual(instance1, instance2, 'Should return same instance');
        });
        test('should provide watch status', () => {
            const watchStatus = activityLogger.getWatchStatus();
            assert.ok(watchStatus, 'Should return watch status object');
            assert.strictEqual(typeof watchStatus.isWatching, 'boolean');
            assert.strictEqual(typeof watchStatus.filesChanged, 'number');
            assert.strictEqual(typeof watchStatus.lastChange, 'string');
            assert.strictEqual(typeof watchStatus.lastCommit, 'string');
            assert.strictEqual(typeof watchStatus.pendingCommit, 'boolean');
        });
        test('should handle activity logging', () => {
            // This should not throw an error
            activityLogger.logActivity('file_change', 'Test activity', 'Test details');
        });
    });
    suite('GitCueStatusProvider Tests', () => {
        test('should get root status items', async () => {
            const items = await statusProvider.getChildren();
            assert.ok(Array.isArray(items), 'Should return array of items');
            assert.ok(items.length > 0, 'Should have status items');
            // Check for expected status items
            const statusLabels = items.map(item => item.label);
            assert.ok(statusLabels.some(label => label.includes('Status:')), 'Should have watching status');
            assert.ok(statusLabels.some(label => label.includes('Files Changed:')), 'Should have files changed count');
            assert.ok(statusLabels.some(label => label.includes('Commit Mode:')), 'Should have commit mode');
            assert.ok(statusLabels.some(label => label.includes('API Key:')), 'Should have API key status');
        });
        test('should use FileWatcherService for status', async () => {
            const items = await statusProvider.getChildren();
            const statusItem = items.find(item => item.label.includes('Status:'));
            assert.ok(statusItem, 'Should have status item');
            // The status should reflect the actual FileWatcherService state
            const isWatching = fileWatcherService.getIsWatching();
            const expectedStatus = isWatching ? 'Watching' : 'Idle';
            assert.ok(statusItem.label.includes(expectedStatus), `Status should be ${expectedStatus}`);
        });
        test('should refresh without errors', () => {
            // This should not throw an error
            statusProvider.refresh();
        });
    });
});
//# sourceMappingURL=services.test.js.map