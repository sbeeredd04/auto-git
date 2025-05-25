import { createInterface } from 'readline';
import keypress from 'keypress';
import { execa } from 'execa';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { hasChanges, getDiff, addAll, commit, push, hasRemote } from './git.js';
import { generateCommitMessage, generateErrorSuggestion } from './gemini.js';
import { cleanupStdin, setupStdin, forceExit } from './utils.js';

let replActive = false;
let originalRawMode = false;
let rl = null;

export async function startRepl(error = null, suggestion = null) {
  if (replActive) {
    logger.warning('REPL already active', 'Ignoring duplicate request');
    return 'continue';
  }

  replActive = true;
  let exitReason = 'exit';
  
  // Store original raw mode state
  originalRawMode = process.stdin.isRaw || false;
  
  // Clean up any existing listeners and setup fresh state
  cleanupStdin();
  
  // Create readline interface
  rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('auto-git> ')
  });
  
  try {
    logger.space();
    logger.section('Interactive Mode', 'Auto-Git REPL activated - Simple Git command pass-through');
    
    if (error) {
      logger.space();
      logger.error('Error Context', error);
    }
    
    if (suggestion) {
      logger.space();
      logger.info('🤖 AI Suggestion', suggestion);
    }
    
    logger.space();
    const commands = {
      'retry': 'Retry the last failed operation',
      'reset <args>': 'Reset commits (e.g., reset --hard HEAD~1)',
      'status': 'Show git status with colored output',
      'diff': 'Show current diff',
      'commit': 'Manual commit with AI message',
      'git <cmd>': 'Execute any git command directly',
      'help': 'Show detailed help message',
      'exit': 'Exit REPL and continue',
      'resume': 'Resume watcher and exit REPL'
    };
    
    logger.config('AVAILABLE COMMANDS', commands);
    
    logger.space();
    logger.info('💡 Pro Tips:', 'TIPS');
    logger.info('  • Type any git command directly (e.g., "git pull", "git status")');
    logger.info('  • Or use shortcuts: "pull", "status", "log", etc.');
    logger.info('  • Type "resume" to resume watcher and exit REPL');
    logger.info('  • Type "exit" to exit REPL without resuming');
    logger.info('  • Use Ctrl+C to force exit or Ctrl+R to resume globally');
    logger.space();

    exitReason = await new Promise((resolve) => {
      rl.on('line', async (input) => {
        const command = input.trim();
        
        if (!command) {
          rl.prompt();
          return;
        }

        const [action, ...args] = command.split(' ');
        
        try {
          const result = await executeReplCommand(action, args);
          if (result === 'exit') {
            resolve('exit');
            return;
          }
          if (result === 'retry') {
            logger.info('Exiting REPL to retry operation...', 'RETRY');
            resolve('retry');
            return;
          }
          if (result === 'resume') {
            logger.info('Resuming watcher...', 'RESUME');
            resolve('resume');
            return;
          }
        } catch (err) {
          logger.space();
          logger.error('Command execution failed', err.message);
          logger.space();
        }
        
        rl.prompt();
      });

      // Handle Ctrl+C in REPL - force exit everything
      rl.on('SIGINT', () => {
        logger.space();
        logger.info('Force exiting Auto-Git...', 'SHUTDOWN');
        resolve('force_exit');
      });

      // Global keypress handler for Ctrl+R
      const globalKeyHandler = (ch, key) => {
        if (key && key.ctrl && key.name === 'r') {
          logger.space();
          logger.info('Global Ctrl+R detected - resuming watcher...', 'RESUME');
          resolve('resume');
        }
      };

      // Add global keypress listener
      process.stdin.on('keypress', globalKeyHandler);

      // Clean up the global listener when REPL exits
      const originalResolve = resolve;
      resolve = (reason) => {
        process.stdin.removeListener('keypress', globalKeyHandler);
        originalResolve(reason);
      };

      rl.prompt();
    });
    
  } finally {
    replActive = false;
    
    // Clean up readline
    if (rl) {
      rl.close();
      rl = null;
    }
    
    // Clean up stdin properly
    cleanupStdin();
    
    // If force exit was requested, exit immediately
    if (exitReason === 'force_exit') {
      forceExit(0);
    }
    
    // Restore stdin for keyboard shortcuts
    setupStdin();
    
    logger.space();
    logger.info('Exiting interactive mode...', 'SHUTDOWN');
  }
  
  return exitReason;
}

