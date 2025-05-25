import chokidar from 'chokidar';
import keypress from 'keypress';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions, getInteractiveConfig } from './config.js';
import { safeGitOperation } from './errorHandler.js';
import { startRepl, isReplActive } from './repl.js';
import { showNavigationMenu, isMenuActive, cleanupMenu } from './navigationMenu.js';
import { cleanupStdin, setupStdin, forceExit } from './utils.js';
import logger from '../utils/logger.js';

let debounceTimer = null;
let isProcessing = false;
let watching = true;
let keyboardListenerActive = false;

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
        logger.info('Keyboard shortcuts:', 'CONTROL');
        logger.info('  Ctrl+P - Pause and show navigation menu', '');
        logger.info('  Ctrl+R - Global resume (works from anywhere)', '');
        logger.info('  Ctrl+C - Stop and exit', '');
        logger.info('  When paused: Use ↑↓ arrows to navigate, Enter to select', '');
        resolve(watcher);
      });

      watcher.on('error', error => {
        logger.error('File watcher error', error.message);
        reject(error);
      });

      watcher.on('all', async (event, filePath) => {
        if (!ready || isProcessing || !watching || isReplActive()) return;
        
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
  if (keyboardListenerActive) return;
  
  // Enable keypress on stdin
  keypress(process.stdin);
  
  process.stdin.on('keypress', async (ch, key) => {
    if (!key) return;
    
    // Handle Ctrl+C for graceful shutdown - force exit everything
    if (key.ctrl && key.name === 'c') {
      logger.space();
      logger.info('Force exiting Auto-Git...', 'SHUTDOWN');
      cleanupKeyboardControls();
      cleanupMenu();
      forceExit(0);
    }
    
    // Handle Ctrl+R for global resume - works from anywhere
    if (key.ctrl && key.name === 'r') {
      // If REPL is active, exit it and resume watcher
      if (isReplActive()) {
        logger.space();
        logger.info('Global resume triggered - exiting REPL and resuming watcher...', 'RESUME');
        // The REPL will handle this and return 'resume'
        return;
      }
      
      // If menu is active, close it and resume
      if (isMenuActive()) {
        cleanupMenu();
      }
      
      // Resume watcher
      watching = true;
      logger.space();
      logger.success('🔄 Global resume activated - Watcher resumed', 'Monitoring for changes...');
      return;
    }
    
    // Don't handle other keyboard shortcuts when REPL is active or menu is active
    if (isReplActive() || isMenuActive()) return;
    
    // Handle Ctrl+P for pause and show navigation menu
    if (key.ctrl && key.name === 'p') {
      watching = false;
      const selectedAction = await showNavigationMenu();
      
      switch (selectedAction) {
        case 'resume':
          watching = true;
          logger.success('▶  Watcher resumed', 'Monitoring for changes...');
          break;
          
        case 'interactive':
          logger.info('🔧 Entering interactive mode...', 'MANUAL');
          const replResult = await startRepl();
          
          // Handle REPL result
          if (replResult === 'resume') {
            watching = true;
            logger.success('▶  Watcher resumed from interactive mode', 'Monitoring for changes...');
          } else if (replResult === 'force_exit') {
            // REPL requested force exit
            logger.info('Force exiting Auto-Git...', 'SHUTDOWN');
            cleanupKeyboardControls();
            cleanupMenu();
            forceExit(0);
          } else {
            // After REPL exits, show the menu again if still paused
            if (!watching) {
              const nextAction = await showNavigationMenu();
              if (nextAction === 'resume') {
                watching = true;
                logger.success('▶  Watcher resumed', 'Monitoring for changes...');
              } else if (nextAction === 'exit') {
                logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
                cleanupKeyboardControls();
                cleanupMenu();
                forceExit(0);
              }
            }
          }
          break;
          
        case 'exit':
          logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
          cleanupKeyboardControls();
          cleanupMenu();
          forceExit(0);
          break;
          
        case 'cancel':
          // Resume watching if user cancels
          watching = true;
          logger.success('▶  Watcher resumed', 'Monitoring for changes...');
          break;
      }
    }
  });
  
  // Setup stdin properly
  setupStdin();
  
  keyboardListenerActive = true;
}

function cleanupKeyboardControls() {
  if (keyboardListenerActive) {
    cleanupStdin();
    keyboardListenerActive = false;
  }
}

async function handleChange() {
  if (isProcessing || !watching) return;
  
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
      
      // Perform git operations with error handling
      await safeGitOperation(async () => {
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
      }, 'Auto-commit operation');
      
    } catch (error) {
      logger.failSpinner('Failed to generate commit message');
      throw error;
    }
    
  } catch (error) {
    // Error handling is now managed by safeGitOperation
    // Just log that we're continuing to watch
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
    
    // Perform git operations with error handling
    await safeGitOperation(async () => {
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
    }, 'Single commit operation');
    
  } catch (error) {
    logger.failSpinner('Commit operation failed');
    throw error;
  }
}

export function pauseWatcher() {
  watching = false;
  logger.warning('⏸  Watcher paused', 'Use resumeWatcher() or Ctrl+R to resume');
}

export function resumeWatcher() {
  watching = true;
  logger.success('▶  Watcher resumed', 'Monitoring for changes...');
}

export function isWatcherPaused() {
  return !watching;
}

export function cleanup() {
  cleanupKeyboardControls();
  cleanupMenu();
} 