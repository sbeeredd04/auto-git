import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { configManager } from '../utils/config';
import { ActivityLogger } from '../services/activityLogger';
import { AITerminalIntegration } from './aiIntegration';
import logger from '../utils/logger';

export interface CommandResult {
  output: string;
  handled: boolean;
  shouldExit?: boolean;
}

export interface HistoryEntry {
  command: string;
  timestamp: number;
  success: boolean;
}

/**
 * Built-in terminal commands for GitCue
 */
export class TerminalCommands {
  private activityLogger: ActivityLogger;
  private aiIntegration: AITerminalIntegration;
  private commandHistory: HistoryEntry[] = [];
  private historyFile: string;

  constructor(workspaceRoot: string) {
    this.activityLogger = ActivityLogger.getInstance();
    this.aiIntegration = new AITerminalIntegration();
    this.historyFile = path.join(os.homedir(), '.gitcue-terminal-history.json');
    this.loadHistory();
  }

  /**
   * Check if command is a built-in command
   */
  isBuiltInCommand(command: string): boolean {
    const cmd = command.trim().toLowerCase().split(' ')[0];
    return ['help', 'config', 'history', 'clear', 'exit', 'ai', 'test-ai', 'version'].includes(cmd);
  }

  /**
   * Execute a built-in command
   */
  async executeCommand(command: string): Promise<CommandResult> {
    const trimmedCommand = command.trim();
    const [cmd, ...args] = trimmedCommand.toLowerCase().split(' ');

    // Add to history
    this.addToHistory(trimmedCommand, true);

    switch (cmd) {
      case 'help':
        return { output: await this.showHelp(args), handled: true };
        
      case 'config':
        return { output: await this.showConfig(args), handled: true };
        
      case 'history':
        return { output: await this.showHistory(args), handled: true };
        
      case 'clear':
        return { output: '\x1b[2J\x1b[H', handled: true };
        
      case 'exit':
        return { output: this.formatOutput('👋 Goodbye! Closing GitCue terminal...', 'info'), handled: true, shouldExit: true };
        
      case 'ai':
        return { output: this.aiIntegration.enterChatMode(), handled: true };
        
      case 'test-ai':
        return { output: await this.aiIntegration.testConnection(), handled: true };
        
      case 'version':
        return { output: this.showVersion(), handled: true };
        
      default:
        return { output: '', handled: false };
    }
  }

  /**
   * Handle AI chat message if in chat mode
   */
  async handleAIChat(message: string): Promise<string> {
    if (this.aiIntegration.isInChatMode()) {
      this.addToHistory(message, true);
      return await this.aiIntegration.handleChatMessage(message);
    }
    return '';
  }

  /**
   * Check if currently in AI chat mode
   */
  isInAIMode(): boolean {
    return this.aiIntegration.isInChatMode();
  }

  /**
   * Get AI integration instance
   */
  getAIIntegration(): AITerminalIntegration {
    return this.aiIntegration;
  }

  private async showHelp(args: string[]): Promise<string> {
    const topic = args[0];
    
    if (topic) {
      return this.showTopicHelp(topic);
    }
    
    let output = '\r\n';
    output += this.formatSeparator(' GitCue Terminal Help', 'info');
    output += '\r\n';
    
    output += this.formatOutput('GitCue Enhanced Terminal - AI-Powered Development Assistant', 'info');
    output += '\r\n\r\n';
    
    // Built-in Commands
    output += this.formatOutput(' Built-in Commands:', 'success');
    output += '\r\n';
    output += this.formatCommandHelp('help [topic]', 'Show help information (try: help ai, help git)');
    output += this.formatCommandHelp('config [setting]', 'Show/modify GitCue configuration');
    output += this.formatCommandHelp('ai', 'Enter AI chat mode for assistance');
    output += this.formatCommandHelp('history [count]', 'Show command history');
    output += this.formatCommandHelp('test-ai', 'Test AI connection and features');
    output += this.formatCommandHelp('clear', 'Clear terminal screen');
    output += this.formatCommandHelp('version', 'Show GitCue version information');
    output += this.formatCommandHelp('exit', 'Exit terminal');
    output += '\r\n';
    
    // AI Features
    output += this.formatOutput(' AI Features:', 'ai');
    output += '\r\n';
    output += '  • Automatic error analysis and suggestions\r\n';
    output += '  • Interactive AI chat mode (type "ai")\r\n';
    output += '  • Smart command completion\r\n';
    output += '  • Context-aware help and troubleshooting\r\n';
    output += '\r\n';
    
    // Terminal Features
    output += this.formatOutput('✨ Enhanced Features:', 'warning');
    output += '\r\n';
    output += '  • Tab completion with translucent suggestions\r\n';
    output += '  • Command history with ↑↓ navigation\r\n';
    output += '  • Real shell integration (bash/zsh/cmd)\r\n';
    output += '  • Cross-platform compatibility\r\n';
    output += '  • Session persistence\r\n';
    output += '\r\n';
    
    // Usage Tips
    output += this.formatOutput(' Usage Tips:', 'info');
    output += '\r\n';
    output += '  • Use Tab for command completion\r\n';
    output += '  • Press ↑↓ arrows to navigate command history\r\n';
    output += '  • Failed commands automatically trigger AI analysis\r\n';
    output += '  • Type "ai" for interactive AI assistance\r\n';
    output += '  • Use Ctrl+C to cancel operations or exit AI mode\r\n';
    output += '\r\n';
    
    output += this.formatSeparator('', 'dim');
    output += '\r\n';
    
    return output;
  }

