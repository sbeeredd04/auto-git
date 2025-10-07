import chokidar from 'chokidar';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage, analyzeChangesForCommit } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions, getCommitConfig, getIntelligentCommitConfig } from './config.js';
import { safeGitOperation } from './errorHandler.js';
import { forceExit } from './utils.js';
import logger from '../utils/logger.js';

let debounceTimer = null;
let activitySettleTimer = null;
let isProcessing = false;
let cancelCommitTimer = null;
let pendingCommitData = null;
let lastDiffHash = null; // Track last diff to avoid unnecessary API calls
let lastCommitTime = 0; // Track last commit time for intelligent mode debouncing
let recentActivity = false; // Track if there's been recent file activity
let activityCount = 0; // Count file changes to detect active development

// Utility function to create a simple hash of diff content
function createDiffHash(diffText) {
  if (!diffText) return null;
  
  // Simple hash function for diff content
  let hash = 0;
  for (let i = 0; i < diffText.length; i++) {
    const char = diffText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

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
        
        // Track activity for intelligent mode
        recentActivity = true;
        activityCount++;
        
        // Cancel pending commit if new changes detected during buffer period
        if (pendingCommitData && config.commitMode === 'intelligent') {
          const intelligentConfig = getIntelligentCommitConfig();
          if (intelligentConfig.cancelOnNewChanges) {
            logger.info('🔄 New changes detected during buffer period, cancelling pending commit...', 'ACTIVITY');
            cancelPendingCommit();
          }
        }
        
        // Clear existing timers
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        if (activitySettleTimer) {
          clearTimeout(activitySettleTimer);
        }
        
        // For intelligent mode, use enhanced debouncing logic
        if (config.commitMode === 'intelligent') {
          handleIntelligentModeActivity();
        } else {
          // Standard periodic mode debouncing
          debounceTimer = setTimeout(async () => {
            await handleChange();
          }, config.debounceMs);
        }
      });
    }).catch(reject);
  });
}

function handleIntelligentModeActivity() {
  const intelligentConfig = getIntelligentCommitConfig();
  
  // Reset activity settle timer - wait for user to stop making changes
  activitySettleTimer = setTimeout(async () => {
    recentActivity = false;
    
    // Check if enough time has passed since last commit
    const timeSinceLastCommit = Date.now() - lastCommitTime;
    if (timeSinceLastCommit < intelligentConfig.minTimeBetweenCommits) {
      const remainingTime = Math.ceil((intelligentConfig.minTimeBetweenCommits - timeSinceLastCommit) / 1000 / 60);
      logger.info(`⏱️ Intelligent mode: ${remainingTime} minutes remaining before next commit analysis`, 'DEBOUNCE');
      
      // Schedule analysis for when the minimum time has passed
      debounceTimer = setTimeout(async () => {
        if (!recentActivity) {
          await handleChange();
        }
      }, intelligentConfig.minTimeBetweenCommits - timeSinceLastCommit);
      return;
    }
    
    // Proceed with analysis if no recent activity and enough time has passed
    if (!recentActivity) {
      logger.info(` Intelligent mode: Activity settled (${activityCount} changes), analyzing for commit...`, 'ANALYSIS');
      activityCount = 0; // Reset activity counter
      await handleChange();
    }
  }, intelligentConfig.activitySettleTime);
  
  logger.debug(`⚡ Activity detected, waiting ${Math.ceil(intelligentConfig.activitySettleTime / 1000 / 60)} minutes for activity to settle...`);
}

function setupKeyboardControls() {
  // Handle Ctrl+C for graceful shutdown
  process.on('SIGINT', () => {
    logger.space();
    logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
    cleanup();
    forceExit(0);
  });

  // Handle keypress events for commit cancellation
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (key) => {
      // Handle Ctrl+C for shutdown
      if (key === '\u0003') {
        logger.space();
        logger.info('Shutting down Auto-Git...', 'SHUTDOWN');
        cleanup();
        forceExit(0);
      }
      
      // Handle Ctrl+X (ASCII 24) to cancel pending commit
      if (key === '\u0018' && pendingCommitData) {
        cancelPendingCommit();
      }
      
      // Handle 'c' key to cancel pending commit (backward compatibility)
      if (key.toLowerCase() === 'c' && pendingCommitData) {
        cancelPendingCommit();
      }
      
      // Handle 'x' key to cancel pending commit (alternative)
      if (key.toLowerCase() === 'x' && pendingCommitData) {
        cancelPendingCommit();
      }
    });
  }
}

