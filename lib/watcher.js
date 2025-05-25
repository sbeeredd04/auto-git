import chokidar from 'chokidar';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions } from './config.js';
import { safeGitOperation } from './errorHandler.js';
import { forceExit } from './utils.js';
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
        setupKeyboardControls();
        logger.status('File watcher ready - monitoring for changes', 'success');
        logger.info('Use Ctrl+C to stop and exit', 'CONTROL');
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

function setupKeyboardControls() {
  // Handle Ctrl+C for graceful shutdown
  process.on('SIGINT', () => {
    logger.space();
    logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
    cleanup();
    forceExit(0);
  });
}

async function handleChange() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    await safeGitOperation(async () => {
      const hasAnyChanges = await hasChanges();
      if (!hasAnyChanges) {
        logger.info('No changes detected', 'Skipping commit');
        return;
      }

      const diff = await getDiff();
      if (!diff || diff.trim().length === 0) {
        logger.info('No meaningful diff found', 'Skipping commit');
        return;
      }

      const spinner = logger.startSpinner('Generating AI commit message...');
      
      try {
        const message = await generateCommitMessage(diff);
        logger.succeedSpinner('AI commit message generated');
        
        logger.commitMessage(message);
        
        const commitSpinner = logger.startSpinner('Committing changes...');
        
        await addAll();
        await commit(message);
        
        const remote = await hasRemote();
        if (remote) {
          await push();
          logger.succeedSpinner('Committed and pushed successfully');
        } else {
          logger.succeedSpinner('Committed successfully (no remote to push)');
        }
        
        logger.commitSummary(message, remote);
        
      } catch (error) {
        logger.failSpinner('Commit operation failed');
        throw error;
      }
    }, 'Auto-commit operation');
    
  } catch (error) {
    logger.error('Auto-commit failed', error.message);
    logger.space();
    logger.info('💡 Tip: Use "auto-git interactive" for manual troubleshooting', 'HELP');
  } finally {
    isProcessing = false;
  }
}

export async function performSingleCommit() {
  logger.section('Single Commit Mode', 'Generating AI commit for current changes');
  
  try {
    await safeGitOperation(async () => {
      const hasAnyChanges = await hasChanges();
      if (!hasAnyChanges) {
        logger.info('✅ Working directory clean', 'No changes to commit');
        return;
      }

      const diff = await getDiff();
      if (!diff || diff.trim().length === 0) {
        logger.info('✅ No meaningful changes', 'Diff is empty');
        return;
      }

      const spinner = logger.startSpinner('🤖 Generating AI commit message...');
      
      try {
        const message = await generateCommitMessage(diff);
        logger.succeedSpinner('AI commit message generated');
        
        logger.space();
        logger.section('🤖 AI-Generated Commit Message', 'Proposed commit for your changes');
        logger.space();
        logger.commitMessage(message);
        logger.space();
        
        const commitSpinner = logger.startSpinner('Committing changes...');
        
        await addAll();
        await commit(message);
        
        const remote = await hasRemote();
        if (remote) {
          await push();
          logger.succeedSpinner('Committed and pushed successfully');
        } else {
          logger.succeedSpinner('Committed successfully (no remote to push)');
        }
        
        logger.space();
        logger.commitSummary(message, remote);
        
      } catch (error) {
        logger.failSpinner('Commit operation failed');
        throw error;
      }
    }, 'Single commit operation');
    
  } catch (error) {
    logger.error('Single commit failed', error.message);
    logger.space();
    logger.info('💡 Tip: Use "auto-git interactive" for manual troubleshooting', 'HELP');
    process.exit(1);
  }
}

export function cleanup() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
} 