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