async function handleChange() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    await safeGitOperation(async () => {
      const hasAnyChanges = await hasChanges();
      if (!hasAnyChanges) {
        logger.debug('No changes detected, skipping analysis');
        return;
      }

      const diff = await getDiff();
      if (!diff || diff.trim().length === 0) {
        logger.debug('No meaningful diff found, skipping analysis');
        return;
      }

      // Create hash of current diff to check if it's actually new
      const currentDiffHash = createDiffHash(diff);
      
      // Skip if this is the same diff we already processed
      if (currentDiffHash === lastDiffHash) {
        logger.debug('Diff unchanged since last analysis, skipping Gemini call');
        return;
      }
      
      // Update the last diff hash
      lastDiffHash = currentDiffHash;
      
      const commitConfig = getCommitConfig();
      
      logger.info('📝 New changes detected, analyzing...', 'CHANGE');
      
      if (commitConfig.commitMode === 'intelligent') {
        await handleIntelligentCommit(diff, commitConfig);
      } else {
        await handlePeriodicCommit(diff, commitConfig);
      }
    }, 'Auto-commit operation');
    
  } catch (error) {
    logger.error('Auto-commit failed', error.message);
    logger.space();
    logger.info(' Tip: Use "auto-git interactive" for manual troubleshooting', 'HELP');
  } finally {
    isProcessing = false;
  }
}

async function handlePeriodicCommit(diff, commitConfig) {
  const spinner = logger.startSpinner('Generating AI commit message...');
  
  try {
    const message = await generateCommitMessage(diff);
    logger.succeedSpinner('AI commit message generated');
    
    // Use buffer period for periodic commits too
    await startCommitBuffer(message, diff, commitConfig);
    
  } catch (error) {
    logger.failSpinner('Commit operation failed');
    throw error;
  }
}

async function handleIntelligentCommit(diff, commitConfig) {
  const intelligentConfig = getIntelligentCommitConfig();
  const spinner = logger.startSpinner(' Analyzing changes for commit decision...');
  
  try {
    const analysis = await analyzeChangesForCommit(
      diff, 
      intelligentConfig.commitThreshold, 
      intelligentConfig.requireCompleteness
    );
    logger.succeedSpinner('AI analysis completed');
    
    logger.space();
    logger.info(` Enhanced Change Analysis:`, 'ANALYSIS');
    logger.info(`   Significance: ${analysis.significance.toUpperCase()}`, 'DETAIL');
    logger.info(`   Completeness: ${analysis.completeness.toUpperCase()}`, 'DETAIL');
    logger.info(`   Change Type: ${analysis.changeType.toUpperCase()}`, 'DETAIL');
    logger.info(`   Risk Level: ${analysis.riskLevel.toUpperCase()}`, 'DETAIL');
    logger.info(`   Threshold: ${intelligentConfig.commitThreshold.toUpperCase()}`, 'DETAIL');
    logger.info(`   Decision: ${analysis.shouldCommit ? ' COMMIT' : ' SKIP'}`, 'DETAIL');
    logger.info(`   Reason: ${analysis.reason}`, 'DETAIL');
    
    if (!analysis.shouldCommit) {
      logger.info('🔄 Continuing to monitor for changes that meet the configured threshold...', 'WAITING');
      return;
    }
    
    // Get commit message (use AI suggestion or generate new one)
    let commitMessage = analysis.commitMessage;
    if (!commitMessage) {
      const messageSpinner = logger.startSpinner('Generating commit message...');
      commitMessage = await generateCommitMessage(diff);
      logger.succeedSpinner('Commit message generated');
    }
    
    // Start the buffer period for user cancellation
    await startCommitBuffer(commitMessage, diff, commitConfig, analysis);
    
  } catch (error) {
    logger.failSpinner('Intelligent commit analysis failed');
    throw error;
  }
}