async function executeReplCommand(action, args) {
  switch (action.toLowerCase()) {
    case 'retry':
      return 'retry';
      
    case 'resume':
      return 'resume';
      
    case 'reset':
      await handleReset(args);
      break;
      
    case 'status':
      await handleStatus();
      break;
      
    case 'diff':
      await handleDiff();
      break;
      
    case 'commit':
      await handleManualCommit();
      break;
      
    case 'git':
      await handleGitCommand(args);
      break;
      
    case 'help':
      await handleHelp();
      break;
      
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';
      
    default:
      // Try to execute as a git command if it looks like one
      if (isLikelyGitCommand(action)) {
        await handleGitCommand([action, ...args]);
      } else {
        logger.space();
        logger.warning('Unknown command', `"${action}" - type "help" for available commands`);
        logger.space();
        logger.info('💡 Quick Help:', 'HELP');
        logger.info('  help                          # Show all commands');
        logger.info('  git <command>                 # Run any git command');
        logger.info('  <git-subcommand>              # Direct git subcommands');
        logger.info('  resume                        # Resume watcher');
        logger.space();
      }
  }
  
  return 'continue';
}

function isLikelyGitCommand(command) {
  // Common git subcommands that users might type directly
  const gitCommands = [
    'add', 'branch', 'checkout', 'clone', 'commit', 'diff', 'fetch', 'init',
    'log', 'merge', 'pull', 'push', 'rebase', 'remote', 'reset', 'stash',
    'status', 'tag', 'show', 'config', 'blame', 'cherry-pick', 'revert',
    'bisect', 'clean', 'mv', 'rm', 'restore', 'switch'
  ];
  
  return gitCommands.includes(command.toLowerCase());
}

async function handleGitCommand(args) {
  if (args.length === 0) {
    logger.space();
    logger.warning('Git command requires arguments', 'Please specify a git command to run');
    logger.space();
    logger.info('Examples:', 'USAGE');
    logger.info('  git status                    # Show repository status');
    logger.info('  git log --oneline             # Show commit history');
    logger.info('  git branch -a                 # List all branches');
    logger.info('  log --graph --oneline         # Direct subcommand');
    logger.space();
    return;
  }
  
  const gitArgs = args.join(' ');
  const spinner = logger.startSpinner(`Running git ${gitArgs}...`);
  
  try {
    const result = await execa('git', args, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
    });
    
    logger.succeedSpinner(`Git command completed: ${gitArgs}`);
    
    if (result.stdout && result.stdout.trim()) {
      logger.space();
      logger.info('Command Output:', 'OUTPUT');
      console.log(chalk.gray(result.stdout));
      logger.space();
    }
    
    if (result.stderr && result.stderr.trim()) {
      logger.space();
      logger.warning('Command Warnings:', result.stderr);
      logger.space();
    }
    
  } catch (error) {
    logger.failSpinner(`Git command failed: ${gitArgs}`);
    
    const errorMessage = error.stderr || error.message || 'Unknown error';
    
    logger.space();
    logger.error('Git Command Error', errorMessage);
    
    // Get AI suggestion for the failed git command (simplified - no inquirer prompt)
    logger.space();
    const aiSpinner = logger.startSpinner('🤖 Analyzing error with AI...');
    
    try {
      const suggestion = await generateErrorSuggestion(
        `Git command failed: git ${gitArgs}\nError: ${errorMessage}`
      );
      
      logger.succeedSpinner('AI analysis complete');
      logger.space();
      
      // Style the AI suggestion in a beautiful box
      logger.section('🤖 AI Suggestion', 'Intelligent troubleshooting assistance');
      logger.space();
      logger.info(suggestion);
      logger.space();
      
      // Simple message instead of inquirer prompt
      logger.info('💡 You can run the suggested commands directly in this REPL!', 'TIP');
      logger.space();
      
    } catch (aiError) {
      logger.failSpinner('AI suggestion failed');
      logger.space();
      logger.warning('Could not get AI suggestion', aiError.message);
      
      // Provide styled basic troubleshooting
      logger.space();
      logger.section('💡 Basic Troubleshooting', 'Common diagnostic commands');
      
      const troubleshootingCommands = {
        'git status': 'Check repository state',
        'git log --oneline -5': 'Check recent commits',
        'git remote -v': 'Check remote configuration',
        'git branch -a': 'Check available branches'
      };
      
      logger.config('DIAGNOSTIC COMMANDS', troubleshootingCommands);
      logger.space();
    }
  }
}

