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
exports.logger = exports.ExtensionLogger = void 0;
const vscode = __importStar(require("vscode"));
/**
 * VS Code Extension Logger for GitCue
 * Provides logging functionality adapted for VS Code environment
 */
class ExtensionLogger {
    outputChannel;
    verbose = false;
    constructor(channelName = 'GitCue') {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }
    /**
     * Set verbose mode for detailed logging
     */
    setVerbose(verbose = true) {
        this.verbose = verbose;
    }
    /**
     * Show the output channel
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * Clear the output channel
     */
    clear() {
        this.outputChannel.clear();
    }
    /**
     * Success message
     */
    success(message, details) {
        const content = details
            ? `[SUCCESS] ${message}\n   ${details}`
            : `[SUCCESS] ${message}`;
        this.outputChannel.appendLine(content);
        this.outputChannel.appendLine('');
    }
    /**
     * Error message
     */
    error(message, details) {
        const content = details
            ? `[ERROR] ${message}\n   ${details}`
            : `[ERROR] ${message}`;
        this.outputChannel.appendLine(content);
        this.outputChannel.appendLine('');
    }
    /**
     * Warning message
     */
    warning(message, details) {
        const content = details
            ? `[WARNING] ${message}\n   ${details}`
            : `[WARNING] ${message}`;
        this.outputChannel.appendLine(content);
        this.outputChannel.appendLine('');
    }
    /**
     * Info message
     */
    info(message, title = 'INFO') {
        this.outputChannel.appendLine(`[${title}] ${message}`);
    }
    /**
     * Debug message (only shown in verbose mode)
     */
    debug(message) {
        if (this.verbose) {
            this.outputChannel.appendLine(`[DEBUG] ${message}`);
        }
    }
    /**
     * Status update
     */
    status(message, type = 'info') {
        const prefixes = {
            info: '[INFO]',
            success: '[SUCCESS]',
            warning: '[WARNING]',
            error: '[ERROR]',
            processing: '[PROCESSING]'
        };
        const prefix = prefixes[type] || '[INFO]';
        this.outputChannel.appendLine(`${prefix} ${message}`);
    }
    /**
     * Section header
     */
    section(title, subtitle) {
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine('═'.repeat(60));
        this.outputChannel.appendLine(`[SECTION] ${title.toUpperCase()}`);
        if (subtitle) {
            this.outputChannel.appendLine(`   ${subtitle}`);
        }
        this.outputChannel.appendLine('═'.repeat(60));
        this.outputChannel.appendLine('');
    }
    /**
     * Configuration display
     */
    config(title, items) {
        this.outputChannel.appendLine(`[CONFIG] ${title}`);
        this.outputChannel.appendLine('─'.repeat(40));
        Object.entries(items).forEach(([key, value]) => {
            const displayValue = typeof value === 'boolean'
                ? (value ? 'Yes' : 'No')
                : String(value);
            this.outputChannel.appendLine(`  ${key.padEnd(20)} ${displayValue}`);
        });
        this.outputChannel.appendLine('');
    }
    /**
     * File change notification
     */
    fileChange(event, path) {
        this.outputChannel.appendLine(`[FILE] ${event} → ${path}`);
    }
    /**
     * Processing stage indicator
     */
    stage(message, type = 'info') {
        const prefixes = {
            info: '[INFO]',
            success: '[SUCCESS]',
            error: '[ERROR]',
            processing: '[PROCESSING]'
        };
        const prefix = prefixes[type] || '[INFO]';
        this.outputChannel.appendLine(`${prefix} ${message}`);
    }
    /**
     * Blank line for spacing
     */
    space() {
        this.outputChannel.appendLine('');
    }
    /**
     * Simple divider line
     */
    divider() {
        this.outputChannel.appendLine('─'.repeat(60));
    }
    /**
     * Commit summary display
     */
    commitSummary(message, hasRemote) {
        const operation = hasRemote ? 'Committed and Pushed' : 'Committed (Local Only)';
        this.outputChannel.appendLine('');
        this.outputChannel.appendLine(`[COMMIT] ${operation}`);
        this.outputChannel.appendLine(`[MESSAGE] ${message}`);
        this.outputChannel.appendLine('');
    }
    /**
     * Interactive session info
     */
    interactiveInfo(message) {
        this.outputChannel.appendLine(`[TERMINAL] ${message}`);
    }
    /**
     * AI suggestion info
     */
    aiSuggestion(message) {
        this.outputChannel.appendLine(`[AI] ${message}`);
    }
    /**
     * Dispose the output channel
     */
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.ExtensionLogger = ExtensionLogger;
// Export singleton instance
exports.logger = new ExtensionLogger('GitCue');
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map