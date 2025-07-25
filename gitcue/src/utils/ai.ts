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

// Function declarations for AI function calling
const getCommitDecisionFunctionDeclaration = async () => {
  const { Type } = await import('@google/genai');
  return {
    name: 'make_commit_decision',
    description: 'Analyzes Git changes and decides whether to commit them based on code quality, completeness, and significance.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        shouldCommit: {
          type: Type.BOOLEAN,
          description: 'Whether the changes should be committed now',
        },
        reason: {
          type: Type.STRING,
          description: 'Clear explanation for the commit decision',
        },
        significance: {
          type: Type.STRING,
          enum: ['LOW', 'MEDIUM', 'HIGH'],
          description: 'The significance level of the changes',
        },
        suggestedMessage: {
          type: Type.STRING,
          description: 'Suggested commit message if shouldCommit is true',
        },
        nextSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Recommended next steps for the developer',
        }
      },
      required: ['shouldCommit', 'reason', 'significance'],
    },
  };
};

const getCommitMessageFunctionDeclaration = async () => {
  const { Type } = await import('@google/genai');
  return {
    name: 'generate_commit_message',
    description: 'Generates a high-quality commit message following conventional commit standards.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'build'],
          description: 'The type of change according to conventional commits',
        },
        scope: {
          type: Type.STRING,
          description: 'Optional scope of the change (e.g., component, module)',
        },
        description: {
          type: Type.STRING,
          description: 'Brief description of the change (imperative mood)',
        },
        body: {
          type: Type.STRING,
          description: 'Optional longer description explaining the change',
        },
        breakingChange: {
          type: Type.BOOLEAN,
          description: 'Whether this is a breaking change',
        }
      },
      required: ['type', 'description'],
    },
  };
};

interface CommitDecision {
  shouldCommit: boolean;
  reason: string;
  significance: 'LOW' | 'MEDIUM' | 'HIGH';
  suggestedMessage?: string;
  nextSteps?: string[];
}

interface CommitMessage {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  breakingChange?: boolean;
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