async function handleReset(args) {
  if (args.length === 0) {
    logger.space();
    logger.warning('Reset requires arguments', 'Please specify reset parameters');
    logger.space();
    logger.info('Examples:', 'USAGE');
    logger.info('  reset --hard HEAD~1           # Hard reset to previous commit');
    logger.info('  reset --soft HEAD~1           # Soft reset to previous commit');
    logger.info('  reset HEAD~2                  # Mixed reset 2 commits back');
    logger.space();
    return;
  }
  
  const spinner = logger.startSpinner(`Running git reset ${args.join(' ')}...`);
  
  try {
    const result = await execa('git', ['reset', ...args]);
    logger.succeedSpinner(`Reset completed: ${args.join(' ')}`);
    
    if (result.stdout) {
      logger.space();
      logger.info('Reset Output:', result.stdout);
      logger.space();
    }
  } catch (error) {
    logger.failSpinner('Reset failed');
    logger.space();
    logger.error('Git reset error', error.message);
    logger.space();
  }
}

async function handleStatus() {
  const spinner = logger.startSpinner('Getting git status...');
  
  try {
    const result = await execa('git', ['status', '--porcelain']);
    logger.succeedSpinner('Git status retrieved');
    
    logger.space();
    if (result.stdout.trim()) {
      logger.info('Repository Status:', 'STATUS');
      logger.space();
      result.stdout.trim().split('\n').forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        const statusColor = status.includes('M') ? 'yellow' : 
                           status.includes('A') ? 'green' : 
                           status.includes('D') ? 'red' : 
                           status.includes('??') ? 'blue' : 'white';
        const statusText = status.includes('M') ? 'Modified' :
                          status.includes('A') ? 'Added' :
                          status.includes('D') ? 'Deleted' :
                          status.includes('??') ? 'Untracked' : 'Changed';
        logger.info(`  ${chalk[statusColor](status)} ${file}`, statusText);
      });
    } else {
      logger.info('✅ Working directory clean', 'No changes detected');
    }
    logger.space();
  } catch (error) {
    logger.failSpinner('Failed to get status');
    logger.space();
    logger.error('Git status error', error.message);
    logger.space();
  }
}

async function handleDiff() {
  const spinner = logger.startSpinner('Getting git diff...');
  
  try {
    const diff = await getDiff();
    logger.succeedSpinner('Diff retrieved');
    
    logger.space();
    if (diff && diff.trim()) {
      logger.info('Current Changes:', 'DIFF');
      logger.space();
      console.log(chalk.gray(diff));
      logger.space();
    } else {
      logger.info('✅ No differences found', 'Working directory matches last commit');
      logger.space();
    }
  } catch (error) {
    logger.failSpinner('Failed to get diff');
    logger.space();
    logger.error('Git diff error', error.message);
    logger.space();
  }
}

