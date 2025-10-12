import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { generateAICompletions, generateGhostTextSuggestion } from '../utils/ai';
import logger from '../utils/logger';

export interface CompletionEntry {
  command: string;
  description?: string;
  type: 'ai' | 'builtin';
  priority?: number;
}

export interface CompletionResult {
  suggestions: CompletionEntry[];
  commonPrefix: string;
  hasExactMatch: boolean;
}

export interface AutoCompleteOptions {
  maxSuggestions: number;
  caseSensitive: boolean;
  includeFiles: boolean;
  includeDirectories: boolean;
}

/**
 * AI-Powered auto-completion system with translucent suggestions
 */
export class AutoCompleteEngine {
  private workspaceRoot: string;
  private recentCommands: string[] = [];
  private builtinCommands: string[] = ['help', 'config', 'ai', 'history', 'clear', 'exit', 'test-ai', 'version'];

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Get AI-powered completion suggestions for input text
   */
  async getCompletions(input: string, options: Partial<AutoCompleteOptions> = {}): Promise<CompletionResult> {
    const opts: AutoCompleteOptions = {
      maxSuggestions: 10,
      caseSensitive: false,
      includeFiles: true,
      includeDirectories: true,
      ...options
    };

    const words = input.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    if (!lastWord || lastWord.length < 2) {
      return { suggestions: [], commonPrefix: '', hasExactMatch: false };
    }

    try {
      // Get AI-powered completions
      const aiCompletions = await generateAICompletions(
        lastWord,
        this.workspaceRoot,
        this.recentCommands
      );

      // Check for builtin commands
      const builtinMatches = this.builtinCommands
        .filter(cmd => cmd.toLowerCase().startsWith(lastWord.toLowerCase()))
        .slice(0, 3);

      // Combine AI completions with builtin commands
      const allCompletions = [
        ...builtinMatches.map(cmd => ({
          command: cmd,
          type: 'builtin' as const,
          description: this.getBuiltinDescription(cmd),
          priority: 10
        })),
        ...aiCompletions.map(cmd => ({
          command: cmd,
          type: 'ai' as const,
          description: 'AI suggested command',
          priority: 8
        }))
      ];

      // Remove duplicates and sort by priority
      const uniqueCompletions = this.removeDuplicates(allCompletions)
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, opts.maxSuggestions);

      // Find common prefix
      const commands = uniqueCompletions.map(c => c.command);
      const commonPrefix = this.findCommonPrefix(commands, lastWord);
      
      // Check for exact match
      const hasExactMatch = uniqueCompletions.some(s => 
        opts.caseSensitive 
          ? s.command === lastWord 
          : s.command.toLowerCase() === lastWord.toLowerCase()
      );

      return {
        suggestions: uniqueCompletions,
        commonPrefix,
        hasExactMatch
      };

    } catch (error) {
      logger.debug('AI completion failed: ' + (error instanceof Error ? error.message : String(error)));
      
      // Fallback to builtin commands only
      const builtinSuggestions = this.builtinCommands
        .filter(cmd => cmd.toLowerCase().startsWith(lastWord.toLowerCase()))
        .map(cmd => ({
          command: cmd,
          type: 'builtin' as const,
          description: this.getBuiltinDescription(cmd),
          priority: 10
        }));

      return {
        suggestions: builtinSuggestions,
        commonPrefix: builtinSuggestions.length > 0 ? this.findCommonPrefix(builtinSuggestions.map(s => s.command), lastWord) : '',
        hasExactMatch: false
      };
    }
  }

  /**
   * Get completion suffix for translucent display (with AI fallback)
   */
  getCompletionSuffix(input: string, topSuggestion: CompletionEntry): string {
    const words = input.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    if (topSuggestion.command.toLowerCase().startsWith(lastWord.toLowerCase())) {
      return topSuggestion.command.substring(lastWord.length);
    }
    
    return '';
  }

  /**
   * Get AI-powered ghost text suggestion asynchronously
   */
  async getAIGhostText(input: string): Promise<string> {
    const words = input.trim().split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    
    if (!lastWord || lastWord.length < 2) {
      return '';
    }

    try {
      // Use AI to generate ghost text suggestion
      const ghostText = await generateGhostTextSuggestion(
        lastWord,
        this.workspaceRoot,
        this.recentCommands
      );

      return ghostText;

    } catch (error) {
      logger.debug('AI ghost text generation failed: ' + (error instanceof Error ? error.message : String(error)));
      return '';
    }
  }

  /**
   * Check if input should trigger auto-completion
   */
  shouldTriggerCompletion(input: string): boolean {
    const trimmed = input.trim();
    
    // Don't complete empty input
    if (!trimmed) return false;
    
    // Don't complete if ending with space (user finished typing word)
    if (input.endsWith(' ')) return false;
    
    // Don't complete very short inputs
    if (trimmed.length < 2) return false;
    
    return true;
  }

  /**
   * Add command to recent commands history for AI context
   */
  addToRecentCommands(command: string): void {
    const trimmed = command.trim();
    if (trimmed && !this.recentCommands.includes(trimmed)) {
      this.recentCommands.push(trimmed);
      
      // Keep only last 20 commands
      if (this.recentCommands.length > 20) {
        this.recentCommands = this.recentCommands.slice(-20);
      }
    }
  }

  /**
   * Clear recent commands history
   */
  clearRecentCommands(): void {
    this.recentCommands = [];
  }

  private removeDuplicates(completions: CompletionEntry[]): CompletionEntry[] {
    const seen = new Set<string>();
    return completions.filter(comp => {
      const key = comp.command.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private findCommonPrefix(commands: string[], currentInput: string): string {
    if (commands.length === 0) return '';
    if (commands.length === 1) return commands[0];
    
    // Find the longest common prefix among all commands
    let prefix = commands[0];
    
    for (let i = 1; i < commands.length; i++) {
      let j = 0;
      while (j < prefix.length && j < commands[i].length && 
             prefix[j].toLowerCase() === commands[i][j].toLowerCase()) {
        j++;
      }
      prefix = prefix.substring(0, j);
      
      if (prefix.length <= currentInput.length) {
        break;
      }
    }
    
    // Only return prefix if it's longer than current input
    return prefix.length > currentInput.length ? prefix : '';
  }

  private getBuiltinDescription(command: string): string {
    const descriptions: Record<string, string> = {
      'help': 'Show GitCue help information',
      'config': 'Show/modify GitCue configuration', 
      'ai': 'Enter AI chat mode for assistance',
      'history': 'Show command history',
      'clear': 'Clear terminal screen',
      'exit': 'Exit terminal',
      'test-ai': 'Test AI connection and features',
      'version': 'Show GitCue version information'
    };
    
    return descriptions[command] || 'GitCue built-in command';
  }

  /**
   * Get color for completion type
   */
  getTypeColor(type: CompletionEntry['type']): string {
    const colors = {
      builtin: '\x1b[1;35m',   // Bright magenta for GitCue commands
      ai: '\x1b[1;36m',        // Bright cyan for AI suggestions
    };
    
    return colors[type] || '\x1b[37m'; // Default white
  }

  /**
   * Get icon for completion type
   */
  getTypeIcon(type: CompletionEntry['type']): string {
    const icons = {
      builtin: '',
      ai: '',
    };
    
    return icons[type] || '•';
  }
} 