    const prompt = `Analyze this command error and provide a concise solution:

Error Context:
${errorContext}

Provide a brief response with:
1. **What went wrong** (1-2 sentences)
2. **Most likely fix** (the exact command to run)
3. **Alternative solutions** (if applicable)

Keep it under 200 words. Use markdown formatting. Focus on actionable solutions.`;

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

/**
 * Uses AI function calling to make intelligent commit decisions
 */
export async function makeCommitDecisionWithAI(gitDiff: string, gitStatus: string): Promise<CommitDecision> {
  const config = configManager.getConfig();
  
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `Analyze these Git changes and decide if they should be committed:

Git Status:
${gitStatus}

Git Diff (first 3000 chars):
${gitDiff.substring(0, 3000)}

Consider:
- Are these meaningful, complete changes?
- Is this a good stopping point for a commit?
- Are there any incomplete features or broken functionality?
- Code quality and consistency
- Whether changes form a logical unit

Use the make_commit_decision function to provide your analysis.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{
          functionDeclarations: [await getCommitDecisionFunctionDeclaration()]
        }],
        maxOutputTokens: 1000,
        temperature: 0.3,
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      if (functionCall.name === 'make_commit_decision') {
        return functionCall.args as unknown as CommitDecision;
      }
    }

    // Fallback if no function call
    return {
      shouldCommit: true,
      reason: 'AI analysis completed without function call, defaulting to commit',
      significance: 'MEDIUM'
    };

  } catch (error) {
    logger.error('AI commit decision failed: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * Generate AI-powered command completions for terminal
 */
export async function generateAICompletions(
  currentInput: string,
  workingDirectory: string,
  recentCommands?: string[]
): Promise<string[]> {
  const config = configManager.getConfig();
  
  debugLog('Starting AI auto-completion', { currentInput, workingDirectory });
  
  if (!config.geminiApiKey) {
    debugLog('API key not configured, returning empty completions');
    return [];
  }

  if (!config.enableSuggestions) {
    debugLog('AI suggestions disabled');
    return [];
  }

  // Don't complete very short inputs or if input ends with space
  if (currentInput.trim().length < 2 || currentInput.endsWith(' ')) {
    return [];
  }

  try {
    debugLog('Importing Google GenAI SDK for completions...');
    const { GoogleGenAI } = await import('@google/genai');
    
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    // Build context for completion
    const context = `You are an intelligent terminal auto-completion assistant. Provide command completions for a developer working in a terminal.

Current input: "${currentInput}"
Working directory: ${workingDirectory}
Recent commands: ${recentCommands ? recentCommands.slice(-5).join(', ') : 'none'}

Provide up to 5 most relevant command completions that start with the current input. Consider:
- Git commands and common options
- File system operations (ls, cd, mkdir, etc.)
- NPM/Node.js commands
- Common developer tools
- Files and directories in the current path
- Shell built-ins and common utilities

Return ONLY a JSON array of completion strings, no other text:
["completion1", "completion2", "completion3"]

Each completion should be a logical continuation of the current input.`;

    debugLog('Sending completion request to Gemini...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: context,
      config: {
        maxOutputTokens: 200,
        temperature: 0.2, // Lower temperature for more consistent completions
      }
    });

    debugLog('Received AI completion response');
    
    if (!response || !response.text) {
      debugLog('Empty AI response');
      return [];
    }

    try {
      // Parse the JSON response
      const completions = JSON.parse(response.text.trim());
      
      if (Array.isArray(completions)) {
        // Filter and validate completions
        const validCompletions = completions
          .filter(comp => typeof comp === 'string' && comp.length > 0)
          .filter(comp => comp.toLowerCase().startsWith(currentInput.toLowerCase()))
          .slice(0, 5); // Limit to 5 completions
        
        debugLog('AI completions generated', validCompletions);
        return validCompletions;
      }
    } catch (parseError) {
      debugLog('Failed to parse AI completion response', response.text);
      
      // Fallback: try to extract completions from text
      const lines = response.text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.includes(':') && !line.includes('completion'))
        .filter(line => line.toLowerCase().startsWith(currentInput.toLowerCase()))
        .slice(0, 3);
      
      return lines;
    }

    return [];

  } catch (error) {
    debugLog('AI completion failed', error instanceof Error ? error.message : String(error));
    
    // Don't throw error for completions, just return empty array
    return [];
  }
}

/**
 * Generate AI-powered ghost text suggestion for current input
 */
export async function generateGhostTextSuggestion(
  currentInput: string,
  workingDirectory: string,
  recentCommands?: string[]
): Promise<string> {
  const config = configManager.getConfig();
  
  if (!config.geminiApiKey || !config.enableSuggestions) {
    return '';
  }

  // Don't suggest for very short inputs
  if (currentInput.trim().length < 3) {
    return '';
  }

  try {
    const completions = await generateAICompletions(currentInput, workingDirectory, recentCommands);
    
    if (completions.length > 0) {
      const topCompletion = completions[0];
      
      // Return the suffix that should be shown as ghost text
      if (topCompletion.toLowerCase().startsWith(currentInput.toLowerCase())) {
        return topCompletion.substring(currentInput.length);
      }
    }
    
    return '';
    
  } catch (error) {
    debugLog('Ghost text generation failed', error instanceof Error ? error.message : String(error));
    return '';
  }
}

/**
 * Uses AI function calling to generate commit messages
 */
export async function generateCommitMessageWithAI(gitDiff: string, gitStatus: string): Promise<string> {
  const config = configManager.getConfig();
  
  if (!config.geminiApiKey) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

    const prompt = `Generate a high-quality commit message for these changes following conventional commit standards:

Git Status:
${gitStatus}

Git Diff (first 3000 chars):
${gitDiff.substring(0, 3000)}

Requirements:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
- Keep description under 50 characters, imperative mood
- Add body if changes are complex
- Be specific about what changed, not just "update files"

Use the generate_commit_message function to create a proper commit message.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{
          functionDeclarations: [await getCommitMessageFunctionDeclaration()]
        }],
        maxOutputTokens: 500,
        temperature: 0.3,
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      if (functionCall.name === 'generate_commit_message') {
        const msg = functionCall.args as unknown as CommitMessage;
        let commitMessage = `${msg.type}`;
        if (msg.scope) {
          commitMessage += `(${msg.scope})`;
        }
        if (msg.breakingChange) {
          commitMessage += '!';
        }
        commitMessage += `: ${msg.description}`;
        
        if (msg.body) {
          commitMessage += `\n\n${msg.body}`;
        }
        
        return commitMessage;
      }
    }

    // Fallback to regular generation
    return await generateErrorSuggestion(`Generate a commit message for: ${gitStatus}`);

  } catch (error) {
    logger.error('AI commit message generation failed: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
} 