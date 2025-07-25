import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { configManager } from '../utils/config';
import logger from '../utils/logger';
import { ActivityLogger } from '../services/activityLogger';

// Import helper classes
import { TerminalBase, TerminalIO } from './terminalBase';
import { AutoCompleteEngine, CompletionResult } from './autoComplete';
import { AITerminalIntegration, ErrorAnalysisResult } from './aiIntegration';
import { TerminalCommands, CommandResult } from './terminalCommands';
import { TerminalRenderer } from './terminalRenderer';

interface SessionHistory {
  commands: string[];
  timestamp: number;
}

/**
 * GitCue Enhanced Terminal - AI-Powered Development Terminal
 * Combines real shell functionality with intelligent AI assistance
 */
export class GitCuePty implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  private closeEmitter = new vscode.EventEmitter<number>();
  
  // Core components
  private terminalBase!: TerminalBase;
  private autoComplete!: AutoCompleteEngine;
  private aiIntegration!: AITerminalIntegration;
  private commands!: TerminalCommands;
  private renderer!: TerminalRenderer;
  private activityLogger: ActivityLogger;
  
  // Input/output management
  private currentInput = '';
  private cursorPosition = 0;
  private currentSuggestion = '';
  private isShowingSuggestion = false;
  
  // History management
  private sessionHistory: string[] = [];
  private historyIndex = -1;
  private historyFile: string;
  
  // State management
  private workspaceRoot: string;
  private isProcessingCommand = false;
  private lastCommand = '';
  private lastOutput = '';
  private lastErrorOutput = '';

  // Events
  readonly onDidWrite = this.writeEmitter.event;
  readonly onDidClose = this.closeEmitter.event;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.historyFile = path.join(os.homedir(), '.gitcue-enhanced-history.json');
    
    // Initialize services
    this.activityLogger = ActivityLogger.getInstance();
    
    // Initialize helper components
    this.setupComponents();
  }

  async open(initialDimensions: vscode.TerminalDimensions | undefined): Promise<void> {
    try {
      // Load session history
      await this.loadSessionHistory();
      
      // Start the underlying shell
      const started = await this.terminalBase.startShell();
      if (!started) {
        throw new Error('Failed to start underlying shell process');
      }
      
      // Show welcome message
      this.write(this.renderer.renderWelcome());
      
      logger.interactiveInfo('GitCue Enhanced Terminal started successfully');
      this.activityLogger.logActivity('watch_start', 'Enhanced terminal session started');
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Failed to open enhanced terminal:', errorMsg);
      this.write('❌ Failed to start GitCue Enhanced Terminal: ' + errorMsg + '\r\n');
      this.closeEmitter.fire(1);
    }
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

  close(): void {
    this.clearSuggestion();
    
    // Dispose components
    this.terminalBase.dispose();
    
    // Save session history
    this.saveSessionHistory().catch(error => {
      logger.debug('Failed to save session history: ' + (error instanceof Error ? error.message : String(error)));
    });
    
    this.activityLogger.logActivity('watch_stop', 'Enhanced terminal session closed');
    logger.interactiveInfo('GitCue Enhanced Terminal closed');
  }

  private setupComponents(): void {
    // Setup terminal I/O interface
    const terminalIO: TerminalIO = {
      write: (data: string) => this.write(data),
      onData: (callback: (data: string) => void) => {
        // This would be used for intercepting shell output if needed
      }
    };
    
    // Initialize all helper components
    this.terminalBase = new TerminalBase(terminalIO, this.workspaceRoot);
    this.autoComplete = new AutoCompleteEngine(this.workspaceRoot);
    this.aiIntegration = new AITerminalIntegration();
    this.commands = new TerminalCommands(this.workspaceRoot);
    this.renderer = new TerminalRenderer();
  }

  private handleCtrlC(): void {
    if (this.aiIntegration.getIsAnalyzing()) {
      // Cancel AI analysis
      this.write('\r\n' + this.renderer.renderStatus('warning', 'AI analysis cancelled by user') + '\r\n');
      return;
    }
    
    if (this.aiIntegration.isInChatMode()) {
      // Exit AI chat mode
      const exitMessage = this.aiIntegration.exitChatMode();
      this.write('\r\n' + exitMessage + '\r\n');
      return;
    }
    
    // Pass Ctrl+C to shell or exit
    if (this.terminalBase.isShellActive()) {
      this.terminalBase.sendToShell('\x03');
    } else {
      this.write('\r\n' + this.renderer.renderStatus('info', 'Exiting GitCue Enhanced Terminal...') + '\r\n');
      this.closeEmitter.fire(0);
    }
  }

  private async handleTabCompletion(): Promise<void> {
    if (!this.currentInput.trim()) {
      // Pass tab to shell for normal completion
      this.terminalBase.sendToShell('\t');
      return;
    }

    try {
      const completions = await this.autoComplete.getCompletions(this.currentInput);
      
      if (completions.suggestions.length === 0) {
        // No custom completions, pass to shell
        this.terminalBase.sendToShell('\t');
        return;
      }

      if (completions.suggestions.length === 1) {
        // Single completion - auto-complete
        this.completeWithSuggestion(completions.suggestions[0].command);
      } else {
        // Multiple completions - show menu
        this.showCompletionMenu(completions);
      }
    } catch (error) {
      logger.debug('Tab completion error: ' + (error instanceof Error ? error.message : String(error)));
      // Fall back to shell completion
      this.terminalBase.sendToShell('\t');
    }
  }

  private async handleEnter(): Promise<void> {
    this.clearSuggestion();
    const command = this.currentInput.trim();
    
    this.write('\r\n');
    
    if (!command) {
      this.resetInput();
      this.terminalBase.sendToShell('\r\n');
      return;
    }

    // Add to history
    this.addToHistory(command);
    this.lastCommand = command;
    this.lastOutput = '';
    this.lastErrorOutput = '';

    // Check if it's an AI chat message
    if (this.aiIntegration.isInChatMode()) {
      await this.handleAIChatMessage(command);
      return;
    }

    // Check if it's a built-in command
    if (this.commands.isBuiltInCommand(command)) {
      await this.handleBuiltInCommand(command);
      return;
    }

    // Execute as shell command
    await this.executeShellCommand(command);
  }

  private handleBackspace(): void {
    if (this.cursorPosition > 0) {
      this.currentInput = this.currentInput.slice(0, this.cursorPosition - 1) + 
                         this.currentInput.slice(this.cursorPosition);
      this.cursorPosition--;
      
      // Clear suggestion first, then handle backspace
      this.clearSuggestion();
      this.write('\b \b');
      
      // Update suggestion after backspace
      this.updateAutoCompleteSuggestion();
    }
  }

  private handleHistoryNavigation(direction: 'up' | 'down'): void {
    const history = this.commands.getCommandHistory();
    
    if (history.length === 0) return;

    if (direction === 'up') {
      this.historyIndex = Math.min(history.length - 1, this.historyIndex + 1);
    } else {
      this.historyIndex = Math.max(-1, this.historyIndex - 1);
    }

    // Clear current input
    this.clearCurrentLine();

    // Show history command or empty
    const historyCommand = this.historyIndex >= 0 
      ? history[history.length - 1 - this.historyIndex] 
      : '';
    
    this.currentInput = historyCommand;
    this.cursorPosition = this.currentInput.length;
    
    // Display the prompt and command
    this.showPrompt();
    this.write(historyCommand);
    
    // Update suggestion
    this.updateAutoCompleteSuggestion();
  }

  private handleCursorMove(direction: 'left' | 'right'): void {
    if (direction === 'left' && this.cursorPosition > 0) {
      this.cursorPosition--;
      this.write('\x1b[D'); // Move cursor left
    } else if (direction === 'right' && this.cursorPosition < this.currentInput.length) {
      this.cursorPosition++;
      this.write('\x1b[C'); // Move cursor right
    }
    
    // Update suggestion after cursor move
    this.updateAutoCompleteSuggestion();
  }

  private handleRegularInput(char: string): void {
    // Insert character at cursor position
    this.currentInput = this.currentInput.slice(0, this.cursorPosition) + 
                       char + 
                       this.currentInput.slice(this.cursorPosition);
    this.cursorPosition++;
    
    // Clear suggestion before showing new character
    this.clearSuggestion();
    
    // Display the character
    this.write(char);
    
    // Update auto-complete suggestion
    this.updateAutoCompleteSuggestion();
  }

  private async updateAutoCompleteSuggestion(): Promise<void> {
    if (!this.autoComplete.shouldTriggerCompletion(this.currentInput)) {
      this.clearSuggestion();
      return;
    }

    try {
      // First try AI-powered ghost text
      const aiGhostText = await this.autoComplete.getAIGhostText(this.currentInput);
      
      if (aiGhostText) {
        this.showTranslucentSuggestion(aiGhostText);
        return;
      }
      
      // Fallback to regular completions
      const completions = await this.autoComplete.getCompletions(this.currentInput);
      
      if (completions.suggestions.length > 0) {
        const topSuggestion = completions.suggestions[0];
        const suffix = this.autoComplete.getCompletionSuffix(this.currentInput, topSuggestion);
        
        if (suffix) {
          this.showTranslucentSuggestion(suffix);
        } else {
          this.clearSuggestion();
        }
      } else {
        this.clearSuggestion();
      }
    } catch (error) {
      logger.debug('Auto-complete suggestion error: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private showTranslucentSuggestion(suffix: string): void {
    this.clearSuggestion(); // Clear any existing suggestion
    
    this.currentSuggestion = suffix;
    this.isShowingSuggestion = true;
    
    // Use renderer to show translucent suggestion
    const suggestion = this.renderer.renderTranslucentSuggestion(suffix, this.currentInput);
    this.write(suggestion);
  }

  private clearSuggestion(): void {
    if (this.isShowingSuggestion && this.currentSuggestion) {
      const clearSequence = this.renderer.clearTranslucentSuggestion(this.currentSuggestion.length);
      this.write(clearSequence);
    }
    
    this.currentSuggestion = '';
    this.isShowingSuggestion = false;
  }

  private completeWithSuggestion(command: string): void {
    const words = this.currentInput.split(' ');
    const lastWord = words[words.length - 1];
    
    if (command.toLowerCase().startsWith(lastWord.toLowerCase())) {
      const completion = command.substring(lastWord.length);
      this.currentInput += completion;
      this.cursorPosition = this.currentInput.length;
      
      this.clearSuggestion();
      this.write(completion);
    }
  }

  private showCompletionMenu(completions: CompletionResult): void {
    const menu = this.renderer.renderCompletionMenu(completions.suggestions);
    this.write(menu);
    
    // Redisplay current input
    this.showPrompt();
    this.write(this.currentInput);
  }

  private async handleAIChatMessage(message: string): Promise<void> {
    try {
      this.isProcessingCommand = true;
      const response = await this.commands.handleAIChat(message);
      this.write(response);
    } catch (error) {
      this.write(this.renderer.renderError('AI chat failed: ' + (error instanceof Error ? error.message : String(error))));
    } finally {
      this.isProcessingCommand = false;
      this.resetInput();
      this.showPrompt();
    }
  }

  private async handleBuiltInCommand(command: string): Promise<void> {
    try {
      this.isProcessingCommand = true;
      const result = await this.commands.executeCommand(command);
      
      if (result.output) {
        this.write(result.output);
      }
      
      if (result.shouldExit) {
        this.closeEmitter.fire(0);
      return;
    }

    } catch (error) {
      this.write(this.renderer.renderError('Built-in command failed: ' + (error instanceof Error ? error.message : String(error))));
    } finally {
      this.isProcessingCommand = false;
      this.resetInput();
      this.showPrompt();
    }
  }

  private async executeShellCommand(command: string): Promise<void> {
    try {
      this.isProcessingCommand = true;
      
      // Execute command in the underlying shell
      const success = this.terminalBase.executeCommand(command);
      
      if (!success) {
        this.write(this.renderer.renderError('Failed to execute command in shell'));
        this.commands.markLastCommandFailed();
      }
      
      // Note: Shell output will be handled by the TerminalBase
      // Error analysis will be triggered if the command fails

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.write(this.renderer.renderError(errorMsg, command));
      this.commands.markLastCommandFailed();
      
      // Trigger AI error analysis
      await this.analyzeCommandError(command, '', errorMsg);
    } finally {
      this.isProcessingCommand = false;
      this.resetInput();
    }
  }

  private async analyzeCommandError(command: string, output: string, errorOutput: string): Promise<void> {
    try {
      const analysis = await this.aiIntegration.analyzeCommandError(command, output, errorOutput);
      
      if (analysis.hasError && analysis.analysis) {
        const analysisOutput = this.aiIntegration.formatErrorAnalysis(analysis);
        this.write(analysisOutput);
      }
    } catch (error) {
      logger.debug('AI error analysis failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private clearCurrentLine(): void {
    this.write(this.renderer.getControlSequences().clearLine);
  }

  private showPrompt(): void {
    const isAIMode = this.aiIntegration.isInChatMode();
    const prompt = this.renderer.renderPrompt(this.workspaceRoot, isAIMode);
    this.write(prompt);
  }

  private resetInput(): void {
    this.currentInput = '';
    this.cursorPosition = 0;
    this.historyIndex = -1;
    this.clearSuggestion();
  }

  private write(text: string): void {
    this.writeEmitter.fire(text);
  }

  private addToHistory(command: string): void {
    const trimmed = command.trim();
    if (trimmed && trimmed !== this.sessionHistory[this.sessionHistory.length - 1]) {
      this.sessionHistory.push(trimmed);
      
      // Also add to auto-complete recent commands for AI context
      this.autoComplete.addToRecentCommands(trimmed);
      
      const config = configManager.getConfig();
      if (this.sessionHistory.length > config.maxHistorySize) {
        this.sessionHistory = this.sessionHistory.slice(-config.maxHistorySize);
      }
    }
    this.historyIndex = -1;
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
} 