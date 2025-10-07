"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITerminalIntegration = void 0;
const config_1 = require("../utils/config");
const ai_1 = require("../utils/ai");
const activityLogger_1 = require("../services/activityLogger");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * AI Integration for GitCue Terminal
 * Handles AI chat, error analysis, and intelligent command suggestions
 */
class AITerminalIntegration {
    isAiChatMode = false;
    isAnalyzing = false;
    activityLogger;
    chatHistory = [];
    constructor() {
        this.activityLogger = activityLogger_1.ActivityLogger.getInstance();
    }
    /**
     * Check if currently in AI chat mode
     */
    isInChatMode() {
        return this.isAiChatMode;
    }
    /**
     * Enter AI chat mode
     */
    enterChatMode() {
        this.isAiChatMode = true;
        this.activityLogger.logActivity('ai_analysis', 'Entered AI chat mode');
        return this.formatWelcomeMessage();
    }
    /**
     * Exit AI chat mode
     */
    exitChatMode() {
        this.isAiChatMode = false;
        this.activityLogger.logActivity('ai_analysis', 'Exited AI chat mode');
        return this.formatOutput('🤖 Exited AI chat mode. Back to terminal.', 'info');
    }
    /**
     * Handle AI chat message
     */
    async handleChatMessage(message) {
        const config = config_1.configManager.getConfig();
        if (!config.geminiApiKey) {
            return this.formatOutput('❌ Gemini API key not configured. Use "config" command to set it up.', 'error');
        }
        // Check for exit commands
        if (this.isExitCommand(message)) {
            return this.exitChatMode();
        }
        try {
            this.isAnalyzing = true;
            this.activityLogger.setAiAnalysisInProgress(true);
            const response = await this.generateChatResponse(message);
            // Store in chat history
            this.chatHistory.push({
                user: message,
                ai: response.content,
                timestamp: Date.now()
            });
            // Keep only last 10 conversations
            if (this.chatHistory.length > 10) {
                this.chatHistory = this.chatHistory.slice(-10);
            }
            return this.formatChatResponse(response);
        }
        catch (error) {
            return this.formatOutput(`❌ AI chat failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
        finally {
            this.isAnalyzing = false;
            this.activityLogger.setAiAnalysisInProgress(false);
        }
    }
    /**
     * Analyze command output for errors and provide suggestions
     */
    async analyzeCommandError(command, output, errorOutput) {
        const config = config_1.configManager.getConfig();
        if (!config.enableSuggestions || !config.geminiApiKey) {
            return { hasError: false };
        }
        // Check if this looks like an error
        const hasError = this.detectError(output, errorOutput);
        if (!hasError) {
            return { hasError: false };
        }
        try {
            this.isAnalyzing = true;
            this.activityLogger.setAiAnalysisInProgress(true);
            this.activityLogger.logActivity('ai_analysis', `Analyzing error for command: ${command}`);
            const errorContext = this.buildErrorContext(command, output, errorOutput);
            const analysis = await (0, ai_1.generateErrorSuggestion)(errorContext);
            const suggestions = this.extractSuggestions(analysis);
            const quickFixes = this.extractQuickFixes(analysis);
            return {
                hasError: true,
                analysis,
                suggestions,
                quickFixes
            };
        }
        catch (error) {
            logger_1.default.error('AI error analysis failed:', error instanceof Error ? error.message : String(error));
            return { hasError: true, analysis: 'AI analysis failed. Please check the error manually.' };
        }
        finally {
            this.isAnalyzing = false;
            this.activityLogger.setAiAnalysisInProgress(false);
        }
    }
    /**
     * Format AI analysis result for terminal display
     */
    formatErrorAnalysis(result) {
        if (!result.hasError || !result.analysis) {
            return '';
        }
        // Use the AI utility's createBox function for better formatting
        const boxedAnalysis = (0, ai_1.createBox)(result.analysis, '🤖 AI Error Analysis');
        let output = '\r\n' + boxedAnalysis + '\r\n';
        // Add quick fixes if available
        if (result.quickFixes && result.quickFixes.length > 0) {
            output += '\r\n' + this.formatOutput('💡 Quick Fixes:', 'info');
            result.quickFixes.forEach((fix, index) => {
                output += `\r\n  ${index + 1}. \x1b[32m${fix}\x1b[0m`;
            });
            output += '\r\n';
        }
        return output;
    }
    /**
     * Test AI connection and return status
     */
    async testConnection() {
        const config = config_1.configManager.getConfig();
        let output = this.formatSeparator('🧪 AI Connection Test', 'info');
        output += '\r\n';
        // Check configuration
        if (!config.geminiApiKey) {
            output += this.formatOutput('❌ Gemini API key not configured', 'error');
            output += '\r\n' + this.formatOutput('Run "config" command to set up your API key', 'info');
            return output;
        }
        output += this.formatOutput('✅ API key configured', 'success');
        output += '\r\n';
        if (!config.enableSuggestions) {
            output += this.formatOutput('⚠️ AI suggestions disabled in settings', 'warning');
            return output;
        }
        output += this.formatOutput('✅ AI suggestions enabled', 'success');
        output += '\r\n';
        // Test actual connection
        output += this.formatOutput('Testing AI connection...', 'info');
        try {
            const isWorking = await (0, ai_1.testAIConnection)();
            if (isWorking) {
                output += '\r\n' + this.formatOutput('✅ AI connection successful!', 'success');
                output += '\r\n' + this.formatOutput('All AI features are working properly.', 'info');
            }
            else {
                output += '\r\n' + this.formatOutput('❌ AI connection failed', 'error');
            }
        }
        catch (error) {
            output += '\r\n' + this.formatOutput(`❌ Connection test failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
        }
        return output;
    }
    formatWelcomeMessage() {
        let output = '\r\n';
        output += this.formatSeparator('🤖 GitCue AI Chat Mode', 'ai');
        output += '\r\n';
        output += this.formatOutput('Welcome to AI Chat! I can help you with:', 'info');
        output += '\r\n  • Git commands and troubleshooting';
        output += '\r\n  • Terminal usage and shell scripting';
        output += '\r\n  • Development workflow optimization';
        output += '\r\n  • Code analysis and suggestions';
        output += '\r\n';
        output += this.formatOutput('Type your questions naturally. Use "exit", "quit", or Ctrl+C to return to terminal.', 'dim');
        output += '\r\n';
        output += this.formatSeparator('', 'dim');
        output += '\r\n';
        return output;
    }
    async generateChatResponse(message) {
        try {
            // Use the enhanced error suggestion system for consistency
            const contextualMessage = `User in AI chat mode asks: ${message}

Provide a helpful, conversational response as GitCue AI assistant. Focus on:
- Terminal and Git workflow help
- Development best practices
- Specific actionable commands when relevant
- Keep response under 200 words
- Use markdown formatting for clarity`;
            const content = await (0, ai_1.generateErrorSuggestion)(contextualMessage);
            return {
                content,
                isError: false,
                suggestions: this.extractSuggestions(content)
            };
        }
        catch (error) {
            return {
                content: `AI chat error: ${error instanceof Error ? error.message : String(error)}`,
                isError: true
            };
        }
    }
    buildChatContext(message) {
        let context = `You are GitCue AI, an expert assistant for Git, terminal, and development workflows. Provide concise, helpful responses under 200 words.

Current user question: ${message}

`;
        // Add recent chat history for context
        if (this.chatHistory.length > 0) {
            context += '\nRecent conversation:\n';
            this.chatHistory.slice(-3).forEach(chat => {
                context += `User: ${chat.user}\nAI: ${chat.ai}\n\n`;
            });
        }
        context += `Provide a direct, actionable response. Use markdown formatting for clarity. Include specific commands when relevant.`;
        return context;
    }
    formatChatResponse(response) {
        if (response.isError) {
            return this.formatOutput(response.content, 'error');
        }
        // Use the AI utility's formatAISuggestion for consistent formatting
        const formatted = (0, ai_1.formatAISuggestion)(response.content);
        // Convert to terminal-friendly format
        const terminalFormatted = formatted
            .replace(/\*\*(.*?)\*\*/g, '\x1b[1m$1\x1b[0m') // Bold
            .replace(/\*(.*?)\*/g, '\x1b[2m$1\x1b[0m') // Italic
            .replace(/`(.*?)`/g, '\x1b[32m$1\x1b[0m') // Code
            .replace(/^#{1,6}\s+(.*)$/gm, '\x1b[1;36m$1\x1b[0m') // Headers
            .replace(/^>\s+(.*)$/gm, '\x1b[2m  $1\x1b[0m') // Blockquotes
            .replace(/^-\s+(.*)$/gm, '\x1b[33m• $1\x1b[0m') // Lists
            .replace(/^\d+\.\s+(.*)$/gm, '\x1b[33m$1\x1b[0m'); // Numbered lists
        return '\r\n' + terminalFormatted + '\r\n';
    }
    detectError(output, errorOutput) {
        const combinedOutput = (output + ' ' + (errorOutput || '')).toLowerCase();
        const errorPatterns = [
            /error:/,
            /failed/,
            /cannot/,
            /not found/,
            /permission denied/,
            /fatal:/,
            /usage:/,
            /invalid/,
            /command not found/,
            /no such file/,
            /access denied/,
            /connection refused/,
            /timeout/
        ];
        return errorPatterns.some(pattern => pattern.test(combinedOutput));
    }
    buildErrorContext(command, output, errorOutput) {
        return `Command: ${command}
Output: ${output}
${errorOutput ? `Error Output: ${errorOutput}` : ''}
Working Directory: ${process.cwd()}

Please analyze this command failure and provide specific, actionable solutions.`;
    }
    extractSuggestions(content) {
        const suggestions = [];
        // Look for numbered lists or bullet points that might be suggestions
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.match(/^\d+\.\s+/) || trimmed.match(/^[\-\*]\s+/)) {
                suggestions.push(trimmed.replace(/^\d+\.\s+/, '').replace(/^[\-\*]\s+/, ''));
            }
        }
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    }
    extractQuickFixes(content) {
        const fixes = [];
        // Look for code blocks that might be commands
        const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
        for (const block of codeBlocks) {
            const code = block.replace(/```\w*\n?/g, '').replace(/```/g, '').trim();
            if (code && code.length < 100) { // Only short commands as quick fixes
                fixes.push(code);
            }
        }
        // Also look for inline code
        const inlineCode = content.match(/`([^`]+)`/g) || [];
        for (const code of inlineCode) {
            const command = code.replace(/`/g, '').trim();
            if (command && command.length < 50) {
                fixes.push(command);
            }
        }
        return fixes.slice(0, 3); // Limit to 3 quick fixes
    }
    isExitCommand(message) {
        const exitCommands = ['exit', 'quit', 'q', 'bye', 'done'];
        return exitCommands.includes(message.toLowerCase().trim());
    }
    formatOutput(text, type = 'info') {
        const colors = {
            info: '\x1b[36m', // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m', // Red
            ai: '\x1b[35m', // Magenta
            dim: '\x1b[2m' // Dim
        };
        return `${colors[type]}${text}\x1b[0m`;
    }
    formatSeparator(title, type = 'info') {
        const colors = {
            info: '\x1b[36m',
            ai: '\x1b[35m',
            dim: '\x1b[2m'
        };
        if (title) {
            const padding = Math.max(0, 76 - title.length);
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return `${colors[type]}${'─'.repeat(leftPad)} ${title} ${'─'.repeat(rightPad)}\x1b[0m`;
        }
        else {
            return `${colors[type]}${'─'.repeat(76)}\x1b[0m`;
        }
    }
    /**
     * Get current analysis status
     */
    getIsAnalyzing() {
        return this.isAnalyzing;
    }
    /**
     * Clear chat history
     */
    clearChatHistory() {
        this.chatHistory = [];
        this.activityLogger.logActivity('ai_analysis', 'Cleared AI chat history');
    }
    /**
     * Get chat history summary
     */
    getChatHistorySummary() {
        if (this.chatHistory.length === 0) {
            return 'No chat history available.';
        }
        let output = this.formatOutput('Recent AI Chat History:', 'info');
        output += '\r\n';
        this.chatHistory.slice(-5).forEach((chat, index) => {
            const time = new Date(chat.timestamp).toLocaleTimeString();
            output += `\r\n${this.formatOutput(`[${time}]`, 'dim')} User: ${chat.user}`;
            output += `\r\n${this.formatOutput('          AI:', 'ai')} ${chat.ai.substring(0, 100)}${chat.ai.length > 100 ? '...' : ''}`;
            output += '\r\n';
        });
        return output;
    }
}
exports.AITerminalIntegration = AITerminalIntegration;
//# sourceMappingURL=aiIntegration.js.map