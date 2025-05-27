import * as vscode from 'vscode';
import { configManager } from './config';
import logger from './logger';

/**
 * AI utilities for GitCue extension v0.3.5
 * Handles error analysis and suggestions using Google GenAI SDK
 */

// Global debug mode
const DEBUG_MODE = process.env.NODE_ENV === 'development' || process.env.GITCUE_DEBUG === 'true';

function debugLog(message: string, data?: any) {
  if (DEBUG_MODE) {
    logger.debug('[GitCue v0.3.5] ' + message + (data ? ': ' + JSON.stringify(data) : ''));
  }
}

/**
 * Generate AI-powered error suggestion
 */
export async function generateErrorSuggestion(errorContext: string): Promise<string> {
  const config = configManager.getConfig();
  
  debugLog('Starting AI error analysis', errorContext.substring(0, 100) + '...');
  
  if (!config.geminiApiKey) {
    const error = 'Gemini API key not configured';
    logger.error('AI analysis failed: ' + error);
    throw new Error(error);
  }

  if (!config.enableSuggestions) {
    const message = 'AI suggestions are disabled in settings.';
    debugLog('AI suggestions disabled');
    return message;
  }

  try {
    debugLog('Importing Google GenAI SDK...');
    const { GoogleGenAI } = await import('@google/genai');
    
    debugLog('Initializing AI with API key...');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `As a terminal and development expert, analyze this error and provide clear guidance:

Error Context:
${errorContext}

Please provide:
1. A clear explanation of what went wrong
2. Step-by-step solution to fix the issue
3. Additional context or preventive measures
4. Common pitfalls to avoid

Format your response in markdown with:
- Headers for sections
- Code blocks for commands
- Bullet points for steps
- Important notes highlighted`;

    debugLog('Sending request to Gemini 2.0 Flash...');
    
    // Always use gemini-2.0-flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 1000,
        temperature: 0.3,
      }
    });

    debugLog('Received response from AI');
    
    if (!response || !response.text) {
      logger.error('AI response is empty or invalid: ' + JSON.stringify(response));
      throw new Error('AI response is empty or invalid');
    }

    debugLog('AI analysis completed successfully');
    return response.text;

  } catch (error) {
    logger.error('AI suggestion generation failed: ' + (error instanceof Error ? error.message : String(error)));
    
    // Add more detailed error logging
    if (error instanceof Error) {
      logger.error(`Error details - Name: ${error.name}, Message: ${error.message}, Stack: ${error.stack || 'No stack trace'}`);
    }
    
    // Add retry logic for transient errors
    if (error instanceof Error && 
        (error.message.includes('API') || 
         error.message.includes('network') || 
         error.message.includes('timeout'))) {
      try {
        debugLog('Retrying AI request after 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return generateErrorSuggestion(errorContext);
      } catch (retryError) {
        logger.error('Retry failed: ' + (retryError instanceof Error ? retryError.message : String(retryError)));
      }
    }
    
    throw error; // Propagate the error to be handled by the caller
  }
}

/**
 * Test function to verify AI functionality
 */
export async function testAIConnection(): Promise<boolean> {
  try {
    debugLog('Testing AI connection...');
    const testResponse = await generateErrorSuggestion('Test error: command not found');
    debugLog('AI test successful', testResponse.substring(0, 100) + '...');
    return true;
  } catch (error) {
    logger.error('AI test failed: ' + (error instanceof Error ? error.message : String(error)));
    return false;
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