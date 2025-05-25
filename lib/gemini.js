import fetch from 'node-fetch';
import { validateConfig } from './config.js';
import logger from '../utils/logger.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function generateCommitMessage(diffText) {
  const { apiKey } = validateConfig();
  
  if (!diffText || diffText.trim().length === 0) {
    throw new Error('No diff text provided for commit message generation');
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  
  const requestBody = {
    system_instruction: {
      parts: [
        {
          text: `You are an expert Git commit message generator. Create concise, conventional commit messages based on code changes. 

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
- refactor(utils): simplify date formatting`
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: `Generate a commit message for these changes:\n\n${diffText}`
          }
        ]
      }
    ]
  };

  try {
    logger.debug('Sending request to Gemini API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Clean up the response - remove any extra formatting or explanations
    const commitMessage = generatedText
      .split('\n')[0] // Take only the first line
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();

    if (!commitMessage) {
      throw new Error('Gemini returned an empty commit message');
    }

    logger.debug(`Generated commit message: "${commitMessage}"`);
    return commitMessage;
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to generate commit message: ${error.message}`);
    }
    throw error;
  }
}

export async function generateErrorSuggestion(errorText) {
  const { apiKey } = validateConfig();
  
  if (!errorText || errorText.trim().length === 0) {
    throw new Error('No error text provided for suggestion generation');
  }

  // Sanitize error text to remove sensitive information
  const sanitizedError = sanitizeErrorText(errorText);

  const url = `${GEMINI_API_URL}?key=${apiKey}`;
  
  const requestBody = {
    system_instruction: {
      parts: [
        {
          text: `You are an expert Git troubleshooting assistant. Analyze Git errors and provide clear, actionable solutions.

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

Format your response as actionable steps.`
        }
      ]
    },
    contents: [
      {
        parts: [
          {
            text: `Analyze this Git error and provide a solution:\n\n${sanitizedError}`
          }
        ]
      }
    ]
  };

  try {
    logger.debug('Sending error analysis request to Gemini API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const suggestion = data.candidates[0].content.parts[0].text.trim();

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