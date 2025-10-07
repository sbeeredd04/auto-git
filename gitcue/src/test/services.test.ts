import * as assert from 'assert';
import * as vscode from 'vscode';
import { DashboardService } from '../services/dashboardService';
import { FileWatcherService } from '../services/fileWatcherService';
import { CommitService } from '../services/commitService';
import { ActivityLogger } from '../services/activityLogger';
import { GitCueStatusProvider } from '../services/statusProvider';

suite('GitCue Services Test Suite', () => {
    let dashboardService: DashboardService;
    let fileWatcherService: FileWatcherService;
    let commitService: CommitService;
    let activityLogger: ActivityLogger;
    let statusProvider: GitCueStatusProvider;

    setup(() => {
        dashboardService = DashboardService.getInstance();
        fileWatcherService = FileWatcherService.getInstance();
        commitService = CommitService.getInstance();
        activityLogger = ActivityLogger.getInstance();
        statusProvider = new GitCueStatusProvider();
    });

    suite('DashboardService Tests', () => {
        test('should create dashboard panel', () => {
            const onMessage = (message: any) => {};
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
                    commitMode: 'intelligent' as const,
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
                        commitThreshold: 'medium' as const,
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
                    commitMode: 'intelligent' as const,
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
                        commitThreshold: 'medium' as const,
                        minTimeBetweenCommits: 1800000,
                        activitySettleTime: 300000,
                        requireCompleteness: true,
                        bufferTimeSeconds: 30,
                        cancelOnNewChanges: true
                    }
                }
            };

            const onMessage = (message: any) => {};
            const panel = dashboardService.createCommitPreview(options, onMessage);
            
            assert.ok(panel, 'Commit preview panel should be created');
            assert.strictEqual(panel.title, 'GitCue: Commit Preview');
            
            panel.dispose();
        });

        test('should update multiple dashboards', () => {
            const onMessage = (message: any) => {};
            const panel1 = dashboardService.createDashboard(onMessage);
            const panel2 = dashboardService.createDashboard(onMessage);
            
            const state = {
                isWatching: true,
                config: {
                    geminiApiKey: 'test-key',
                    commitMode: 'intelligent' as const,
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
                        commitThreshold: 'medium' as const,
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
                    changedFiles: new Set<string>()
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
            const instance1 = FileWatcherService.getInstance();
            const instance2 = FileWatcherService.getInstance();
            assert.strictEqual(instance1, instance2, 'Should return same instance');
        });

        test('should track watching state correctly', () => {
            const initialState = fileWatcherService.getIsWatching();
            assert.strictEqual(typeof initialState, 'boolean', 'Should return boolean');
        });
    });

    suite('CommitService Tests', () => {
        test('should be singleton', () => {
            const instance1 = CommitService.getInstance();
            const instance2 = CommitService.getInstance();
            assert.strictEqual(instance1, instance2, 'Should return same instance');
        });

        test('should handle buffer notification cancellation', () => {
            // This should not throw an error
            commitService.cancelBufferedCommit();
        });
    });

    suite('ActivityLogger Tests', () => {
        test('should be singleton', () => {
            const instance1 = ActivityLogger.getInstance();
            const instance2 = ActivityLogger.getInstance();
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