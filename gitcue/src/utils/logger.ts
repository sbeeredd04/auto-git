import * as vscode from 'vscode';

/**
 * VS Code Extension Logger for GitCue
 * Provides logging functionality adapted for VS Code environment
 */
export class ExtensionLogger {
  private outputChannel: vscode.OutputChannel;
  private verbose: boolean = false;

  constructor(channelName: string = 'GitCue') {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Set verbose mode for detailed logging
   */
  setVerbose(verbose: boolean = true): void {
    this.verbose = verbose;
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Clear the output channel
   */
  clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Success message
   */
  success(message: string, details?: string): void {
    const content = details 
      ? `✅ SUCCESS: ${message}\n   ${details}`
      : `✅ SUCCESS: ${message}`;
    
    this.outputChannel.appendLine(content);
    this.outputChannel.appendLine('');
  }

  /**
   * Error message
   */
  error(message: string, details?: string): void {
    const content = details 
      ? `❌ ERROR: ${message}\n   ${details}`
      : `❌ ERROR: ${message}`;
    
    this.outputChannel.appendLine(content);
    this.outputChannel.appendLine('');
  }

  /**
   * Warning message
   */
  warning(message: string, details?: string): void {
    const content = details 
      ? `⚠️  WARNING: ${message}\n   ${details}`
      : `⚠️  WARNING: ${message}`;
    
    this.outputChannel.appendLine(content);
    this.outputChannel.appendLine('');
  }

  /**
   * Info message
   */
  info(message: string, title: string = 'INFO'): void {
    this.outputChannel.appendLine(`ℹ️  [${title}] ${message}`);
  }

  /**
   * Debug message (only shown in verbose mode)
   */
  debug(message: string): void {
    if (this.verbose) {
      this.outputChannel.appendLine(`🐛 [DEBUG] ${message}`);
    }
  }

  /**
   * Status update
   */
  status(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'processing' = 'info'): void {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      processing: '🔄'
    };
    
    const icon = icons[type] || 'ℹ️';
    this.outputChannel.appendLine(`${icon} ${message}`);
  }

  /**
   * Section header
   */
  section(title: string, subtitle?: string): void {
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('═'.repeat(60));
    this.outputChannel.appendLine(`📋 ${title.toUpperCase()}`);
    if (subtitle) {
      this.outputChannel.appendLine(`   ${subtitle}`);
    }
    this.outputChannel.appendLine('═'.repeat(60));
    this.outputChannel.appendLine('');
  }

  /**
   * Configuration display
   */
  config(title: string, items: Record<string, any>): void {
    this.outputChannel.appendLine(`🔧 ${title}`);
    this.outputChannel.appendLine('─'.repeat(40));
    
    Object.entries(items).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' 
        ? (value ? '✓ Yes' : '✗ No')
        : String(value);
      
      this.outputChannel.appendLine(`  ${key.padEnd(20)} ${displayValue}`);
    });
    
    this.outputChannel.appendLine('');
  }

  /**
   * File change notification
   */
  fileChange(event: string, path: string): void {
    this.outputChannel.appendLine(`📁 File Change: ${event} → ${path}`);
  }

  /**
   * Processing stage indicator
   */
  stage(message: string, type: 'info' | 'success' | 'error' | 'processing' = 'info'): void {
    const symbols = {
      info: '▶️',
      success: '✅',
      error: '❌',
      processing: '🔄'
    };
    
    const symbol = symbols[type] || '▶️';
    this.outputChannel.appendLine(`${symbol} ${message}`);
  }

  /**
   * Blank line for spacing
   */
  space(): void {
    this.outputChannel.appendLine('');
  }

  /**
   * Simple divider line
   */
  divider(): void {
    this.outputChannel.appendLine('─'.repeat(60));
  }

  /**
   * Commit summary display
   */
  commitSummary(message: string, hasRemote: boolean): void {
    const operation = hasRemote ? 'Committed and Pushed' : 'Committed (Local Only)';
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('🎉 ' + operation);
    this.outputChannel.appendLine('💬 ' + message);
    this.outputChannel.appendLine('');
  }

  /**
   * Interactive session info
   */
  interactiveInfo(message: string): void {
    this.outputChannel.appendLine(`🖥️  [TERMINAL] ${message}`);
  }

  /**
   * AI suggestion info
   */
  aiSuggestion(message: string): void {
    this.outputChannel.appendLine(`🤖 [AI] ${message}`);
  }

  /**
   * Dispose the output channel
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

// Export singleton instance
export const logger = new ExtensionLogger('GitCue');
export default logger; 