  private showTopicHelp(topic: string): string {
    switch (topic.toLowerCase()) {
      case 'ai':
        return this.showAIHelp();
      case 'git':
        return this.showGitHelp();
      case 'config':
        return this.showConfigHelp();
      case 'completion':
        return this.showCompletionHelp();
      default:
        return this.formatOutput(` Unknown help topic: ${topic}. Try: help, help ai, help git, help config`, 'error');
    }
  }

  private showAIHelp(): string {
    let output = '\r\n';
    output += this.formatSeparator(' AI Features Help', 'ai');
    output += '\r\n';
    
    output += this.formatOutput('AI Chat Mode:', 'ai');
    output += '\r\n';
    output += '  • Type "ai" to enter interactive chat mode\r\n';
    output += '  • Ask questions about Git, terminal, development\r\n';
    output += '  • Get contextual help and troubleshooting\r\n';
    output += '  • Type "exit" or Ctrl+C to return to terminal\r\n';
    output += '\r\n';
    
    output += this.formatOutput('Automatic Error Analysis:', 'warning');
    output += '\r\n';
    output += '  • Failed commands automatically trigger AI analysis\r\n';
    output += '  • Get specific solutions and quick fixes\r\n';
    output += '  • Press Ctrl+C to cancel analysis\r\n';
    output += '\r\n';
    
    output += this.formatOutput('Example AI Interactions:', 'info');
    output += '\r\n';
    output += '  "How do I undo my last commit?"\r\n';
    output += '  "What does this Git error mean?"\r\n';
    output += '  "Help me write a better commit message"\r\n';
    output += '  "How to resolve merge conflicts?"\r\n';
    output += '\r\n';
    
    return output;
  }

  private showGitHelp(): string {
    let output = '\r\n';
    output += this.formatSeparator('📝 Git Integration Help', 'success');
    output += '\r\n';
    
    output += this.formatOutput('Common Git Commands:', 'success');
    output += '\r\n';
    output += this.formatCommandHelp('git status', 'Check repository status');
    output += this.formatCommandHelp('git add .', 'Stage all changes');
    output += this.formatCommandHelp('git commit -m "message"', 'Commit with message');
    output += this.formatCommandHelp('git push', 'Push to remote repository');
    output += this.formatCommandHelp('git pull', 'Pull from remote repository');
    output += this.formatCommandHelp('git branch', 'List branches');
    output += this.formatCommandHelp('git checkout [branch]', 'Switch branches');
    output += '\r\n';
    
    output += this.formatOutput('Git Troubleshooting:', 'warning');
    output += '\r\n';
    output += '  • Failed Git commands trigger automatic AI analysis\r\n';
    output += '  • Get specific solutions for common Git issues\r\n';
    output += '  • Ask AI: "ai" then describe your Git problem\r\n';
    output += '\r\n';
    
    return output;
  }

