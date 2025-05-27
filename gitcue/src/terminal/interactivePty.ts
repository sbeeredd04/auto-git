import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { configManager } from '../utils/config';
import logger from '../utils/logger';
import { generateErrorSuggestion, formatAISuggestion, formatGitCommand, formatMarkdown, testAIConnection } from '../utils/ai';

interface SessionHistory {
  commands: string[];
  timestamp: number;
}

interface MarkdownElement {
  type: 'text' | 'bold' | 'italic' | 'code' | 'codeblock' | 'header' | 'list';
  content: string;
  language?: string;
}

/**
 * GitCue Interactive Pseudoterminal
 * Provides an AI-powered interactive shell within VS Code
 */
export class GitCuePty implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();
  private process?: ChildProcess;
  private currentInput = '';
  private sessionHistory: string[] = [];
  private historyIndex = -1;
  private isProcessingCommand = false;
  private workspaceRoot: string;
  private historyFile: string;
  private isInAiChatMode = false;
  private isAiAnalysisRunning = false;

  // Terminal control sequences
  private readonly CLEAR_LINE = '\r\x1b[K';
  private readonly CURSOR_UP = '\x1b[A';
  private readonly CURSOR_DOWN = '\x1b[B';
  private readonly BACKSPACE = '\x1b[D \x1b[D';
  
  // ANSI color codes
  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
  };

  // Expose events to VS Code
  readonly onDidWrite = this.writeEmitter.event;
  readonly onDidClose = this.closeEmitter.event;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.historyFile = path.join(os.homedir(), '.gitcue-history.json');
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    try {
      // Load session history
      await this.loadSessionHistory();
      
      // Show welcome message
      this.showWelcomeMessage();
      
      // Show initial prompt
      this.showPrompt();
      
      logger.interactiveInfo('Interactive terminal session started');
      
    } catch (error) {
      logger.error('Failed to open interactive terminal', error instanceof Error ? error.message : String(error));
      this.writeEmitter.fire('❌ Failed to start interactive session\r\n');
      this.closeEmitter.fire(1);
    }
  }

  handleInput(data: string): void {
    if (this.isProcessingCommand) {
      return; // Ignore input while processing
    }

    // Handle special key sequences
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const charCode = char.charCodeAt(0);

      // Handle Ctrl+C
      if (charCode === 3) {
        if (this.isAiAnalysisRunning) {
          this.isAiAnalysisRunning = false;
          this.write('\r\n' + this.colors.yellow + '🤖 Stopping AI analysis...\r\n' + this.colors.reset);
          return;
        }
        if (this.isInAiChatMode) {
          this.isInAiChatMode = false;
          this.write('\r\n' + this.colors.yellow + '🤖 Exiting AI chat mode...\r\n' + this.colors.reset);
          this.showPrompt();
          return;
        }
        this.writeEmitter.fire('\r\n🔄 Exiting GitCue interactive session...\r\n');
        this.closeEmitter.fire(0);
        return;
      }

      // Handle Enter
      if (charCode === 13 || charCode === 10) {
        this.write('\r\n');
        if (this.currentInput.trim()) {
          if (this.isInAiChatMode) {
            this.handleAiChat(this.currentInput.trim());
          } else {
            this.executeCommand(this.currentInput.trim());
          }
        } else {
          this.showPrompt();
        }
        return;
      }

      // Handle Backspace
      if (charCode === 127 || charCode === 8) {
        if (this.currentInput.length > 0) {
          this.currentInput = this.currentInput.slice(0, -1);
          this.write(this.BACKSPACE);
        }
        continue;
      }

      // Handle arrow keys (escape sequences)
      if (charCode === 27 && i + 2 < data.length) {
        const sequence = data.substring(i, i + 3);
        
        if (sequence === '\x1b[A') { // Up arrow
          this.navigateHistory('up');
          i += 2; // Skip the next 2 characters
          continue;
        }
        
        if (sequence === '\x1b[B') { // Down arrow
          this.navigateHistory('down');
          i += 2; // Skip the next 2 characters
          continue;
        }
      }

      // Handle regular printable characters
      if (charCode >= 32 && charCode <= 126) {
        this.currentInput += char;
        this.write(char);
      }
    }
  }

  close(): void {
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
    
    // Save session history
    this.saveSessionHistory().catch(error => {
      logger.debug('Failed to save session history: ' + error.message);
    });
    
    logger.interactiveInfo('Interactive terminal session closed');
  }

  private write(text: string): void {
    this.writeEmitter.fire(text);
  }

  private showWelcomeMessage(): void {
    const config = configManager.getConfig();
    
    this.write('\r\n');
    this.write('╔══════════════════════════════════════════════════════════════════════════════╗\r\n');
    this.write('║                    GitCue AI-Powered Interactive Shell                       ║\r\n');
    this.write('║                              Enhanced Terminal v0.3.4                       ║\r\n');
    this.write('╚══════════════════════════════════════════════════════════════════════════════╝\r\n');
    this.write('\r\n');
    
    this.write(this.colors.bright + this.colors.blue + 'Enhanced Features:\r\n' + this.colors.reset);
    this.write('  • Type any command - executed with clean terminal output\r\n');
    this.write('  • AI-powered error analysis with styled markdown\r\n');
    this.write('  • Session history with ↑↓ arrow key navigation\r\n');
    this.write('  • Persistent command history across sessions\r\n');
    this.write('  • Git command syntax highlighting\r\n');
    this.write('  • Interactive AI chat mode\r\n');
    this.write('  • Use Ctrl+C to exit\r\n');
    this.write('\r\n');
    
    this.write(this.colors.bright + this.colors.green + 'Built-in Commands:\r\n' + this.colors.reset);
    this.write('  • ' + this.colors.cyan + 'history' + this.colors.reset + '                        # Show command history\r\n');
    this.write('  • ' + this.colors.cyan + 'clear' + this.colors.reset + '                          # Clear terminal screen\r\n');
    this.write('  • ' + this.colors.cyan + 'help' + this.colors.reset + '                           # Show available commands\r\n');
    this.write('  • ' + this.colors.cyan + 'config' + this.colors.reset + '                         # Show GitCue configuration\r\n');
    this.write('  • ' + this.colors.cyan + 'ai' + this.colors.reset + '                             # Start AI chat mode\r\n');
    this.write('  • ' + this.colors.cyan + 'test-ai' + this.colors.reset + '                        # Test AI connection\r\n');
    this.write('  • ' + this.colors.cyan + 'exit' + this.colors.reset + '                           # Exit interactive session\r\n');
    this.write('\r\n');
    
    this.write(this.colors.bright + this.colors.yellow + 'Configuration:\r\n' + this.colors.reset);
    this.write(`  • API Key: ${config.geminiApiKey ? this.colors.green + 'Configured' + this.colors.reset : this.colors.red + 'Not Set' + this.colors.reset}\r\n`);
    this.write(`  • AI Suggestions: ${config.enableSuggestions ? this.colors.green + 'Enabled' + this.colors.reset : this.colors.red + 'Disabled' + this.colors.reset}\r\n`);
    this.write(`  • Session Persistence: ${config.sessionPersistence ? this.colors.green + 'Enabled' + this.colors.reset : this.colors.red + 'Disabled' + this.colors.reset}\r\n`);
    
    if (this.sessionHistory.length > 0) {
      this.write('\r\n');
      this.write(this.colors.bright + this.colors.magenta + 'Session history loaded: ' + this.colors.reset + this.sessionHistory.length + ' commands\r\n');
      this.write('Use ↑↓ arrow keys to navigate through previous commands\r\n');
    }
    
    this.write('\r\n');
  }

  private showPrompt(): void {
    const promptText = this.isInAiChatMode 
      ? this.colors.magenta + 'ai-chat>' + this.colors.reset + ' '
      : this.colors.green + 'gitcue> ' + this.colors.reset;
    this.write(promptText);
    this.currentInput = '';
  }

  private navigateHistory(direction: 'up' | 'down'): void {
    if (this.sessionHistory.length === 0) return;

    if (direction === 'up') {
      this.historyIndex = Math.max(0, this.historyIndex - 1);
    } else {
      this.historyIndex = Math.min(this.sessionHistory.length, this.historyIndex + 1);
    }

    // Clear current input
    this.write(this.CLEAR_LINE);
    this.showPrompt();

    // Show history command or empty
    const historyCommand = this.historyIndex < this.sessionHistory.length 
      ? this.sessionHistory[this.historyIndex] 
      : '';
    
    this.currentInput = historyCommand;
    this.write(historyCommand);
  }

  private async executeCommand(command: string): Promise<void> {
    this.isProcessingCommand = true;
    
    // Add to history
    this.addToHistory(command);
    
    // Handle built-in commands
    const [action, ...args] = command.split(' ');
    
    switch (action.toLowerCase()) {
      case 'exit':
      case 'quit':
      case 'q':
        this.write('🔄 Exiting GitCue interactive session...\r\n');
        this.closeEmitter.fire(0);
        return;
        
      case 'help':
        await this.showHelp();
        break;
        
      case 'clear':
        this.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to top
        break;
        
      case 'history':
        await this.showHistory();
        break;
        
      case 'config':
        await this.showConfig();
        break;
        
      case 'ai':
        this.enterAiChatMode();
        break;
        
      case 'test-ai':
        await this.testAI();
        break;
        
      case 'version':
        this.write('GitCue Interactive Terminal v1.0\r\n');
        break;
        
      default:
        await this.executeTerminalCommand(command);
        break;
    }
    
    this.currentInput = '';
    this.historyIndex = this.sessionHistory.length;
    this.isProcessingCommand = false;
    
    this.write('\r\n');
    this.showPrompt();
  }

  private async executeTerminalCommand(command: string): Promise<void> {
    this.write('\r\n');
    
    // Handle directory navigation commands
    if (command.startsWith('cd ')) {
      const newPath = command.substring(3).trim();
      try {
        const targetPath = path.resolve(this.workspaceRoot, newPath);
        await fs.access(targetPath); // Check if directory exists
        this.workspaceRoot = targetPath;
        this.write(this.colors.blue + '🔄 Changed directory to: ' + this.colors.reset + this.colors.cyan + targetPath + this.colors.reset + '\r\n');
        this.showPrompt();
        return;
      } catch (error) {
        const errorMsg = `Directory not found: ${newPath}`;
        this.write(this.colors.red + `❌ Error: ${errorMsg}` + this.colors.reset + '\r\n');
        await this.analyzeError(command, errorMsg);
        this.showPrompt();
        return;
      }
    }

    // Handle pwd command
    if (command === 'pwd') {
      this.write(this.colors.blue + '🔄 Current directory: ' + this.colors.reset + this.colors.cyan + this.workspaceRoot + this.colors.reset + '\r\n');
      this.showPrompt();
      return;
    }

    // Show formatted command if it's a git command
    if (command.startsWith('git ')) {
      const formatted = this.formatGitCommandDisplay(command);
      this.write(this.colors.blue + '🔄 Executing: ' + this.colors.reset + formatted + '\r\n');
    } else {
      this.write(this.colors.blue + '🔄 Executing: ' + this.colors.reset + this.colors.cyan + command + this.colors.reset + '\r\n');
    }
    
    this.write('\r\n');

    try {
      // Execute command using spawn with proper shell
      const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
      const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];
      
      const child = spawn(shell, shellArgs, {
        cwd: this.workspaceRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        this.write(output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        this.write(this.colors.red + output + this.colors.reset);
      });

      const exitCode = await new Promise<number>((resolve) => {
        child.on('close', (code) => resolve(code || 0));
      });

      if (exitCode !== 0) {
        const errorMsg = stderr.trim() || `Command failed with exit code ${exitCode}`;
        this.write(this.colors.red + `\r\n❌ Command failed (exit code ${exitCode})` + this.colors.reset + '\r\n');
        await this.analyzeError(command, errorMsg);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.write(this.colors.red + `\r\n❌ Command execution failed: ${errorMsg}` + this.colors.reset + '\r\n');
      await this.analyzeError(command, errorMsg);
    }

    this.write('\r\n');
    this.showPrompt();
  }

  private formatGitCommandDisplay(command: string): string {
    return command
      .replace(/^git\s+/, this.colors.bright + this.colors.cyan + 'git' + this.colors.reset + ' ')
      .replace(/\s(add|commit|push|pull|status|log|branch|checkout|merge|rebase|reset|diff|show)\s/, ` ${this.colors.bright}$1${this.colors.reset} `)
      .replace(/\s--?([a-zA-Z-]+)/g, ` ${this.colors.yellow}--$1${this.colors.reset}`)
      .replace(/\s-([a-zA-Z])/g, ` ${this.colors.yellow}-$1${this.colors.reset}`);
  }

  private async analyzeError(command: string, errorMessage: string): Promise<void> {
    const config = configManager.getConfig();
    
    // Check if AI analysis is enabled
    if (!config.enableSuggestions) {
      this.write('\r\n' + this.colors.yellow + '⚠️ AI suggestions are disabled in settings' + this.colors.reset + '\r\n');
      return;
    }
    
    if (!config.geminiApiKey) {
      this.write('\r\n' + this.colors.yellow + '⚠️ Gemini API key not configured. Please set it in GitCue settings.' + this.colors.reset + '\r\n');
      return;
    }

    try {
      this.write('\r\n' + this.colors.yellow + '🔄 Analyzing error with AI...' + this.colors.reset + '\r\n');
      this.write(this.colors.dim + 'Press Ctrl+C to stop analysis' + this.colors.reset + '\r\n\r\n');

      this.isAiAnalysisRunning = true;
      logger.debug(`Starting AI analysis for command: ${command}`);
      logger.debug(`Error message: ${errorMessage}`);

      const errorContext = `Command: ${command}\nError: ${errorMessage}`;
      const suggestion = await generateErrorSuggestion(errorContext);
      
      if (!this.isAiAnalysisRunning) {
        this.write(this.colors.yellow + '🛑 Analysis cancelled by user' + this.colors.reset + '\r\n');
        return;
      }

      this.write(this.colors.green + '🔍 Analysis Complete:\r\n' + this.colors.reset);
      this.write(this.colors.dim + '─'.repeat(80) + this.colors.reset + '\r\n\r\n');
      this.renderMarkdown(suggestion);
      this.write('\r\n' + this.colors.dim + '─'.repeat(80) + this.colors.reset + '\r\n');
      this.write(this.colors.cyan + '💡 You can run the suggested commands directly in this terminal!' + this.colors.reset + '\r\n');

    } catch (error) {
      if (!this.isAiAnalysisRunning) return;
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`AI analysis failed: ${errorMsg}`);
      
      this.write(this.colors.red + `\r\n❌ AI analysis failed: ${errorMsg}` + this.colors.reset + '\r\n');
      
      // Provide basic help if AI fails
      this.write('\r\n' + this.colors.bright + '📌 Basic troubleshooting:' + this.colors.reset + '\r\n');
      if (command.startsWith('git ')) {
        this.write('  • Check: ' + this.colors.cyan + 'git status' + this.colors.reset + '\r\n');
        this.write('  • Try: ' + this.colors.cyan + `git --help ${command.split(' ')[1]}` + this.colors.reset + '\r\n');
        this.write('  • Verify repository exists and you have access\r\n');
      } else {
        this.write('  • Check command syntax\r\n');
        this.write('  • Verify paths and permissions\r\n');
        this.write('  • Try running with --help flag\r\n');
      }
    } finally {
      this.isAiAnalysisRunning = false;
    }
  }

  private renderMarkdown(content: string): void {
    this.write(this.colors.dim + '─'.repeat(60) + this.colors.reset + '\r\n');
    
    const lines = content.split('\n');
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    
    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          this.write(this.colors.dim + '└─' + this.colors.reset + '\r\n');
        } else {
          inCodeBlock = true;
          codeBlockLanguage = line.substring(3).trim();
          this.write(this.colors.dim + '┌─ ' + (codeBlockLanguage || 'code') + this.colors.reset + '\r\n');
        }
        continue;
      }
      
      if (inCodeBlock) {
        this.write(this.colors.cyan + '│ ' + line + this.colors.reset + '\r\n');
        continue;
      }
      
      // Handle headers
      if (line.startsWith('###')) {
        this.write(this.colors.bright + this.colors.yellow + line.substring(3).trim() + this.colors.reset + '\r\n');
        continue;
      }
      if (line.startsWith('##')) {
        this.write(this.colors.bright + this.colors.magenta + line.substring(2).trim() + this.colors.reset + '\r\n');
        continue;
      }
      if (line.startsWith('#')) {
        this.write(this.colors.bright + this.colors.blue + line.substring(1).trim() + this.colors.reset + '\r\n');
        continue;
      }
      
      // Handle inline formatting
      line = line
        .replace(/\*\*(.*?)\*\*/g, this.colors.bright + '$1' + this.colors.reset)
        .replace(/\*(.*?)\*/g, this.colors.dim + '$1' + this.colors.reset)
        .replace(/`(.*?)`/g, this.colors.cyan + '$1' + this.colors.reset)
        .replace(/^- (.*)/, '  • $1')
        .replace(/^\d+\. (.*)/, '  $1. $1');
      
      this.write(line + '\r\n');
    }
    
    this.write(this.colors.dim + '─'.repeat(60) + this.colors.reset + '\r\n');
    this.write(this.colors.cyan + '💡 You can run the suggested commands directly in this terminal!' + this.colors.reset + '\r\n');
  }

  private enterAiChatMode(): void {
    this.isInAiChatMode = true;
    this.write('\r\n' + this.colors.bright + this.colors.magenta + '🤖 Entering AI Chat Mode' + this.colors.reset + '\r\n');
    this.write(this.colors.dim + 'Type your questions and get AI-powered answers. Use Ctrl+C to exit chat mode.' + this.colors.reset + '\r\n');
    this.write('\r\n');
  }

  private async handleAiChat(message: string): Promise<void> {
    const config = configManager.getConfig();
    
    if (!config.geminiApiKey) {
      this.write(this.colors.red + '❌ Gemini API key not configured. Please set it in GitCue settings.' + this.colors.reset + '\r\n');
      this.showPrompt();
      return;
    }

    // Check for exit command
    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit' || message.toLowerCase() === 'q') {
      this.isInAiChatMode = false;
      this.write('\r\n' + this.colors.yellow + '🤖 Exiting AI chat mode...\r\n' + this.colors.reset);
      this.showPrompt();
      return;
    }

    this.write('\r\n' + this.colors.yellow + '🤖 Thinking...' + this.colors.reset + '\r\n');

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

      const prompt = `You are an expert Git and development assistant. Provide clear, concise, and actionable responses.
Focus on practical solutions and specific steps. Format your response in markdown with:
- Clear headers for main points
- Code blocks for commands
- Bullet points for steps
- Bold text for important concepts

User Question: ${message}

Remember to:
1. Be precise and to the point
2. Include specific commands when relevant
3. Explain complex concepts simply
4. Provide practical examples
5. Focus on actionable solutions`;

      // Always use gemini-2.0-flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 1000,
          temperature: 0.3,
        }
      });

      this.write('\r\n' + this.colors.green + '🤖 AI Response:' + this.colors.reset + '\r\n');
      this.renderMarkdown(response.text || 'No response generated');

    } catch (error) {
      this.write('\r\n' + this.colors.red + '🤖 AI chat failed:' + this.colors.reset + ' ' + (error instanceof Error ? error.message : String(error)) + '\r\n');
    }

    this.write('\r\n');
    this.write(this.colors.dim + '💡 Type "exit" or press Ctrl+C to return to GitCue mode' + this.colors.reset + '\r\n');
    this.showPrompt();
  }

  private async showHistory(): Promise<void> {
    this.write('\r\n' + this.colors.bright + this.colors.blue + '📚 Command History' + this.colors.reset + '\r\n');
    this.write(this.colors.dim + '─'.repeat(40) + this.colors.reset + '\r\n');
    
    if (this.sessionHistory.length === 0) {
      this.write('No commands in history yet\r\n');
      return;
    }
    
    const recentHistory = this.sessionHistory.slice(-20); // Show last 20 commands
    recentHistory.forEach((cmd, index) => {
      const formattedCmd = cmd.startsWith('git ') ? this.formatGitCommandDisplay(cmd) : this.colors.cyan + cmd + this.colors.reset;
      this.write(`  ${this.colors.gray}•${this.colors.reset} ${formattedCmd}\r\n`);
    });
    
    if (this.sessionHistory.length > 20) {
      this.write(`\r\n... and ${this.sessionHistory.length - 20} more commands\r\n`);
    }
    
    this.write('\r\n' + this.colors.cyan + '💡 Use ↑↓ arrow keys to navigate through history' + this.colors.reset + '\r\n');
  }

  private async showConfig(): Promise<void> {
    const config = configManager.getConfig();
    const configDisplay = configManager.getConfigForDisplay();
    
    this.write('\r\n' + this.colors.bright + this.colors.yellow + '🔧 GitCue Configuration' + this.colors.reset + '\r\n');
    this.write(this.colors.dim + '─'.repeat(40) + this.colors.reset + '\r\n');
    
    Object.entries(configDisplay).forEach(([key, value]) => {
      this.write(`  ${key.padEnd(20)} ${this.colors.cyan}${value}${this.colors.reset}\r\n`);
    });
    
    this.write('\r\n' + this.colors.cyan + '💡 Configure settings in VS Code: Preferences > Settings > GitCue' + this.colors.reset + '\r\n');
  }

  private async showHelp(): Promise<void> {
    this.write('\r\n' + this.colors.bright + this.colors.blue + '🎯 GitCue Interactive Help' + this.colors.reset + '\r\n');
    this.write(this.colors.dim + '─'.repeat(40) + this.colors.reset + '\r\n');
    
    this.write(this.colors.bright + 'Built-in Commands:' + this.colors.reset + '\r\n');
    this.write('  ' + this.colors.cyan + 'history' + this.colors.reset + '                    Show command history\r\n');
    this.write('  ' + this.colors.cyan + 'clear' + this.colors.reset + '                      Clear terminal screen\r\n');
    this.write('  ' + this.colors.cyan + 'config' + this.colors.reset + '                     Show GitCue configuration\r\n');
    this.write('  ' + this.colors.cyan + 'ai' + this.colors.reset + '                         Start AI chat mode\r\n');
    this.write('  ' + this.colors.cyan + 'test-ai' + this.colors.reset + '                        Test AI connection\r\n');
    this.write('  ' + this.colors.cyan + 'version' + this.colors.reset + '                    Show version information\r\n');
    this.write('  ' + this.colors.cyan + 'help' + this.colors.reset + '                       Show this help message\r\n');
    this.write('  ' + this.colors.cyan + 'exit' + this.colors.reset + '                       Exit interactive session\r\n');
    this.write('  ' + this.colors.cyan + 'Ctrl+C' + this.colors.reset + '                     Exit session or AI chat mode\r\n');
    
    this.write('\r\n' + this.colors.bright + 'Example Commands:' + this.colors.reset + '\r\n');
    this.write('  ' + this.colors.cyan + 'git status' + this.colors.reset + '                 Show repository status\r\n');
    this.write('  ' + this.colors.cyan + 'git pull' + this.colors.reset + '                   Pull latest changes\r\n');
    this.write('  ' + this.colors.cyan + 'git log --oneline -10' + this.colors.reset + '      Show recent commits\r\n');
    this.write('  ' + this.colors.cyan + 'ls -la' + this.colors.reset + '                     List directory contents\r\n');
    this.write('  ' + this.colors.cyan + 'pwd' + this.colors.reset + '                        Show current directory\r\n');
    
    this.write('\r\n' + this.colors.bright + 'Features:' + this.colors.reset + '\r\n');
    this.write('  • AI-powered error analysis and suggestions\r\n');
    this.write('  • Interactive AI chat mode for questions\r\n');
    this.write('  • Session history with arrow key navigation\r\n');
    this.write('  • Git command syntax highlighting\r\n');
    this.write('  • Persistent command history across sessions\r\n');
    this.write('  • Clean, formatted terminal output\r\n');
  }

  private addToHistory(command: string): void {
    if (command && command.trim() && command !== this.sessionHistory[this.sessionHistory.length - 1]) {
      this.sessionHistory.push(command.trim());
      
      const config = configManager.getConfig();
      if (this.sessionHistory.length > config.maxHistorySize) {
        this.sessionHistory = this.sessionHistory.slice(-config.maxHistorySize);
      }
    }
    this.historyIndex = this.sessionHistory.length;
  }

  private async loadSessionHistory(): Promise<void> {
    const config = configManager.getConfig();
    
    if (!config.sessionPersistence) {
      this.sessionHistory = [];
      return;
    }

    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      const history: SessionHistory = JSON.parse(data);
      this.sessionHistory = Array.isArray(history.commands) 
        ? history.commands.slice(-config.maxHistorySize) 
        : [];
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty history
      this.sessionHistory = [];
    }
  }

  private async saveSessionHistory(): Promise<void> {
    const config = configManager.getConfig();
    
    if (!config.sessionPersistence) {
      return;
    }

    try {
      const historyToSave: SessionHistory = {
        commands: this.sessionHistory.slice(-config.maxHistorySize),
        timestamp: Date.now()
      };
      await fs.writeFile(this.historyFile, JSON.stringify(historyToSave, null, 2));
    } catch (error) {
      // Silently fail if we can't save history
      logger.debug('Failed to save session history: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private async testAI(): Promise<void> {
    this.write('\r\n' + this.colors.bright + this.colors.blue + '🧪 Testing AI Connection' + this.colors.reset + '\r\n');
    this.write(this.colors.dim + '─'.repeat(40) + this.colors.reset + '\r\n');
    
    const config = configManager.getConfig();
    
    // Check configuration
    this.write('Checking configuration...\r\n');
    if (!config.geminiApiKey) {
      this.write(this.colors.red + '❌ Gemini API key not configured' + this.colors.reset + '\r\n');
      return;
    }
    this.write(this.colors.green + '✅ API key configured' + this.colors.reset + '\r\n');
    
    if (!config.enableSuggestions) {
      this.write(this.colors.yellow + '⚠️ AI suggestions disabled in settings' + this.colors.reset + '\r\n');
      return;
    }
    this.write(this.colors.green + '✅ AI suggestions enabled' + this.colors.reset + '\r\n');
    
    // Test AI connection
    this.write('\r\nTesting AI connection...\r\n');
    try {
      const isWorking = await testAIConnection();
      if (isWorking) {
        this.write(this.colors.green + '✅ AI connection successful!' + this.colors.reset + '\r\n');
        this.write('AI analysis should work properly for failed commands.\r\n');
      } else {
        this.write(this.colors.red + '❌ AI connection failed' + this.colors.reset + '\r\n');
      }
    } catch (error) {
      this.write(this.colors.red + `❌ AI test failed: ${error instanceof Error ? error.message : String(error)}` + this.colors.reset + '\r\n');
    }
  }
} 