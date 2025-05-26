import * as vscode from 'vscode';
import { configManager } from './config';
import logger from './logger';

/**
 * AI utilities for GitCue extension
 * Handles error analysis and suggestions using Google GenAI SDK
 */

/**
 * Generate AI-powered error suggestion
 */
export async function generateErrorSuggestion(errorContext: string): Promise<string> {
  const config = configManager.getConfig();
  
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  if (!config.enableSuggestions) {
    return 'AI suggestions are disabled in settings.';
  }

  try {
    // Use the new Google GenAI SDK
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `You are an expert Git and terminal assistant. A user encountered an error while running a command. 
Please analyze the error and provide helpful suggestions.

Error Context:
${errorContext}

Please analyze this error and provide:
1. A brief explanation of what went wrong
2. Specific steps to fix the issue
3. Alternative approaches if applicable
4. Preventive measures for the future

Format your response in clear, actionable markdown with code blocks for commands.
Keep it concise but comprehensive.`;

    const response = await ai.models.generateContent({
      model: 'gemini-pro',
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.3,
      }
    });

    return response.text || 'No suggestion generated';

  } catch (error) {
    logger.error('AI suggestion generation failed', error instanceof Error ? error.message : String(error));
    
    // Add retry logic for transient errors
    if (error instanceof Error && 
        (error.message.includes('API') || error.message.includes('network'))) {
      try {
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateErrorSuggestion(errorContext);
      } catch (retryError) {
        logger.error('Retry failed', retryError instanceof Error ? retryError.message : String(retryError));
      }
    }
    
    return `Failed to generate AI suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Format AI suggestion with markdown styling
 */
export function formatAISuggestion(suggestion: string): string {
  // Add header
  let formatted = '🤖 **AI Assistant Suggestion**\n\n';
  formatted += suggestion;
  formatted += '\n\n---\n';
  formatted += '*Powered by Google Gemini AI*';
  
  return formatted;
}

/**
 * Format Git command with syntax highlighting
 */
export function formatGitCommand(command: string): string {
  // Simple syntax highlighting for Git commands
  return command
    .replace(/^git\s+/, '**git** ')
    .replace(/\s(add|commit|push|pull|status|log|branch|checkout|merge|rebase|reset|diff|show)\s/, ' **$1** ')
    .replace(/\s--?([a-zA-Z-]+)/g, ' `--$1`')
    .replace(/\s-([a-zA-Z])/g, ' `-$1`');
}

/**
 * Format markdown content for display
 */
export function formatMarkdown(content: string): string {
  // Basic markdown formatting for terminal display
  return content
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
    .replace(/\*(.*?)\*/g, '$1')      // Italic
    .replace(/`(.*?)`/g, '$1')        // Code
    .replace(/^#{1,6}\s+(.*)$/gm, '$1') // Headers
    .replace(/^>\s+(.*)$/gm, '  $1')  // Blockquotes
    .replace(/^-\s+(.*)$/gm, '• $1')  // Lists
    .replace(/^\d+\.\s+(.*)$/gm, '$1') // Numbered lists
    .trim();
}

/**
 * Create a boxed message for important information
 */
export function createBox(message: string, title?: string): string {
  const lines = message.split('\n');
  const maxLength = Math.max(...lines.map(line => line.length), title ? title.length : 0);
  const width = Math.min(maxLength + 4, 80);
  
  let box = '┌' + '─'.repeat(width - 2) + '┐\n';
  
  if (title) {
    const padding = Math.max(0, width - title.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    box += '│ ' + ' '.repeat(leftPad) + title + ' '.repeat(rightPad) + ' │\n';
    box += '├' + '─'.repeat(width - 2) + '┤\n';
  }
  
  lines.forEach(line => {
    const padding = Math.max(0, width - line.length - 4);
    box += '│ ' + line + ' '.repeat(padding) + ' │\n';
  });
  
  box += '└' + '─'.repeat(width - 2) + '┘';
  
  return box;
}

/**
 * Rate limiting for AI API calls
 */
class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  
  constructor(maxCallsPerMinute: number) {
    this.maxCalls = maxCallsPerMinute;
  }
  
  canMakeCall(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove calls older than 1 minute
    this.calls = this.calls.filter(time => time > oneMinuteAgo);
    
    return this.calls.length < this.maxCalls;
  }
  
  recordCall(): void {
    this.calls.push(Date.now());
  }
  
  getTimeUntilNextCall(): number {
    if (this.canMakeCall()) {
      return 0;
    }
    
    const oldestCall = Math.min(...this.calls);
    const timeUntilExpiry = (oldestCall + 60000) - Date.now();
    return Math.max(0, timeUntilExpiry);
  }
}

// Global rate limiter instance
let rateLimiter: RateLimiter;

/**
 * Get or create rate limiter with current configuration
 */
function getRateLimiter(): RateLimiter {
  const config = configManager.getConfig();
  
  if (!rateLimiter || rateLimiter['maxCalls'] !== config.maxCallsPerMinute) {
    rateLimiter = new RateLimiter(config.maxCallsPerMinute);
  }
  
  return rateLimiter;
}

/**
 * Generate error suggestion with rate limiting
 */
export async function generateErrorSuggestionWithRateLimit(errorContext: string): Promise<string> {
  const limiter = getRateLimiter();
  
  if (!limiter.canMakeCall()) {
    const waitTime = Math.ceil(limiter.getTimeUntilNextCall() / 1000);
    return `Rate limit exceeded. Please wait ${waitTime} seconds before requesting another AI suggestion.`;
  }
  
  try {
    limiter.recordCall();
    return await generateErrorSuggestion(errorContext);
  } catch (error) {
    logger.error('AI suggestion failed', error instanceof Error ? error.message : String(error));
    return `Failed to generate AI suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Show AI suggestion in VS Code
 */
export async function showAISuggestionInVSCode(errorContext: string): Promise<void> {
  try {
    const suggestion = await generateErrorSuggestionWithRateLimit(errorContext);
    const formattedSuggestion = formatAISuggestion(suggestion);
    
    // Show in information message with action buttons
    const action = await vscode.window.showInformationMessage(
      'AI Assistant has analyzed the error and generated suggestions.',
      'View Suggestions',
      'Copy to Clipboard',
      'Dismiss'
    );
    
    if (action === 'View Suggestions') {
      // Create a new document with the suggestion
      const doc = await vscode.workspace.openTextDocument({
        content: formattedSuggestion,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(doc);
    } else if (action === 'Copy to Clipboard') {
      await vscode.env.clipboard.writeText(suggestion);
      vscode.window.showInformationMessage('AI suggestion copied to clipboard');
    }
    
    // Also log to output channel
    logger.aiSuggestion('Generated suggestion for error: ' + errorContext.substring(0, 100) + '...');
    
  } catch (error) {
    logger.error('Failed to show AI suggestion', error instanceof Error ? error.message : String(error));
    vscode.window.showErrorMessage('Failed to generate AI suggestion: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 