async function handleManualCommit() {
  const spinner = logger.startSpinner('Checking for changes...');
  
  try {
    const hasAnyChanges = await hasChanges();
    if (!hasAnyChanges) {
      logger.succeedSpinner('No changes to commit');
      logger.space();
      logger.info('✅ Working directory clean', 'No changes detected');
      logger.space();
      return;
    }
    
    const diff = await getDiff();
    if (!diff || diff.trim().length === 0) {
      logger.succeedSpinner('No meaningful diff found');
      logger.space();
      logger.info('✅ No meaningful changes', 'Diff is empty');
      logger.space();
      return;
    }
    
    logger.succeedSpinner('Changes detected');
    
    const aiSpinner = logger.startSpinner('🤖 Generating AI commit message...');
    
    try {
      const message = await generateCommitMessage(diff);
      logger.succeedSpinner('AI commit message generated');
      
      // Show the proposed message in a styled format
      logger.space();
      logger.section('🤖 AI-Generated Commit Message', 'Proposed commit for your changes');
      logger.space();
      logger.info(chalk.green(message));
      logger.space();
      
      // Simple confirmation without inquirer
      logger.info('✅ Proceeding with this commit message...', 'AUTO-COMMIT');
      logger.space();
      
      // Perform git operations
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
      logger.space();
      
    } catch (error) {
      logger.failSpinner('Commit failed');
      logger.space();
      logger.error('Commit operation failed', error.message);
      logger.space();
      throw error;
    }
    
  } catch (error) {
    logger.failSpinner('Manual commit failed');
    logger.space();
    logger.error('Commit error', error.message);
    logger.space();
  }
}

async function handleHelp() {
  logger.space();
  logger.section('Auto-Git REPL Help', 'Simple Git command pass-through');
  
  logger.space();
  const basicCommands = {
    'retry': 'Retry the last failed operation',
    'status': 'Show git status with colored output',
    'diff': 'Show current git diff',
    'commit': 'Manual commit with AI-generated message'
  };
  
  logger.config('BASIC COMMANDS', basicCommands);
  
  logger.space();
  const resetCommands = {
    'reset --hard HEAD~1': 'Hard reset to previous commit',
    'reset --soft HEAD~1': 'Soft reset to previous commit', 
    'reset HEAD~2': 'Mixed reset 2 commits back'
  };
  
  logger.config('RESET COMMANDS', resetCommands);
  
  logger.space();
  const gitCommands = {
    'git log --oneline': 'Show commit history',
    'git branch -a': 'List all branches',
    'git stash': 'Stash current changes',
    'git pull origin main': 'Pull latest changes'
  };
  
  logger.config('GIT COMMANDS (direct pass-through)', gitCommands);
  
  logger.space();
  const directCommands = {
    'log --graph --oneline': 'Show graphical commit history',
    'branch -a': 'List all branches',
    'stash push -m "WIP"': 'Stash with message',
    'cherry-pick abc123': 'Cherry-pick a commit'
  };
  
  logger.config('DIRECT GIT SUBCOMMANDS', directCommands);
  
  logger.space();
  const controlCommands = {
    'help': 'Show this help message',
    'resume': 'Resume watcher and exit REPL',
    'exit': 'Exit REPL without resuming watcher'
  };
  
  logger.config('CONTROL COMMANDS', controlCommands);
  
  logger.space();
  logger.section('💡 Usage Tips', 'How to use this REPL effectively');
  logger.space();
  logger.info('• Type any git command directly (e.g., "git pull", "git status")');
  logger.info('• Use shortcuts: "pull", "status", "log" instead of "git pull", etc.');
  logger.info('• Failed commands get automatic AI analysis and suggestions');
  logger.info('• All output is beautifully styled for better readability');
  logger.info('• Use Ctrl+C to force exit or Ctrl+R to resume globally');
  logger.space();
}

export function isReplActive() {
  return replActive;
} 