import inquirer from 'inquirer';
import { execa } from 'execa';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { hasChanges, getDiff, addAll, commit, push, hasRemote } from './git.js';
import { generateCommitMessage, generateErrorSuggestion } from './gemini.js';

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
    logger.info('  git <cmd> - Execute any git command (e.g., git log, git branch)');
    logger.info('  help      - Show this help message');
    logger.info('  exit      - Exit REPL and continue');
    logger.space();
    logger.info('💡 Tip: You can run any git command directly. If it fails, AI will suggest fixes!');
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
        logger.warning('Unknown command', `"${action}" - type "help" for available commands`);
        logger.info('💡 Tip: To run git commands, use "git <command>" or just the git subcommand directly');
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
    logger.warning('Git command requires arguments', 'Example: git status, git log --oneline');
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
      logger.info('Output:');
      console.log(chalk.gray(result.stdout));
    }
    
    if (result.stderr && result.stderr.trim()) {
      logger.warning('Warnings:', result.stderr);
    }
    
  } catch (error) {
    logger.failSpinner(`Git command failed: ${gitArgs}`);
    
    const errorMessage = error.stderr || error.message || 'Unknown error';
    logger.error('Git Error', errorMessage);
    
    // Get AI suggestion for the failed git command
    logger.space();
    const aiSpinner = logger.startSpinner('Getting AI suggestions for this error...');
    
    try {
      const suggestion = await generateErrorSuggestion(
        `Git command failed: git ${gitArgs}\nError: ${errorMessage}`
      );
      
      logger.succeedSpinner('AI analysis complete');
      logger.space();
      logger.info('🤖 AI Suggestion:', 'HELP');
      logger.info(suggestion);
      logger.space();
      
      // Offer to explain the suggested commands
      const { explainCommands } = await inquirer.prompt([{
        type: 'confirm',
        name: 'explainCommands',
        message: 'Would you like me to explain what these suggested commands do?',
        default: false
      }]);
      
      if (explainCommands) {
        await explainGitCommands(suggestion);
      }
      
    } catch (aiError) {
      logger.failSpinner('AI suggestion failed');
      logger.warning('Could not get AI suggestion', aiError.message);
      
      // Provide basic troubleshooting
      logger.space();
      logger.info('💡 Basic troubleshooting:', 'HELP');
      logger.info('  git status                    # Check repository state');
      logger.info('  git log --oneline -5          # Check recent commits');
      logger.info('  git remote -v                 # Check remote configuration');
      logger.info('  git branch -a                 # Check available branches');
    }
  }
}

async function explainGitCommands(suggestion) {
  logger.space();
  logger.info('🎓 Command Explanations:', 'EDUCATION');
  
  // Extract git commands from the suggestion using regex
  const gitCommandRegex = /git\s+[a-zA-Z-]+(?:\s+[^\n]*)?/g;
  const commands = suggestion.match(gitCommandRegex) || [];
  
  if (commands.length === 0) {
    logger.info('No specific git commands found in the suggestion to explain.');
    return;
  }
  
  const explanations = {
    'git status': 'Shows the current state of your working directory and staging area',
    'git add': 'Stages changes for the next commit',
    'git commit': 'Creates a new commit with staged changes',
    'git push': 'Uploads local commits to the remote repository',
    'git pull': 'Downloads and merges changes from the remote repository',
    'git fetch': 'Downloads changes from remote without merging',
    'git reset': 'Undoes commits or unstages changes',
    'git checkout': 'Switches branches or restores files',
    'git branch': 'Lists, creates, or deletes branches',
    'git merge': 'Combines changes from different branches',
    'git rebase': 'Replays commits on top of another branch',
    'git stash': 'Temporarily saves changes without committing',
    'git log': 'Shows commit history',
    'git diff': 'Shows differences between commits, branches, or files',
    'git remote': 'Manages remote repository connections',
    'git clone': 'Creates a local copy of a remote repository',
    'git init': 'Initializes a new Git repository'
  };
  
  for (const command of commands) {
    const baseCommand = command.split(' ').slice(0, 2).join(' '); // Get "git <subcommand>"
    const explanation = explanations[baseCommand];
    
    if (explanation) {
      logger.info(`  ${chalk.cyan(command)}`);
      logger.info(`    → ${explanation}`);
    } else {
      logger.info(`  ${chalk.cyan(command)}`);
      logger.info(`    → Advanced Git command - check 'git help ${command.split(' ')[1]}' for details`);
    }
  }
  
  logger.space();
  logger.info('💡 Pro tip: You can run these commands directly in this REPL!');
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
  logger.info('');
  logger.info('  git <command>           - Execute any git command with AI error handling');
  logger.info('    Examples:');
  logger.info('      git log --oneline     - Show commit history');
  logger.info('      git branch -a         - List all branches');
  logger.info('      git stash             - Stash current changes');
  logger.info('      git pull origin main  - Pull latest changes');
  logger.info('');
  logger.info('  <git-subcommand>        - Direct git subcommands (e.g., log, branch, stash)');
  logger.info('');
  logger.info('  help                    - Show this help message');
  logger.info('  exit                    - Exit REPL and continue watching');
  logger.info('');
  logger.info('🤖 AI Features:');
  logger.info('  • Failed git commands automatically get AI suggestions');
  logger.info('  • AI explains what suggested commands do');
  logger.info('  • Error analysis helps you understand and fix issues');
  logger.info('');
}

export function isReplActive() {
  return replActive;
} 