  private showConfigHelp(): string {
    let output = '\r\n';
    output += this.formatSeparator(' Configuration Help', 'warning');
    output += '\r\n';
    
    const config = configManager.getConfig();
    
    output += this.formatOutput('Current Configuration:', 'info');
    output += '\r\n';
    output += this.formatConfigItem('API Key', config.geminiApiKey ? 'Configured ✓' : 'Not Set ');
    output += this.formatConfigItem('AI Suggestions', config.enableSuggestions ? 'Enabled ✓' : 'Disabled ');
    output += this.formatConfigItem('Commit Mode', config.commitMode);
    output += this.formatConfigItem('Auto Push', config.autoPush ? 'Enabled' : 'Disabled');
    output += this.formatConfigItem('Buffer Time', `${config.bufferTimeSeconds}s`);
    output += '\r\n';
    
    output += this.formatOutput('Configuration Commands:', 'warning');
    output += '\r\n';
    output += '  • config                 - Show all settings\r\n';
    output += '  • config api-key         - Show API key status\r\n';
    output += '  • config open            - Open VS Code settings\r\n';
    output += '\r\n';
    
    output += this.formatOutput('Setup API Key:', 'info');
    output += '\r\n';
    output += '  1. Get API key from Google AI Studio\r\n';
    output += '  2. Open VS Code settings (Ctrl/Cmd + ,)\r\n';
    output += '  3. Search for "GitCue API Key"\r\n';
    output += '  4. Paste your API key\r\n';
    output += '\r\n';
    
    return output;
  }

  private showCompletionHelp(): string {
    let output = '\r\n';
    output += this.formatSeparator('⚡ Auto-Completion Help', 'info');
    output += '\r\n';
    
    output += this.formatOutput('Tab Completion Features:', 'info');
    output += '\r\n';
    output += '  • Press Tab to complete commands\r\n';
    output += '  • Translucent suggestions appear as you type\r\n';
    output += '  • Completions include:\r\n';
    output += '    - Built-in GitCue commands\r\n';
    output += '    - Git commands and options\r\n';
    output += '    - System commands (ls, cd, etc.)\r\n';
    output += '    - NPM scripts from package.json\r\n';
    output += '    - Project files and directories\r\n';
    output += '\r\n';
    
    output += this.formatOutput('Completion Tips:', 'warning');
    output += '\r\n';
    output += '  • Start typing and see suggestions appear\r\n';
    output += '  • Press Tab to accept the top suggestion\r\n';
    output += '  • Multiple matches show a selection menu\r\n';
    output += '  • Completions are context-aware and prioritized\r\n';
    output += '\r\n';
    
    return output;
  }

  private async showConfig(args: string[]): Promise<string> {
    const option = args[0];
    
    if (option === 'open') {
      vscode.commands.executeCommand('workbench.action.openSettings', '@ext:sbeeredd04.gitcue');
      return this.formatOutput('📝 Opening GitCue settings in VS Code...', 'info');
    }
    
    if (option === 'api-key') {
      const config = configManager.getConfig();
      const status = config.geminiApiKey ? 'Configured ✓' : 'Not Set ';
      return this.formatOutput(`API Key Status: ${status}`, config.geminiApiKey ? 'success' : 'error');
    }
    
    // Show full configuration
    let output = '\r\n';
    output += this.formatSeparator(' GitCue Configuration', 'warning');
    output += '\r\n';
    
    const config = configManager.getConfig();
    const displayConfig = configManager.getConfigForDisplay();
    
    output += this.formatOutput('Current Settings:', 'info');
    output += '\r\n';
    
    Object.entries(displayConfig).forEach(([key, value]) => {
      output += this.formatConfigItem(key, value);
    });
    
    output += '\r\n';
    
    // Status indicators
    output += this.formatOutput('Feature Status:', 'success');
    output += '\r\n';
    output += this.formatConfigItem('AI Features', config.geminiApiKey && config.enableSuggestions ? ' Ready' : ' Needs Setup');
    output += this.formatConfigItem('File Watching', this.activityLogger.getWatchStatus().isWatching ? ' Active' : '⏸️ Inactive');
    output += this.formatConfigItem('Auto Commits', config.commitMode === 'intelligent' ? ' AI-Powered' : ' Time-Based');
    output += '\r\n';
    
    output += this.formatOutput(' Use "config open" to modify settings in VS Code', 'dim');
    output += '\r\n';
    output += this.formatSeparator('', 'dim');
    output += '\r\n';
    
    return output;
  }

