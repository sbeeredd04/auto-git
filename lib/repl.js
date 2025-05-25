import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { hasChanges, getDiff, addAll, commit, push, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';

let replActive = false;

export async function startRepl(error = null, suggestion = null) {
  if (replActive) {
    logger.warning('REPL already active', 'Ignoring duplicate request');
    return;
  }

  replActive = true;
  
  try {
    logger.space();
    logger.section('Interactive Mode', 'Auto-Git REPL activated');
    
    if (error) {
      logger.error('Error Context', error);
    }
    
    if (suggestion) {
      logger.info('AI Suggestion', suggestion);
    }
    
    logger.space();
    logger.info('Available commands:');
    logger.info('  retry     - Retry the last failed operation');
    logger.info('  reset     - Reset commits (e.g., reset --hard HEAD~1)');
    logger.info('  status    - Show git status');
    logger.info('  diff      - Show current diff');
    logger.info('  commit    - Manual commit with AI message');
    logger.info('  help      - Show this help message');
    logger.info('  exit      - Exit REPL and continue');
    logger.space();

    while (true) {
      const { command } = await inquirer.prompt([{
        type: 'input',
        name: 'command',
        message: chalk.green('auto-git>'),
        prefix: ''
      }]);

      const [action, ...args] = command.trim().split(' ');
      
      if (!action) continue;

      try {
        const result = await executeReplCommand(action, args);
        if (result === 'exit') break;
        if (result === 'retry') {
          logger.info('Exiting REPL to retry operation...');
          break;
        }
      } catch (err) {
        logger.error('Command failed', err.message);
      }
    }
  } finally {
    replActive = false;
  }
}

async function executeReplCommand(action, args) {
  switch (action.toLowerCase()) {
    case 'retry':
      return 'retry';
      
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
      
    case 'help':
      await handleHelp();
      break;
      
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';
      
    default:
      logger.warning('Unknown command', `"${action}" - type "help" for available commands`);
  }
  
  return 'continue';
}

async function handleReset(args) {
  if (args.length === 0) {
    logger.warning('Reset requires arguments', 'Example: reset --hard HEAD~1');
    return;
  }
  
  const spinner = logger.startSpinner(`Running git reset ${args.join(' ')}...`);
  
  try {
    const result = await execa('git', ['reset', ...args]);
    logger.succeedSpinner(`Reset completed: ${args.join(' ')}`);
    
    if (result.stdout) {
      logger.info('Output', result.stdout);
    }
  } catch (error) {
    logger.failSpinner('Reset failed');
    logger.error('Git reset error', error.message);
  }
}

async function handleStatus() {
  const spinner = logger.startSpinner('Getting git status...');
  
  try {
    const result = await execa('git', ['status', '--porcelain']);
    logger.succeedSpinner('Git status retrieved');
    
    if (result.stdout.trim()) {
      logger.info('Modified files:');
      result.stdout.trim().split('\n').forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3);
        const statusColor = status.includes('M') ? 'yellow' : 
                           status.includes('A') ? 'green' : 
                           status.includes('D') ? 'red' : 'white';
        logger.info(`  ${chalk[statusColor](status)} ${file}`);
      });
    } else {
      logger.info('No changes detected');
    }
  } catch (error) {
    logger.failSpinner('Failed to get status');
    logger.error('Git status error', error.message);
  }
}

async function handleDiff() {
  const spinner = logger.startSpinner('Getting git diff...');
  
  try {
    const diff = await getDiff();
    logger.succeedSpinner('Diff retrieved');
    
    if (diff && diff.trim()) {
      logger.info('Current diff:');
      console.log(chalk.gray(diff));
    } else {
      logger.info('No diff available');
    }
  } catch (error) {
    logger.failSpinner('Failed to get diff');
    logger.error('Git diff error', error.message);
  }
}

async function handleManualCommit() {
  const spinner = logger.startSpinner('Checking for changes...');
  
  try {
    const hasAnyChanges = await hasChanges();
    if (!hasAnyChanges) {
      logger.succeedSpinner('No changes to commit');
      return;
    }
    
    const diff = await getDiff();
    if (!diff || diff.trim().length === 0) {
      logger.succeedSpinner('No meaningful diff found');
      return;
    }
    
    logger.succeedSpinner('Changes detected');
    
    const aiSpinner = logger.startSpinner('Generating AI commit message...');
    
    try {
      const message = await generateCommitMessage(diff);
      logger.succeedSpinner('AI commit message generated');
      
      // Show the proposed message and ask for confirmation
      logger.info('Proposed commit message:', message);
      
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with this commit message?',
        default: true
      }]);
      
      if (!proceed) {
        logger.info('Commit cancelled');
        return;
      }
      
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
      
      logger.commitSummary(message, remote);
      
    } catch (error) {
      logger.failSpinner('Commit failed');
      throw error;
    }
    
  } catch (error) {
    logger.failSpinner('Manual commit failed');
    logger.error('Commit error', error.message);
  }
}

async function handleHelp() {
  logger.info('Auto-Git REPL Commands:');
  logger.info('');
  logger.info('  retry                    - Retry the last failed operation');
  logger.info('  reset <args>            - Run git reset with specified arguments');
  logger.info('    Examples:');
  logger.info('      reset --hard HEAD~1   - Hard reset to previous commit');
  logger.info('      reset --soft HEAD~1   - Soft reset to previous commit');
  logger.info('      reset HEAD~2          - Mixed reset 2 commits back');
  logger.info('');
  logger.info('  status                  - Show git status');
  logger.info('  diff                    - Show current git diff');
  logger.info('  commit                  - Manual commit with AI-generated message');
  logger.info('  help                    - Show this help message');
  logger.info('  exit                    - Exit REPL and continue watching');
  logger.info('');
}

export function isReplActive() {
  return replActive;
} 