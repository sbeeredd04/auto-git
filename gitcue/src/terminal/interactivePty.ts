import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { configManager } from '../utils/config';
import logger from '../utils/logger';
import { generateErrorSuggestion } from '../utils/ai';
import { renderMarkdown } from '../utils/markdown';

interface SessionHistory {
  commands: string[];
  timestamp: number;
}

interface AutoCompleteEntry {
  command: string;
  description?: string;
  type: 'command' | 'file' | 'directory' | 'git' | 'npm';
}

/**
 * GitCue Enhanced Terminal
 * A beautified terminal based on real terminal with AI-powered enhancements
 */
export class GitCuePty implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();
  private terminalProcess?: ChildProcess;
  private currentInput = '';
  private cursorPosition = 0;
  private sessionHistory: string[] = [];
  private historyIndex = -1;
  private workspaceRoot: string;
  private historyFile: string;
  private isAiAnalysisActive = false;
  
  // Auto-complete state
  private autoCompleteEntries: AutoCompleteEntry[] = [];
  private currentSuggestion = '';
  private isShowingSuggestion = false;
  
  // Terminal state
  private currentLine = '';
  private isProcessingCommand = false;
  private lastErrorOutput = '';
  private lastCommand = '';

  // Terminal control sequences
  private readonly CLEAR_LINE = '\r\x1b[K';
  private readonly CURSOR_LEFT = '\x1b[D';
  private readonly CURSOR_RIGHT = '\x1b[C';
  private readonly SAVE_CURSOR = '\x1b[s';
  private readonly RESTORE_CURSOR = '\x1b[u';
  
  // ANSI color codes for UI enhancements
  private readonly colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    translucent: '\x1b[2;37m', // Dim white for auto-complete
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    ai: '\x1b[35m',
    prompt: '\x1b[1;34m',
  };

  readonly onDidWrite = this.writeEmitter.event;
  readonly onDidClose = this.closeEmitter.event;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.historyFile = path.join(os.homedir(), '.gitcue-history.json');
    this.initializeAutoComplete();
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    try {
      await this.loadSessionHistory();
      await this.startTerminalSession();
      this.showWelcomeBanner();
      
      logger.interactiveInfo('Enhanced terminal session started');
    } catch (error) {
      logger.error('Failed to open enhanced terminal', error instanceof Error ? error.message : String(error));
      this.writeEmitter.fire('❌ Failed to start enhanced terminal session\r\n');
      this.closeEmitter.fire(1);
    }
  }

  private async startTerminalSession(): Promise<void> {
    const shell = this.getDefaultShell();
    const shellArgs = this.getShellArgs();

    this.terminalProcess = spawn(shell, shellArgs, {
      cwd: this.workspaceRoot,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
        PS1: '\\[\\e[1;34m\\]gitcue\\[\\e[0m\\]:\\[\\e[1;36m\\]\\w\\[\\e[0m\\]$ ', // Custom prompt
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    if (!this.terminalProcess) {
      throw new Error('Failed to start terminal process');
    }

    // Handle terminal output
    this.terminalProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.handleTerminalOutput(output);
    });

    // Handle terminal errors
    this.terminalProcess.stderr?.on('data', (data: Buffer) => {
      const errorOutput = data.toString();
      this.lastErrorOutput = errorOutput;
      this.writeEmitter.fire(errorOutput);
    });

    // Handle process exit
    this.terminalProcess.on('close', (code) => {
      if (code !== 0 && this.lastCommand && this.lastErrorOutput) {
        this.triggerAiErrorAnalysis(this.lastCommand, this.lastErrorOutput);
      }
      if (code !== null) {
        this.closeEmitter.fire(code);
      }
    });

    this.terminalProcess.on('error', (error) => {
      logger.error('Terminal process error:', error.message);
      this.writeEmitter.fire(`\r\n${this.colors.error}❌ Terminal error: ${error.message}${this.colors.reset}\r\n`);
    });
  }

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }

  private getShellArgs(): string[] {
    if (process.platform === 'win32') {
      return [];
    }
    return ['--login']; // Interactive login shell
  }

  private handleTerminalOutput(output: string): void {
    // Check if this looks like an error (common error patterns)
    if (this.isErrorOutput(output) && this.lastCommand) {
      this.lastErrorOutput = output;
    }
    
    // Pass through the output as-is (normal terminal behavior)
    this.writeEmitter.fire(output);
  }

  private isErrorOutput(output: string): boolean {
    const errorPatterns = [
      /error:/i,
      /failed/i,
      /cannot/i,
      /not found/i,
      /permission denied/i,
      /fatal:/i,
      /usage:/i,
      /invalid/i
    ];
    
    return errorPatterns.some(pattern => pattern.test(output));
  }

  handleInput(data: string): void {
    if (this.isProcessingCommand) {
      return;
    }

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const charCode = char.charCodeAt(0);

      // Handle special key sequences
      if (charCode === 3) { // Ctrl+C
        this.handleCtrlC();
        return;
      }

      if (charCode === 9) { // Tab key
        this.handleTabCompletion();
        continue;
      }

      if (charCode === 13 || charCode === 10) { // Enter
        this.handleEnter();
        return;
      }

      if (charCode === 127 || charCode === 8) { // Backspace
        this.handleBackspace();
        continue;
      }

      // Handle arrow keys
      if (charCode === 27 && i + 2 < data.length) {
        const sequence = data.substring(i, i + 3);
        
        if (sequence === '\x1b[A') { // Up arrow
          this.handleHistoryNavigation('up');
          i += 2;
          continue;
        }
        
        if (sequence === '\x1b[B') { // Down arrow
          this.handleHistoryNavigation('down');
          i += 2;
          continue;
        }

        if (sequence === '\x1b[C') { // Right arrow
          this.handleCursorMove('right');
          i += 2;
          continue;
        }

        if (sequence === '\x1b[D') { // Left arrow
          this.handleCursorMove('left');
          i += 2;
          continue;
        }
      }

      // Handle regular characters
      if (charCode >= 32 && charCode <= 126) {
        this.handleRegularInput(char);
      }
    }
  }

  private handleCtrlC(): void {
    if (this.isAiAnalysisActive) {
      this.isAiAnalysisActive = false;
      this.writeEmitter.fire(`\r\n${this.colors.warning}🛑 AI analysis cancelled${this.colors.reset}\r\n`);
      return;
    }
    
    this.terminalProcess?.stdin?.write('\x03');
  }

  private handleTabCompletion(): void {
    if (!this.currentInput.trim()) return;

    const suggestions = this.getAutoCompleteSuggestions(this.currentInput);
    
    if (suggestions.length === 0) {
      // Pass tab to terminal for normal completion
      this.terminalProcess?.stdin?.write('\t');
      return;
    }

    if (suggestions.length === 1) {
      // Auto-complete with the single suggestion
      const suggestion = suggestions[0];
      const words = this.currentInput.split(' ');
      const lastWord = words[words.length - 1];
      const completion = suggestion.command.substring(lastWord.length);
      
      this.currentInput += completion;
      this.cursorPosition = this.currentInput.length;
      this.writeEmitter.fire(completion);
      this.clearSuggestion();
    } else {
      // Show completion menu
      this.showCompletionMenu(suggestions);
    }
  }

  private handleEnter(): void {
    this.clearSuggestion();
    const command = this.currentInput.trim();
    
    if (command) {
      this.addToHistory(command);
      this.lastCommand = command;
      this.lastErrorOutput = '';
    }

    // Pass enter to terminal
    this.terminalProcess?.stdin?.write('\r\n');
    
    // Reset input state
    this.currentInput = '';
    this.cursorPosition = 0;
    this.historyIndex = -1;
  }

  private handleBackspace(): void {
    if (this.cursorPosition > 0) {
      this.currentInput = this.currentInput.slice(0, this.cursorPosition - 1) + 
                         this.currentInput.slice(this.cursorPosition);
      this.cursorPosition--;
      this.terminalProcess?.stdin?.write('\b \b');
      this.updateAutoCompleteSuggestion();
    }
  }

  private handleHistoryNavigation(direction: 'up' | 'down'): void {
    if (this.sessionHistory.length === 0) return;

    if (direction === 'up') {
      this.historyIndex = Math.min(this.sessionHistory.length - 1, this.historyIndex + 1);
    } else {
      this.historyIndex = Math.max(-1, this.historyIndex - 1);
    }

    // Clear current line
    this.writeEmitter.fire('\r\x1b[K');
    
    // Show history command or empty
    const historyCommand = this.historyIndex >= 0 
      ? this.sessionHistory[this.sessionHistory.length - 1 - this.historyIndex] 
      : '';
    
    this.currentInput = historyCommand;
    this.cursorPosition = this.currentInput.length;
    
    // Let terminal handle the prompt, just send the command
    this.terminalProcess?.stdin?.write('\r' + historyCommand);
  }

  private handleCursorMove(direction: 'left' | 'right'): void {
    if (direction === 'left' && this.cursorPosition > 0) {
      this.cursorPosition--;
      this.terminalProcess?.stdin?.write('\x1b[D');
    } else if (direction === 'right' && this.cursorPosition < this.currentInput.length) {
      this.cursorPosition++;
      this.terminalProcess?.stdin?.write('\x1b[C');
    }
  }

  private handleRegularInput(char: string): void {
    // Insert character at cursor position
    this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                       char + 
                       this.currentInput.slice(this.cursorPosition);
    this.cursorPosition++;
    
    // Pass character to terminal
    this.terminalProcess?.stdin?.write(char);
    
    // Update auto-complete suggestion
    this.updateAutoCompleteSuggestion();
  }

  private updateAutoCompleteSuggestion(): void {
    if (!this.currentInput.trim()) {
      this.clearSuggestion();
      return;
    }

    const suggestions = this.getAutoCompleteSuggestions(this.currentInput);
    
    if (suggestions.length > 0) {
      const words = this.currentInput.split(' ');
      const lastWord = words[words.length - 1];
      const suggestion = suggestions[0];
      
      if (suggestion.command.startsWith(lastWord) && suggestion.command !== lastWord) {
        const completion = suggestion.command.substring(lastWord.length);
        this.showTranslucentSuggestion(completion);
      } else {
        this.clearSuggestion();
      }
    } else {
      this.clearSuggestion();
    }
  }

  private showTranslucentSuggestion(completion: string): void {
    if (this.isShowingSuggestion) {
      this.clearSuggestion();
    }
    
    this.currentSuggestion = completion;
    this.isShowingSuggestion = true;
    
    // Save cursor, show translucent text, restore cursor
    this.writeEmitter.fire(this.SAVE_CURSOR);
    this.writeEmitter.fire(this.colors.translucent + completion + this.colors.reset);
    this.writeEmitter.fire(this.RESTORE_CURSOR);
  }

  private clearSuggestion(): void {
    if (this.isShowingSuggestion && this.currentSuggestion) {
      // Clear the suggestion by overwriting with spaces
      this.writeEmitter.fire(this.SAVE_CURSOR);
      this.writeEmitter.fire(' '.repeat(this.currentSuggestion.length));
      this.writeEmitter.fire(this.RESTORE_CURSOR);
    }
    
    this.currentSuggestion = '';
    this.isShowingSuggestion = false;
  }

  private getAutoCompleteSuggestions(input: string): AutoCompleteEntry[] {
    const words = input.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (!lastWord) return [];

    return this.autoCompleteEntries.filter(entry => 
      entry.command.toLowerCase().startsWith(lastWord)
    ).slice(0, 10); // Limit suggestions
  }

  private showCompletionMenu(suggestions: AutoCompleteEntry[]): void {
    this.writeEmitter.fire('\r\n');
    this.writeEmitter.fire(`${this.colors.info}📋 Available completions:${this.colors.reset}\r\n`);
    
    suggestions.forEach((suggestion, index) => {
      const typeColor = this.getTypeColor(suggestion.type);
      this.writeEmitter.fire(`  ${typeColor}${suggestion.command}${this.colors.reset}`);
      if (suggestion.description) {
        this.writeEmitter.fire(`${this.colors.dim} - ${suggestion.description}${this.colors.reset}`);
      }
      this.writeEmitter.fire('\r\n');
    });
    
    // Redisplay current input
    this.writeEmitter.fire('\r\n');
    this.terminalProcess?.stdin?.write('\r' + this.currentInput);
  }

  private getTypeColor(type: string): string {
    const typeColors = {
      command: this.colors.success,
      file: this.colors.info,
      directory: this.colors.warning,
      git: this.colors.ai,
      npm: this.colors.error
    };
    return typeColors[type] || this.colors.reset;
  }

  private async initializeAutoComplete(): Promise<void> {
    // Initialize common commands
    this.autoCompleteEntries = [
      // Git commands
      { command: 'git', type: 'git', description: 'Git version control' },
      { command: 'git status', type: 'git', description: 'Show repository status' },
      { command: 'git add', type: 'git', description: 'Add files to staging' },
      { command: 'git commit', type: 'git', description: 'Commit changes' },
      { command: 'git push', type: 'git', description: 'Push to remote' },
      { command: 'git pull', type: 'git', description: 'Pull from remote' },
      { command: 'git branch', type: 'git', description: 'Manage branches' },
      { command: 'git checkout', type: 'git', description: 'Switch branches' },
      { command: 'git merge', type: 'git', description: 'Merge branches' },
      { command: 'git log', type: 'git', description: 'Show commit history' },
      
      // Common commands
      { command: 'ls', type: 'command', description: 'List directory contents' },
      { command: 'cd', type: 'command', description: 'Change directory' },
      { command: 'pwd', type: 'command', description: 'Print working directory' },
      { command: 'mkdir', type: 'command', description: 'Create directory' },
      { command: 'touch', type: 'command', description: 'Create file' },
      { command: 'rm', type: 'command', description: 'Remove files' },
      { command: 'cp', type: 'command', description: 'Copy files' },
      { command: 'mv', type: 'command', description: 'Move files' },
      
      // NPM commands
      { command: 'npm', type: 'npm', description: 'Node package manager' },
      { command: 'npm install', type: 'npm', description: 'Install packages' },
      { command: 'npm run', type: 'npm', description: 'Run script' },
      { command: 'npm start', type: 'npm', description: 'Start application' },
      { command: 'npm build', type: 'npm', description: 'Build application' },
      { command: 'npm test', type: 'npm', description: 'Run tests' },
    ];

    // Load project-specific completions
    await this.loadProjectCompletions();
  }

  private async loadProjectCompletions(): Promise<void> {
    try {
      // Load package.json scripts
      const packageJsonPath = path.join(this.workspaceRoot, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent);
      
      if (packageJson.scripts) {
        Object.keys(packageJson.scripts).forEach(script => {
          this.autoCompleteEntries.push({
            command: `npm run ${script}`,
            type: 'npm',
            description: packageJson.scripts[script]
          });
        });
      }
    } catch (error) {
      // Ignore if package.json doesn't exist
    }

    try {
      // Load common files and directories
      const items = await fs.readdir(this.workspaceRoot);
      for (const item of items) {
        const itemPath = path.join(this.workspaceRoot, item);
        const stats = await fs.stat(itemPath);
        
        this.autoCompleteEntries.push({
          command: item,
          type: stats.isDirectory() ? 'directory' : 'file',
          description: stats.isDirectory() ? 'Directory' : 'File'
        });
      }
    } catch (error) {
      // Ignore if can't read directory
    }
  }

  private async triggerAiErrorAnalysis(command: string, errorOutput: string): Promise<void> {
    const config = configManager.getConfig();
    
    if (!config.enableSuggestions || !config.geminiApiKey) {
      return;
    }

    this.isAiAnalysisActive = true;
    
    try {
      this.writeEmitter.fire(`\r\n${this.colors.ai}🤖 Analyzing error with AI...${this.colors.reset}\r\n`);
      this.writeEmitter.fire(`${this.colors.dim}Press Ctrl+C to cancel analysis${this.colors.reset}\r\n`);

      const errorContext = `Command: ${command}\nError: ${errorOutput}`;
      const suggestion = await generateErrorSuggestion(errorContext);
      
      if (!this.isAiAnalysisActive) return;

      // Show AI analysis as overlay
      this.showAiAnalysisOverlay(suggestion);
      
    } catch (error) {
      if (!this.isAiAnalysisActive) return;
      
      this.writeEmitter.fire(`${this.colors.error}❌ AI analysis failed: ${error instanceof Error ? error.message : String(error)}${this.colors.reset}\r\n`);
    } finally {
      this.isAiAnalysisActive = false;
    }
  }

  private showAiAnalysisOverlay(suggestion: string): void {
    // Create a beautiful overlay for AI suggestions
    this.writeEmitter.fire('\r\n');
    this.writeEmitter.fire(`${this.colors.ai}╭─ 🤖 AI Analysis ─────────────────────────────────────────────────────────────╮${this.colors.reset}\r\n`);
    
    // Render markdown with proper formatting
    const rendered = renderMarkdown(suggestion, {
      maxWidth: 76,
      colors: {
        header: this.colors.bright + this.colors.info,
        code: this.colors.success,
        bold: this.colors.bright,
        italic: this.colors.dim,
        list: this.colors.warning,
        quote: this.colors.dim,
        reset: this.colors.reset,
        dim: this.colors.dim
      }
    });
    
    // Add padding to each line
    const lines = rendered.split('\n');
    lines.forEach(line => {
      this.writeEmitter.fire(`${this.colors.ai}│${this.colors.reset} ${line.padEnd(76)} ${this.colors.ai}│${this.colors.reset}\r\n`);
    });
    
    this.writeEmitter.fire(`${this.colors.ai}╰───────────────────────────────────────────────────────────────────────────────╯${this.colors.reset}\r\n`);
    this.writeEmitter.fire(`${this.colors.info}💡 You can run the suggested commands directly in this terminal${this.colors.reset}\r\n\r\n`);
  }

  private showWelcomeBanner(): void {
    const config = configManager.getConfig();
    
    this.writeEmitter.fire('\r\n');
    this.writeEmitter.fire(`${this.colors.bright}${this.colors.info}╭─ 🚀 GitCue Enhanced Terminal ─────────────────────────────────────────────────╮${this.colors.reset}\r\n`);
    this.writeEmitter.fire(`${this.colors.bright}${this.colors.info}│${this.colors.reset}  A beautiful terminal with AI-powered enhancements                           ${this.colors.bright}${this.colors.info}│${this.colors.reset}\r\n`);
    this.writeEmitter.fire(`${this.colors.bright}${this.colors.info}╰───────────────────────────────────────────────────────────────────────────────╯${this.colors.reset}\r\n`);
    this.writeEmitter.fire('\r\n');
    
    this.writeEmitter.fire(`${this.colors.success}✨ Enhanced Features:${this.colors.reset}\r\n`);
    this.writeEmitter.fire(`  • ${this.colors.info}Tab completion${this.colors.reset} with translucent suggestions\r\n`);
    this.writeEmitter.fire(`  • ${this.colors.ai}AI-powered error analysis${this.colors.reset} for failed commands\r\n`);
    this.writeEmitter.fire(`  • ${this.colors.warning}Command history${this.colors.reset} with ↑↓ navigation\r\n`);
    this.writeEmitter.fire(`  • ${this.colors.success}Beautiful UI overlays${this.colors.reset} on standard terminal\r\n`);
    this.writeEmitter.fire('\r\n');
    
    const aiStatus = config.geminiApiKey && config.enableSuggestions 
      ? `${this.colors.success}Enabled${this.colors.reset}` 
      : `${this.colors.error}Disabled${this.colors.reset}`;
    
    this.writeEmitter.fire(`${this.colors.dim}AI Analysis: ${aiStatus} | History: ${this.sessionHistory.length} commands loaded${this.colors.reset}\r\n`);
    this.writeEmitter.fire('\r\n');
  }

  private addToHistory(command: string): void {
    const trimmedCommand = command.trim();
    if (trimmedCommand && trimmedCommand !== this.sessionHistory[this.sessionHistory.length - 1]) {
      this.sessionHistory.push(trimmedCommand);
      
      const config = configManager.getConfig();
      if (this.sessionHistory.length > config.maxHistorySize) {
        this.sessionHistory = this.sessionHistory.slice(-config.maxHistorySize);
      }
      
      this.saveSessionHistory();
    }
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
      this.sessionHistory = [];
    }
  }

  private async saveSessionHistory(): Promise<void> {
    const config = configManager.getConfig();
    
    if (!config.sessionPersistence) return;

    try {
      const historyToSave: SessionHistory = {
        commands: this.sessionHistory.slice(-config.maxHistorySize),
        timestamp: Date.now()
      };
      await fs.writeFile(this.historyFile, JSON.stringify(historyToSave, null, 2));
    } catch (error) {
      logger.debug('Failed to save session history: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  close(): void {
    this.clearSuggestion();
    
    if (this.terminalProcess && !this.terminalProcess.killed) {
      this.terminalProcess.kill();
    }
    
    this.saveSessionHistory().catch(error => {
      logger.debug('Failed to save session history: ' + error.message);
    });
    
    logger.interactiveInfo('Enhanced terminal session closed');
  }
} 