  private async showHistory(args: string[]): Promise<string> {
    const count = args[0] ? parseInt(args[0], 10) : 20;
    
    let output = '\r\n';
    output += this.formatSeparator('📚 Command History', 'info');
    output += '\r\n';
    
    if (this.commandHistory.length === 0) {
      output += this.formatOutput('No command history available yet.', 'dim');
      output += '\r\n';
      return output;
    }
    
    const recentHistory = this.commandHistory.slice(-count).reverse();
    
    output += this.formatOutput(`Showing last ${recentHistory.length} commands:`, 'info');
    output += '\r\n\r\n';
    
    recentHistory.forEach((entry, index) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const status = entry.success ? '' : '';
      const number = String(this.commandHistory.length - index).padStart(3, ' ');
      
      output += `${this.formatOutput(number, 'dim')} ${status} ${this.formatOutput(`[${time}]`, 'dim')} ${entry.command}\r\n`;
    });
    
    output += '\r\n';
    output += this.formatOutput(` Total commands in history: ${this.commandHistory.length}`, 'dim');
    output += '\r\n';
    output += this.formatOutput('Use ↑↓ arrows to navigate through history', 'dim');
    output += '\r\n';
    
    return output;
  }

  private showVersion(): string {
    const version = vscode.extensions.getExtension('sbeeredd04.gitcue')?.packageJSON.version || '1.0.0';
    const nodeVersion = process.version;
    const platform = `${os.type()} ${os.release()}`;
    
    let output = '\r\n';
    output += this.formatSeparator('📦 Version Information', 'info');
    output += '\r\n';
    
    output += this.formatConfigItem('GitCue Extension', `v${version}`);
    output += this.formatConfigItem('Node.js', nodeVersion);
    output += this.formatConfigItem('Platform', platform);
    output += this.formatConfigItem('VS Code API', vscode.version);
    output += '\r\n';
    
    output += this.formatOutput(' GitCue Terminal - AI-Powered Development Assistant', 'success');
    output += '\r\n';
    output += this.formatOutput('Built with ❤️ for developers', 'dim');
    output += '\r\n';
    
    return output;
  }

  private formatCommandHelp(command: string, description: string): string {
    const cmd = command.padEnd(25);
    return `  ${this.formatOutput(cmd, 'success')}${description}\r\n`;
  }

  private formatConfigItem(key: string, value: string): string {
    const keyFormatted = key.padEnd(20);
    return `  ${this.formatOutput(keyFormatted, 'info')}${this.formatOutput(value, 'success')}\r\n`;
  }

  private formatOutput(text: string, type: 'info' | 'success' | 'warning' | 'error' | 'ai' | 'dim' = 'info'): string {
    const colors = {
      info: '\x1b[36m',      // Cyan
      success: '\x1b[32m',   // Green
      warning: '\x1b[33m',   // Yellow
      error: '\x1b[31m',     // Red
      ai: '\x1b[35m',        // Magenta
      dim: '\x1b[2m'         // Dim
    };
    
    return `${colors[type]}${text}\x1b[0m`;
  }

  private formatSeparator(title: string, type: 'info' | 'success' | 'warning' | 'error' | 'ai' | 'dim' = 'info'): string {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      ai: '\x1b[35m',
      dim: '\x1b[2m'
    };
    
    if (title) {
      const padding = Math.max(0, 76 - title.length);
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      
      return `${colors[type]}${'─'.repeat(leftPad)} ${title} ${'─'.repeat(rightPad)}\x1b[0m`;
    } else {
      return `${colors[type]}${'─'.repeat(76)}\x1b[0m`;
    }
  }

  private addToHistory(command: string, success: boolean): void {
    const entry: HistoryEntry = {
      command: command.trim(),
      timestamp: Date.now(),
      success
    };
    
    // Don't add duplicate consecutive commands
    const lastEntry = this.commandHistory[this.commandHistory.length - 1];
    if (!lastEntry || lastEntry.command !== entry.command) {
      this.commandHistory.push(entry);
      
      // Keep only last 1000 entries
      if (this.commandHistory.length > 1000) {
        this.commandHistory = this.commandHistory.slice(-1000);
      }
      
      this.saveHistory();
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed)) {
        this.commandHistory = parsed.slice(-1000); // Keep only last 1000
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty history
      this.commandHistory = [];
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      await fs.writeFile(this.historyFile, JSON.stringify(this.commandHistory, null, 2));
    } catch (error) {
      logger.debug('Failed to save command history: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  /**
   * Get command history for arrow key navigation
   */
  getCommandHistory(): string[] {
    return this.commandHistory.map(entry => entry.command);
  }

  /**
   * Mark command as failed in history
   */
  markLastCommandFailed(): void {
    if (this.commandHistory.length > 0) {
      this.commandHistory[this.commandHistory.length - 1].success = false;
      this.saveHistory();
    }
  }
} 