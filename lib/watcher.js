import chokidar from 'chokidar';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions } from './config.js';
import logger from '../utils/logger.js';

let debounceTimer = null;
let isProcessing = false;

export function startWatcher(paths = null) {
  return new Promise((resolve, reject) => {
    const config = getConfig();
    
    // Use provided paths or fall back to config defaults
    const watchPaths = paths || getWatchPatterns();
    const watchOptions = getWatchOptions();
    
    // Validate we're in a git repository
    isGitRepository().then(isRepo => {
      if (!isRepo) {
        reject(new Error('Not a git repository. Please run this command in a git repository.'));
        return;
      }
      
      logger.watchConfig(
        watchPaths, 
        config.debounceMs, 
        watchOptions.depth === undefined
      );
      
      const watcher = chokidar.watch(watchPaths, watchOptions);

      let ready = false;

      watcher.on('ready', () => {
        ready = true;
        logger.status('File watcher ready - monitoring for changes', 'success');
        logger.info('Press Ctrl+C to stop watching', 'CONTROL');
        resolve(watcher);
      });

      watcher.on('error', error => {
        logger.error('File watcher error', error.message);
        reject(error);
      });

      watcher.on('all', async (event, filePath) => {
        if (!ready || isProcessing) return;
        
        logger.fileChange(event, filePath);
        
        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Set new timer
        debounceTimer = setTimeout(async () => {
          await handleChange();
        }, config.debounceMs);
      });
    }).catch(reject);
  });
}

async function handleChange() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    logger.space();
    logger.stage('Processing detected changes...', 'processing');
    
    // Check if there are any changes
    const hasAnyChanges = await hasChanges();
    if (!hasAnyChanges) {
      logger.info('No changes detected, skipping commit');
      return;
    }
    
    // Get the diff
    const diff = await getDiff();
    if (!diff || diff.trim().length === 0) {
      logger.info('No meaningful diff found, skipping commit');
      return;
    }
    
    const spinner = logger.startSpinner('Generating AI commit message...');
    
    try {
      // Generate commit message
      const message = await generateCommitMessage(diff);
      logger.succeedSpinner('AI commit message generated');
      
      // Perform git operations
      logger.stage('Staging all changes...', 'processing');
      await addAll();
      
      logger.stage(`Committing: "${message}"`, 'processing');
      await commit(message);
      
      // Only push if we have a remote
      const remote = await hasRemote();
      if (remote) {
        logger.stage('Pushing to remote...', 'processing');
        await push();
      }
      
      logger.commitSummary(message, remote);
      logger.status('Waiting for more changes...', 'info');
      
    } catch (error) {
      logger.failSpinner('Failed to generate commit message');
      throw error;
    }
    
  } catch (error) {
    logger.error('Auto-commit failed', error.message);
    
    // Provide specific guidance based on error type
    if (error.message.includes('GEMINI_API_KEY')) {
      logger.warning(
        'API key issue detected',
        'Make sure GEMINI_API_KEY environment variable is set correctly'
      );
    } else if (error.message.includes('API error')) {
      logger.warning(
        'API communication issue',
        'Check your internet connection and API key validity'
      );
    }
    
    logger.status('Continuing to watch for changes...', 'info');
  } finally {
    isProcessing = false;
  }
}

export async function performSingleCommit() {
  logger.section('Single Commit Mode', 'Analyzing current changes');
  
  // Validate we're in a git repository
  const isRepo = await isGitRepository();
  if (!isRepo) {
    throw new Error('Not a git repository. Please run this command in a git repository.');
  }
  
  // Check if there are any changes
  const hasAnyChanges = await hasChanges();
  if (!hasAnyChanges) {
    logger.info('No changes to commit');
    return;
  }
  
  // Get the diff
  const diff = await getDiff();
  if (!diff || diff.trim().length === 0) {
    logger.info('No meaningful diff found');
    return;
  }
  
  const spinner = logger.startSpinner('Analyzing changes and generating commit message...');
  
  try {
    // Generate commit message
    const message = await generateCommitMessage(diff);
    logger.succeedSpinner('Commit message generated successfully');
    
    // Perform git operations
    logger.stage('Staging all changes...', 'processing');
    await addAll();
    
    logger.stage(`Committing: "${message}"`, 'processing');
    await commit(message);
    
    // Only push if we have a remote
    const remote = await hasRemote();
    if (remote) {
      logger.stage('Pushing to remote...', 'processing');
      await push();
    }
    
    logger.commitSummary(message, remote);
    
  } catch (error) {
    logger.failSpinner('Commit operation failed');
    throw error;
  }
} 