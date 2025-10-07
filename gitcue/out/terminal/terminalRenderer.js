"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalRenderer = void 0;
/**
 * Terminal output renderer with enhanced formatting and visual features
 */
class TerminalRenderer {
    defaultColors = {
        primary: '\x1b[1;34m', // Bright blue
        secondary: '\x1b[36m', // Cyan
        success: '\x1b[32m', // Green
        error: '\x1b[31m', // Red
        warning: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        ai: '\x1b[35m', // Magenta
        dim: '\x1b[2m', // Dim
        translucent: '\x1b[2;37m', // Dim white for suggestions
        reset: '\x1b[0m' // Reset
    };
    controlSequences = {
        clearLine: '\r\x1b[K',
        clearScreen: '\x1b[2J\x1b[H',
        saveCursor: '\x1b[s',
        restoreCursor: '\x1b[u',
        cursorUp: '\x1b[A',
        cursorDown: '\x1b[B',
        cursorLeft: '\x1b[D',
        cursorRight: '\x1b[C',
        hideCursor: '\x1b[?25l',
        showCursor: '\x1b[?25h'
    };
    /**
     * Render welcome message with branding
     */
    renderWelcome() {
        const version = '2.0.0'; // Update as needed
        let output = '\r\n';
        // Main header with gradient effect
        output += this.renderBorder('╭─ 🚀 GitCue Enhanced Terminal ─────────────────────────────────────────────╮', 'primary');
        output += this.renderBorder('│  AI-Powered Development Terminal with Smart Completion                    │', 'info');
        output += this.renderBorder(`│  Version ${version} • Press Ctrl+C to exit                                     │`, 'dim');
        output += this.renderBorder('╰───────────────────────────────────────────────────────────────────────────╯', 'primary');
        output += '\r\n';
        // Feature highlights
        output += this.colorize('✨ Enhanced Features:', 'success') + '\r\n';
        output += '  • ' + this.colorize('Tab completion', 'info') + ' with translucent suggestions\r\n';
        output += '  • ' + this.colorize('AI-powered error analysis', 'ai') + ' for failed commands\r\n';
        output += '  • ' + this.colorize('Interactive AI chat', 'ai') + ' mode (type "ai")\r\n';
        output += '  • ' + this.colorize('Command history', 'warning') + ' with ↑↓ navigation\r\n';
        output += '  • ' + this.colorize('Real shell integration', 'success') + ' (bash/zsh/cmd)\r\n';
        output += '\r\n';
        // Quick start
        output += this.colorize('🚀 Quick Start:', 'primary') + '\r\n';
        output += '  • Type ' + this.colorize('help', 'success') + ' for command reference\r\n';
        output += '  • Type ' + this.colorize('ai', 'ai') + ' for interactive AI assistance\r\n';
        output += '  • Use ' + this.colorize('Tab', 'warning') + ' for auto-completion\r\n';
        output += '\r\n';
        return output;
    }
    /**
     * Render translucent completion suggestion
     */
    renderTranslucentSuggestion(completion, currentInput) {
        if (!completion)
            return '';
        // Calculate the completion suffix
        const words = currentInput.trim().split(/\s+/);
        const lastWord = words[words.length - 1] || '';
        if (completion.toLowerCase().startsWith(lastWord.toLowerCase())) {
            const suffix = completion.substring(lastWord.length);
            return this.controlSequences.saveCursor +
                this.colorize(suffix, 'translucent') +
                this.controlSequences.restoreCursor;
        }
        return '';
    }
    /**
     * Clear translucent suggestion
     */
    clearTranslucentSuggestion(suggestionLength) {
        if (suggestionLength <= 0)
            return '';
        return this.controlSequences.saveCursor +
            ' '.repeat(suggestionLength) +
            this.controlSequences.restoreCursor;
    }
    /**
     * Render completion menu with enhanced formatting
     */
    renderCompletionMenu(suggestions, options = {}) {
        const opts = {
            maxSuggestions: 10,
            showDescriptions: true,
            showIcons: true,
            groupByType: false,
            ...options
        };
        if (suggestions.length === 0)
            return '';
        let output = '\r\n';
        output += this.colorize('📋 Available completions:', 'info') + '\r\n';
        output += this.renderSeparator(40, 'dim') + '\r\n';
        const displaySuggestions = suggestions.slice(0, opts.maxSuggestions);
        if (opts.groupByType) {
            output += this.renderGroupedSuggestions(displaySuggestions, opts);
        }
        else {
            output += this.renderLinearSuggestions(displaySuggestions, opts);
        }
        if (suggestions.length > opts.maxSuggestions) {
            const remaining = suggestions.length - opts.maxSuggestions;
            output += this.colorize(`... and ${remaining} more suggestions`, 'dim') + '\r\n';
        }
        output += this.renderSeparator(40, 'dim') + '\r\n';
        output += this.colorize('💡 Press Tab to complete, Esc to cancel', 'dim') + '\r\n';
        return output;
    }
    /**
     * Render error with enhanced formatting
     */
    renderError(message, command) {
        let output = '\r\n';
        output += this.renderBorder('╭─ ❌ Command Error ─────────────────────────────────────────────────────────╮', 'error');
        if (command) {
            output += this.renderBorder(`│ Command: ${command.padEnd(63)} │`, 'dim');
        }
        // Split message into lines and format
        const lines = message.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                const paddedLine = line.substring(0, 65).padEnd(65);
                output += this.renderBorder(`│ ${paddedLine} │`, 'error');
            }
        });
        output += this.renderBorder('╰───────────────────────────────────────────────────────────────────────────────╯', 'error');
        output += '\r\n';
        return output;
    }
    /**
     * Render AI analysis result
     */
    renderAIAnalysis(analysis, quickFixes) {
        let output = '\r\n';
        output += this.renderBorder('╭─ 🤖 AI Analysis ─────────────────────────────────────────────────────────────╮', 'ai');
        output += '\r\n';
        // Format analysis text with word wrapping
        const analysisLines = this.wrapText(analysis, 74);
        analysisLines.forEach(line => {
            output += `${this.colorize('│', 'ai')} ${line.padEnd(74)} ${this.colorize('│', 'ai')}\r\n`;
        });
        // Add quick fixes if available
        if (quickFixes && quickFixes.length > 0) {
            output += this.renderBorder('├─ 💡 Quick Fixes ─────────────────────────────────────────────────────────────┤', 'ai');
            quickFixes.forEach((fix, index) => {
                const fixText = `${index + 1}. ${fix}`;
                const fixLines = this.wrapText(fixText, 72);
                fixLines.forEach((line, lineIndex) => {
                    const prefix = lineIndex === 0 ? '' : '   ';
                    const fullLine = prefix + line;
                    output += `${this.colorize('│', 'ai')} ${this.colorize(fullLine.padEnd(74), 'success')} ${this.colorize('│', 'ai')}\r\n`;
                });
            });
        }
        output += this.renderBorder('╰───────────────────────────────────────────────────────────────────────────────╯', 'ai');
        output += '\r\n';
        output += this.colorize('💡 You can run the suggested commands directly in this terminal', 'info') + '\r\n';
        return output;
    }
    /**
     * Render progress indicator
     */
    renderProgress(message, percentage) {
        let output = this.controlSequences.clearLine;
        output += this.colorize('⏳ ', 'warning');
        output += this.colorize(message, 'info');
        if (percentage !== undefined) {
            const barLength = 20;
            const filled = Math.floor((percentage / 100) * barLength);
            const empty = barLength - filled;
            output += ' [';
            output += this.colorize('█'.repeat(filled), 'success');
            output += this.colorize('░'.repeat(empty), 'dim');
            output += `] ${percentage}%`;
        }
        else {
            output += '...';
        }
        return output;
    }
    /**
     * Render status indicator
     */
    renderStatus(status, message) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        const colors = {
            success: 'success',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };
        return this.colorize(icons[status], colors[status]) + ' ' +
            this.colorize(message, colors[status]);
    }
    /**
     * Render command prompt with custom styling
     */
    renderPrompt(workingDir, isAIMode = false) {
        if (isAIMode) {
            return this.colorize('🤖 ai-chat> ', 'ai');
        }
        let prompt = this.colorize('GitCue', 'primary');
        if (workingDir) {
            const shortDir = this.shortenPath(workingDir);
            prompt += this.colorize(':', 'dim') + this.colorize(shortDir, 'secondary');
        }
        prompt += this.colorize('$ ', 'primary');
        return prompt;
    }
    renderGroupedSuggestions(suggestions, options) {
        const groups = this.groupSuggestionsByType(suggestions);
        let output = '';
        Object.entries(groups).forEach(([type, entries]) => {
            if (entries.length === 0)
                return;
            output += this.colorize(`${this.getTypeIcon(type)} ${type.toUpperCase()}:`, 'warning') + '\r\n';
            entries.forEach(entry => {
                output += '  ' + this.renderSingleSuggestion(entry, options);
            });
            output += '\r\n';
        });
        return output;
    }
    renderLinearSuggestions(suggestions, options) {
        let output = '';
        suggestions.forEach((suggestion, index) => {
            output += `  ${String(index + 1).padStart(2)}. `;
            output += this.renderSingleSuggestion(suggestion, options);
        });
        return output;
    }
    renderSingleSuggestion(suggestion, options) {
        let output = '';
        if (options.showIcons) {
            output += this.getTypeIcon(suggestion.type) + ' ';
        }
        const color = this.getTypeColor(suggestion.type);
        output += this.colorize(suggestion.command, color);
        if (options.showDescriptions && suggestion.description) {
            output += this.colorize(` - ${suggestion.description}`, 'dim');
        }
        output += '\r\n';
        return output;
    }
    groupSuggestionsByType(suggestions) {
        const groups = {};
        suggestions.forEach(suggestion => {
            if (!groups[suggestion.type]) {
                groups[suggestion.type] = [];
            }
            groups[suggestion.type].push(suggestion);
        });
        return groups;
    }
    getTypeColor(type) {
        const colorMap = {
            builtin: 'ai',
            ai: 'primary'
        };
        return colorMap[type] || 'info';
    }
    getTypeIcon(type) {
        const iconMap = {
            builtin: '🔧',
            ai: '🤖'
        };
        return iconMap[type] || '•';
    }
    renderBorder(text, colorType) {
        return this.colorize(text, colorType) + '\r\n';
    }
    renderSeparator(length, colorType) {
        return this.colorize('─'.repeat(length), colorType);
    }
    colorize(text, colorType) {
        return this.defaultColors[colorType] + text + this.defaultColors.reset;
    }
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if (currentLine.length + word.length + 1 <= maxWidth) {
                currentLine += (currentLine ? ' ' : '') + word;
            }
            else {
                if (currentLine)
                    lines.push(currentLine);
                currentLine = word;
            }
        });
        if (currentLine)
            lines.push(currentLine);
        return lines;
    }
    shortenPath(fullPath) {
        const maxLength = 30;
        if (fullPath.length <= maxLength) {
            return fullPath;
        }
        const parts = fullPath.split(/[/\\]/);
        if (parts.length <= 2) {
            return fullPath;
        }
        // Show first and last parts with ellipsis
        const first = parts[0];
        const last = parts[parts.length - 1];
        const shortened = `${first}/.../${last}`;
        return shortened.length <= maxLength ? shortened : `.../${last}`;
    }
    /**
     * Get control sequences for external use
     */
    getControlSequences() {
        return this.controlSequences;
    }
    /**
     * Get color codes for external use
     */
    getColors() {
        return this.defaultColors;
    }
}
exports.TerminalRenderer = TerminalRenderer;
//# sourceMappingURL=terminalRenderer.js.map