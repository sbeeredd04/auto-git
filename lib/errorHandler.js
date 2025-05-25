import { generateErrorSuggestion } from './gemini.js';
import { getInteractiveConfig } from './config.js';
import { startInteractiveSession } from './repl.js';
import { formatAISuggestion, formatError } from '../utils/markdown.js';
import logger from '../utils/logger.js';

export async function safeGitOperation(operation, operationName = 'Git operation') {
  try {
    return await operation();
  } catch (error) {
    return await handleGitError(error, operationName, operation);
  }
}

async function handleGitError(error, operationName, originalOperation) {
  const config = getInteractiveConfig();
  
  logger.error(`${operationName} failed`, error.message);
  
  // If interactive error handling is disabled, just throw the error
  if (!config.interactiveOnError) {
    throw error;
  }
  
  let suggestion = null;
  
  // Try to get AI suggestion if enabled
  if (config.enableSuggestions) {
    try {
      const spinner = logger.startSpinner('🤖 Getting AI suggestion for error...');
      suggestion = await generateErrorSuggestion(error.message);
      logger.succeedSpinner('AI suggestion generated');
      
      logger.space();
      
      // Use markdown formatting for AI suggestions
      const formattedSuggestion = formatAISuggestion(suggestion);
      console.log(formattedSuggestion);
      
    } catch (suggestionError) {
      logger.failSpinner('Failed to get AI suggestion');
      logger.debug('Suggestion error:', suggestionError.message);
      
      // Provide a quick suggestion based on error patterns
      suggestion = getQuickSuggestion(error.message);
      
      if (suggestion) {
        logger.space();
        logger.section('💡 Quick Suggestion', 'Based on error patterns');
        logger.space();
        logger.info(suggestion);
        logger.space();
      }
    }
  }
  
  // Offer to start interactive session
  logger.space();
  logger.info('💡 Tip: Use "auto-git interactive" to troubleshoot manually', 'HELP');
  logger.space();
  
  // For now, we'll throw the original error to let the calling code handle it
  // In a future version, we could implement a more sophisticated retry mechanism
  throw error;
}

export function createSafeGitWrapper(gitFunction, operationName) {
  return async (...args) => {
    return await safeGitOperation(
      () => gitFunction(...args),
      operationName
    );
  };
}

// Common Git error patterns and their suggested actions
export const ERROR_PATTERNS = {
  MERGE_CONFLICT: {
    pattern: /merge conflict|conflict.*merge/i,
    suggestion: 'Resolve merge conflicts manually, then run: git add . && git commit'
  },
  PUSH_REJECTED: {
    pattern: /push.*rejected|non-fast-forward/i,
    suggestion: 'Pull latest changes first: git pull --rebase'
  },
  NO_UPSTREAM: {
    pattern: /no upstream branch|set-upstream/i,
    suggestion: 'Set upstream branch: git push --set-upstream origin <branch-name>'
  },
  AUTHENTICATION: {
    pattern: /authentication failed|permission denied/i,
    suggestion: 'Check your Git credentials or SSH keys'
  },
  DETACHED_HEAD: {
    pattern: /detached head/i,
    suggestion: 'Switch to a branch: git checkout main'
  },
  UNCOMMITTED_CHANGES: {
    pattern: /uncommitted changes|working tree clean/i,
    suggestion: 'Stash or commit your changes: git stash or git add . && git commit'
  }
};

export function getQuickSuggestion(errorMessage) {
  for (const [key, { pattern, suggestion }] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(errorMessage)) {
      return suggestion;
    }
  }
  return 'Run "git status" to see the current state of your repository';
} 