async function startCommitBuffer(commitMessage, diff, commitConfig, analysis = null) {
  const intelligentConfig = getIntelligentCommitConfig();
  const bufferSeconds = intelligentConfig.bufferTimeSeconds;
  
  pendingCommitData = { commitMessage, diff, analysis };
  
  logger.space();
  logger.section(' Enhanced Commit Buffer Period', `${bufferSeconds} seconds to cancel`);
  logger.space();
  logger.info(`💬 ${commitMessage}`, 'COMMIT');
  
  if (analysis) {
    logger.space();
    logger.info(` Change Summary:`, 'SUMMARY');
    logger.info(`   Type: ${analysis.changeType} | Significance: ${analysis.significance} | Risk: ${analysis.riskLevel}`, 'DETAIL');
  }
  
  logger.space();
  if (intelligentConfig.cancelOnNewChanges) {
    logger.info(`Press 'c', 'x', or Ctrl+X to cancel, or make file changes to auto-cancel...`, 'CONTROL');
  } else {
    logger.info(`Press 'c', 'x', or Ctrl+X to cancel this commit within ${bufferSeconds} seconds...`, 'CONTROL');
  }
  
  // Start countdown
  let remainingSeconds = bufferSeconds;
  const countdownInterval = setInterval(() => {
    remainingSeconds--;
    if (remainingSeconds > 0 && pendingCommitData) { // Check if still pending
      const cancelHint = intelligentConfig.cancelOnNewChanges ? ' (or edit files to cancel)' : '';
      process.stdout.write(`\r⏳ Committing in ${remainingSeconds} seconds... (Press 'c', 'x', or Ctrl+X to cancel${cancelHint})`);
    }
  }, 1000);
  
  cancelCommitTimer = setTimeout(async () => {
    clearInterval(countdownInterval);
    process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear countdown line
    
    if (pendingCommitData) {
      await executeCommit(pendingCommitData.commitMessage);
      lastCommitTime = Date.now(); // Update last commit time for intelligent mode debouncing
      pendingCommitData = null;
    }
  }, bufferSeconds * 1000);
}

function cancelPendingCommit() {
  if (cancelCommitTimer) {
    clearTimeout(cancelCommitTimer);
    cancelCommitTimer = null;
  }
  
  if (pendingCommitData) {
    process.stdout.write('\r' + ' '.repeat(100) + '\r'); // Clear countdown line
    logger.space();
    logger.info(' Commit cancelled by user', 'CANCELLED');
    logger.space();
    pendingCommitData = null;
    
    // Reset activity tracking to prevent immediate re-analysis
    recentActivity = true;
    activityCount = 0;
  }
}

async function executeCommit(commitMessage) {
  const commitSpinner = logger.startSpinner('Executing commit...');
  
  try {
    await addAll();
    await commit(commitMessage);
    
    const commitConfig = getCommitConfig();
    const remote = await hasRemote();
    const shouldPush = !commitConfig.noPush && remote;
    
    if (shouldPush) {
      await push();
      logger.succeedSpinner('Committed and pushed successfully');
    } else {
      const reason = commitConfig.noPush ? '(push disabled)' : '(no remote to push)';
      logger.succeedSpinner(`Committed successfully ${reason}`);
    }
    
    logger.commitSummary(commitMessage, shouldPush);
    
  } catch (error) {
    logger.failSpinner('Commit execution failed');
    throw error;
  }
}

export async function performSingleCommit() {
  logger.section('Single Commit Mode', 'Generating AI commit for current changes');
  
  try {
    await safeGitOperation(async () => {
      const hasAnyChanges = await hasChanges();
      if (!hasAnyChanges) {
        logger.info(' Working directory clean', 'No changes to commit');
        return;
      }

      const diff = await getDiff();
      if (!diff || diff.trim().length === 0) {
        logger.info(' No meaningful changes', 'Diff is empty');
        return;
      }

      const spinner = logger.startSpinner(' Generating AI commit message...');
      
      try {
        const message = await generateCommitMessage(diff);
        logger.succeedSpinner('AI commit message generated');
        
        logger.space();
        logger.section(' AI-Generated Commit Message', 'Proposed commit for your changes');
        logger.space();
        logger.info(`💬 ${message}`, 'COMMIT');
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
    logger.info(' Tip: Use "auto-git interactive" for manual troubleshooting', 'HELP');
    process.exit(1);
  }
}

export function cleanup() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  
  if (activitySettleTimer) {
    clearTimeout(activitySettleTimer);
    activitySettleTimer = null;
  }
  
  if (cancelCommitTimer) {
    clearTimeout(cancelCommitTimer);
    cancelCommitTimer = null;
  }
  
  if (pendingCommitData) {
    pendingCommitData = null;
  }
  
  // Reset all tracking variables
  lastDiffHash = null;
  lastCommitTime = 0;
  recentActivity = false;
  activityCount = 0;
  
  // Restore terminal settings
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
} 