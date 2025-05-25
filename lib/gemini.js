import { GoogleGenAI, Type } from '@google/genai';
import { validateConfig } from './config.js';
import { rateLimiter } from './rateLimiter.js';
import logger from '../utils/logger.js';

// Configure the client
let ai = null;

function getAIClient() {
  if (!ai) {
    const { apiKey } = validateConfig();
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Function declaration for intelligent commit decisions
const shouldCommitFunctionDeclaration = {
  name: 'should_commit_changes',
  description: 'Analyzes code changes and determines if they warrant a commit based on significance, completeness, and best practices.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      shouldCommit: {
        type: Type.BOOLEAN,
        description: 'Whether the changes are significant enough to warrant a commit'
      },
      reason: {
        type: Type.STRING,
        description: 'Explanation for the commit decision'
      },
      commitMessage: {
        type: Type.STRING,
        description: 'Suggested commit message if shouldCommit is true'
      },
      significance: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
        description: 'The significance level of the changes'
      }
    },
    required: ['shouldCommit', 'reason', 'significance']
  }
};

export async function generateCommitMessage(diffText) {
  validateConfig();
  
  if (!diffText || diffText.trim().length === 0) {
    throw new Error('No diff text provided for commit message generation');
  }

  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = Math.ceil(rateLimiter.getTimeUntilNextCall() / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
  }

  logger.debug('Calling Gemini API for commit message generation...');

  try {
    const aiClient = getAIClient();
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate a conventional commit message for these changes. Use format: type(scope): description

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep messages under 50 characters for the subject line
- Be specific but concise
- Focus on what changed, not how
- Use imperative mood (e.g., "add" not "added")

Examples:
- feat(auth): add user login validation
- fix(api): resolve null pointer exception
- docs(readme): update installation steps
- refactor(utils): simplify date formatting

Changes to analyze:
${diffText}`
        }]
      }]
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty commit message');
    }

    // Clean up the response - remove any extra formatting or explanations
    const commitMessage = response.text
      .split('\n')[0] // Take only the first line
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();

    if (!commitMessage) {
      throw new Error('Gemini returned an empty commit message');
    }

    // Record the API call for rate limiting
    rateLimiter.recordCall();
    
    logger.debug(`Generated commit message: "${commitMessage}"`);
    return commitMessage;
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to generate commit message: ${error.message}`);
    }
    throw error;
  }
}

export async function analyzeChangesForCommit(diffText) {
  validateConfig();
  
  if (!diffText || diffText.trim().length === 0) {
    throw new Error('No diff text provided for commit analysis');
  }

  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = Math.ceil(rateLimiter.getTimeUntilNextCall() / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
  }

  logger.debug('Calling Gemini API for intelligent commit analysis...');

  try {
    const aiClient = getAIClient();
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze these code changes and determine if they warrant a commit based on:

1. **Significance**: Are the changes meaningful enough to commit?
   - High: New features, major fixes, breaking changes
   - Medium: Minor features, bug fixes, refactoring
   - Low: Formatting, comments, trivial changes

2. **Completeness**: Do the changes represent a complete unit of work?
   - Complete features or fixes should be committed
   - Incomplete work-in-progress should wait

3. **Best Practices**: Follow conventional commit guidelines
   - Atomic commits (one logical change per commit)
   - Meaningful commit messages
   - Don't commit broken code

Guidelines for commit decisions:
- Commit: Complete features, bug fixes, documentation updates, meaningful refactoring
- Don't commit: Incomplete features, debugging code, temporary changes, trivial formatting
- Consider file types: Source code changes are more significant than config tweaks

Changes to analyze:
${diffText}`
        }]
      }],
      config: {
        tools: [{
          functionDeclarations: [shouldCommitFunctionDeclaration]
        }]
      }
    });

    // Check for function calls in the response
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      
      if (functionCall.name === 'should_commit_changes') {
        // Record the API call for rate limiting
        rateLimiter.recordCall();
        
        const args = functionCall.args;
        logger.debug(`Commit analysis result: ${JSON.stringify(args)}`);
        
        return {
          shouldCommit: args.shouldCommit,
          reason: args.reason,
          commitMessage: args.commitMessage || null,
          significance: args.significance
        };
      }
    }
    
    // Fallback if no function call was made
    throw new Error('Gemini did not provide a structured commit analysis');
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to analyze changes for commit: ${error.message}`);
    }
    throw error;
  }
}

export async function generateErrorSuggestion(errorText) {
  validateConfig();
  
  if (!errorText || errorText.trim().length === 0) {
    throw new Error('No error text provided for suggestion generation');
  }

  // Sanitize error text to remove sensitive information
  const sanitizedError = sanitizeErrorText(errorText);

  try {
    const aiClient = getAIClient();
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `You are an expert Git troubleshooting assistant. Analyze this Git error and provide clear, actionable solutions.

Rules:
- Provide specific, step-by-step commands to resolve the issue
- Focus on the most common and effective solutions first
- Use standard Git commands and best practices
- Be concise but thorough
- Include explanations for why the solution works
- If multiple solutions exist, mention the safest option first

Common Git error patterns and solutions:
- Merge conflicts: git status, resolve conflicts, git add, git commit
- Push rejected: git pull --rebase, resolve conflicts, git push
- Detached HEAD: git checkout main/master
- Uncommitted changes: git stash, git stash pop
- Authentication issues: check credentials, SSH keys
- Remote tracking: git push --set-upstream origin branch-name

Format your response as actionable steps.

Error to analyze:
${sanitizedError}`
        }]
      }]
    });

    const suggestion = response.text?.trim();

    if (!suggestion) {
      throw new Error('Gemini returned an empty suggestion');
    }

    logger.debug('Generated error suggestion');
    return suggestion;
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to generate error suggestion: ${error.message}`);
    }
    throw error;
  }
}

function sanitizeErrorText(errorText) {
  // Remove sensitive information from error text
  let sanitized = errorText;
  
  // Remove file paths that might contain usernames
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[username]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[username]');
  sanitized = sanitized.replace(/C:\\Users\\[^\\s]+/g, 'C:\\Users\\[username]');
  
  // Remove potential API keys or tokens
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  
  // Remove URLs with credentials
  sanitized = sanitized.replace(/https?:\/\/[^@\s]+@[^\s]+/g, 'https://[credentials]@[url]');
  
  // Keep only the essential error information
  const lines = sanitized.split('\n');
  const relevantLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && 
           !trimmed.startsWith('#') && 
           !trimmed.startsWith('On branch') &&
           !trimmed.startsWith('Your branch');
  });
  
  return relevantLines.join('\n').trim();
} 