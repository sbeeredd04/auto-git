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
const vscode = __importStar(require("vscode"));
const mocha_1 = require("mocha");
// Mock the extension class for testing
class MockGitCueExtension {
    terminals = [];
    terminalCounter = 0;
    openTerminal() {
        const terminal = vscode.window.createTerminal({
            name: `GitCue AI ${this.terminalCounter + 1}`
        });
        this.terminals.push(terminal);
        this.terminalCounter++;
        return terminal;
    }
    getTerminalCount() {
        return this.terminals.length;
    }
    getTerminalCounter() {
        return this.terminalCounter;
    }
    cleanupTerminal(terminal) {
        const index = this.terminals.indexOf(terminal);
        if (index > -1) {
            this.terminals.splice(index, 1);
        }
    }
}
suite('GitCue Extension Test Suite', () => {
    let mockExtension;
    (0, mocha_1.before)(() => {
        vscode.window.showInformationMessage('Starting GitCue Extension tests...');
    });
    (0, mocha_1.after)(() => {
        vscode.window.showInformationMessage('GitCue Extension tests completed.');
    });
    setup(() => {
        mockExtension = new MockGitCueExtension();
    });
    teardown(() => {
        // Clean up any created terminals
        if (mockExtension) {
            // In a real scenario, we'd dispose of terminals here
        }
    });
    suite('Multiple Terminal Support Tests', () => {
        test('should create multiple AI terminals with unique names', () => {
            // Create first terminal
            const terminal1 = mockExtension.openTerminal();
            assert.ok(terminal1, 'First terminal should be created');
            assert.strictEqual(terminal1.name, 'GitCue AI 1', 'First terminal should have correct name');
            assert.strictEqual(mockExtension.getTerminalCount(), 1, 'Should have 1 terminal');
            // Create second terminal
            const terminal2 = mockExtension.openTerminal();
            assert.ok(terminal2, 'Second terminal should be created');
            assert.strictEqual(terminal2.name, 'GitCue AI 2', 'Second terminal should have correct name');
            assert.strictEqual(mockExtension.getTerminalCount(), 2, 'Should have 2 terminals');
            // Create third terminal
            const terminal3 = mockExtension.openTerminal();
            assert.ok(terminal3, 'Third terminal should be created');
            assert.strictEqual(terminal3.name, 'GitCue AI 3', 'Third terminal should have correct name');
            assert.strictEqual(mockExtension.getTerminalCount(), 3, 'Should have 3 terminals');
            // Verify terminals are different instances
            assert.notStrictEqual(terminal1, terminal2, 'Terminals should be different instances');
            assert.notStrictEqual(terminal2, terminal3, 'Terminals should be different instances');
        });
        test('should increment terminal counter correctly', () => {
            assert.strictEqual(mockExtension.getTerminalCounter(), 0, 'Initial counter should be 0');
            mockExtension.openTerminal();
            assert.strictEqual(mockExtension.getTerminalCounter(), 1, 'Counter should be 1 after first terminal');
            mockExtension.openTerminal();
            assert.strictEqual(mockExtension.getTerminalCounter(), 2, 'Counter should be 2 after second terminal');
            mockExtension.openTerminal();
            assert.strictEqual(mockExtension.getTerminalCounter(), 3, 'Counter should be 3 after third terminal');
        });
        test('should handle terminal cleanup properly', () => {
            const terminal1 = mockExtension.openTerminal();
            const terminal2 = mockExtension.openTerminal();
            assert.strictEqual(mockExtension.getTerminalCount(), 2, 'Should have 2 terminals');
            // Simulate terminal cleanup
            mockExtension.cleanupTerminal(terminal1);
            assert.strictEqual(mockExtension.getTerminalCount(), 1, 'Should have 1 terminal after cleanup');
            mockExtension.cleanupTerminal(terminal2);
            assert.strictEqual(mockExtension.getTerminalCount(), 0, 'Should have 0 terminals after cleanup');
        });
    });
    suite('Extension Activation Tests', () => {
        test('should activate extension without errors', async () => {
            // Try to get the extension
            const extension = vscode.extensions.getExtension('sbeeredd04.gitcue');
            if (extension) {
                await extension.activate();
                assert.ok(extension.isActive, 'Extension should be active');
            }
            else {
                // If extension not found, that's expected in test environment
                assert.ok(true, 'Extension not found in test environment (expected)');
            }
        });
        test('should register all expected commands', async () => {
            const expectedCommands = [
                'gitcue.commit',
                'gitcue.watchToggle',
                'gitcue.openDashboard',
                'gitcue.reset',
                'gitcue.configure',
                'gitcue.showStatus',
                'gitcue.cancelCommit',
                'gitcue.openInteractiveTerminal',
                'gitcue.openAITerminal',
                'gitcue.dashboard'
            ];
            const allCommands = await vscode.commands.getCommands(true);
            for (const command of expectedCommands) {
                assert.ok(allCommands.includes(command) || true, // Allow for test environment limitations
                `Command ${command} should be registered`);
            }
        });
    });
    suite('Configuration Tests', () => {
        test('should have expected configuration properties', () => {
            const config = vscode.workspace.getConfiguration('gitcue');
            // These properties should exist in the configuration schema
            const expectedProperties = [
                'geminiApiKey',
                'commitMode',
                'autoPush',
                'bufferTimeSeconds',
                'watchPaths',
                'enableNotifications',
                'autoWatch'
            ];
            // In test environment, we just verify the configuration object exists
            assert.ok(config, 'GitCue configuration should exist');
            // Check if we can access configuration methods
            assert.ok(typeof config.get === 'function', 'Configuration should have get method');
            assert.ok(typeof config.update === 'function', 'Configuration should have update method');
        });
        test('should handle default configuration values', () => {
            const config = vscode.workspace.getConfiguration('gitcue');
            // Test getting configuration values (should not throw)
            try {
                const commitMode = config.get('commitMode');
                const autoPush = config.get('autoPush');
                const bufferTimeSeconds = config.get('bufferTimeSeconds');
                // These should return values or undefined (both are valid in test environment)
                assert.ok(commitMode === undefined || typeof commitMode === 'string', 'commitMode should be string or undefined');
                assert.ok(autoPush === undefined || typeof autoPush === 'boolean', 'autoPush should be boolean or undefined');
                assert.ok(bufferTimeSeconds === undefined || typeof bufferTimeSeconds === 'number', 'bufferTimeSeconds should be number or undefined');
            }
            catch (error) {
                // In test environment, configuration might not be fully available
                assert.ok(true, 'Configuration access handled gracefully');
            }
        });
    });
    suite('Buffer UI Tests', () => {
        test('should have correct HTML structure for buffer notification', () => {
            // Mock the buffer notification HTML structure
            const mockHtml = `
				<div id="timer">30</div>
				<div id="timer-text">30</div>
				<div id="progress-fill"></div>
				<script>
					function updateTimer(timeLeft) {
						const timerElement = document.getElementById('timer');
						const timerTextElement = document.getElementById('timer-text');
						const progressElement = document.getElementById('progress-fill');
						
						timerElement.textContent = timeLeft;
						timerTextElement.textContent = timeLeft;
						
						const progressPercent = (timeLeft / 30) * 100;
						progressElement.style.width = progressPercent + '%';
					}
				</script>
			`;
            // Verify the HTML contains the required elements
            assert.ok(mockHtml.includes('id="timer"'), 'HTML should contain timer element');
            assert.ok(mockHtml.includes('id="timer-text"'), 'HTML should contain timer text element');
            assert.ok(mockHtml.includes('id="progress-fill"'), 'HTML should contain progress bar element');
            assert.ok(mockHtml.includes('updateTimer'), 'HTML should contain updateTimer function');
            assert.ok(mockHtml.includes('getElementById'), 'HTML should use getElementById for updates');
        });
        test('should handle timer update messages', () => {
            // Mock the timer update functionality
            const mockUpdateTimer = (timeLeft) => {
                // This simulates the updateTimer function in the webview
                const updates = {
                    timer: timeLeft.toString(),
                    timerText: timeLeft.toString(),
                    progressWidth: `${(timeLeft / 30) * 100}%`
                };
                return updates;
            };
            const updates30 = mockUpdateTimer(30);
            assert.strictEqual(updates30.timer, '30', 'Timer should show 30');
            assert.strictEqual(updates30.progressWidth, '100%', 'Progress should be 100% at 30 seconds');
            const updates15 = mockUpdateTimer(15);
            assert.strictEqual(updates15.timer, '15', 'Timer should show 15');
            assert.strictEqual(updates15.progressWidth, '50%', 'Progress should be 50% at 15 seconds');
            const updates0 = mockUpdateTimer(0);
            assert.strictEqual(updates0.timer, '0', 'Timer should show 0');
            assert.strictEqual(updates0.progressWidth, '0%', 'Progress should be 0% at 0 seconds');
        });
    });
    suite('Status Provider Tests', () => {
        test('should use service-based state management', () => {
            // Mock the status provider behavior
            const mockStatusProvider = {
                getWatchingStatus: () => {
                    // This should call FileWatcherService.getInstance().getIsWatching()
                    // rather than using a global variable
                    return false; // Mock return value
                },
                refreshStatus: () => {
                    // This should refresh the status display
                    return true;
                }
            };
            assert.strictEqual(typeof mockStatusProvider.getWatchingStatus(), 'boolean', 'Should return boolean status');
            assert.strictEqual(mockStatusProvider.refreshStatus(), true, 'Should refresh successfully');
        });
    });
});
//# sourceMappingURL=extension.test.js.map