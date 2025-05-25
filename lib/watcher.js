import chokidar from 'chokidar';
import keypress from 'keypress';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions, getInteractiveConfig } from './config.js';
import { safeGitOperation } from './errorHandler.js';
import { startRepl, isReplActive } from './repl.js';
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
        logger.info('  Ctrl+P - Pause watching', '');
        logger.info('  Ctrl+R - Resume watching', '');
        logger.info('  Ctrl+I - Enter interactive mode', '');
        logger.info('  Ctrl+C - Stop and exit', '');
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
  
  const interactiveConfig = getInteractiveConfig();
  
  // Enable keypress on stdin
  keypress(process.stdin);
  
  process.stdin.on('keypress', async (ch, key) => {
    if (!key) return;
    
    // Don't handle keyboard shortcuts when REPL is active
    if (isReplActive()) return;
    
    // Handle Ctrl+C for graceful shutdown
    if (key.ctrl && key.name === 'c') {
      logger.space();
      logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
      cleanupKeyboardControls();
      process.exit(0);
    }
    
    // Parse hotkey configuration
    const pauseKey = interactiveConfig.hotkeys.pause.replace('ctrl+', '');
    const resumeKey = interactiveConfig.hotkeys.resume.replace('ctrl+', '');
    const replKey = interactiveConfig.hotkeys.enterRepl.replace('ctrl+', '');
    
    if (key.ctrl && key.name === pauseKey) {
      watching = false;
      logger.warning('⏸  Watcher paused', 'Press Ctrl+R to resume');
    }
    
    if (key.ctrl && key.name === resumeKey) {
      watching = true;
      logger.success('▶  Watcher resumed', 'Monitoring for changes...');
    }
    
    if (key.ctrl && key.name === replKey) {
      if (!isReplActive()) {
        logger.info('🔧 Entering interactive mode...', 'MANUAL');
        await startRepl();
      }
    }
  });
  
  // Only set raw mode if stdin supports it and it's not already set
  if (process.stdin.setRawMode && !process.stdin.isRaw) {
    process.stdin.setRawMode(true);
  }
  
  // Ensure stdin is resumed for keypress events
  if (process.stdin.isPaused()) {
    process.stdin.resume();
  }
  
  keyboardListenerActive = true;
}

function cleanupKeyboardControls() {
  if (keyboardListenerActive && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
    // Don't pause stdin here as it might be needed by other parts of the application
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
} 