import { spawn } from 'child_process';
import keypress from 'keypress';
import { execa } from 'execa';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { hasChanges, getDiff, addAll, commit, push, hasRemote } from './git.js';
import { generateCommitMessage, generateErrorSuggestion } from './gemini.js';
import { cleanupStdin, setupStdin, forceExit } from './utils.js';

let replActive = false;
let currentInput = '';
let globalKeyHandler = null;

// Input sanitization function to remove one duplicate per character
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  let result = '';
  let i = 0;
  
  while (i < input.length) {
    const currentChar = input[i];
    result += currentChar;
    
    // Skip only one duplicate of the current character
    if (i + 1 < input.length && input[i + 1] === currentChar) {
      i += 2; // Skip the duplicate
    } else {
      i += 1; // Move to next character
    }
  }
  
  return result.trim();
}

export async function startRepl(error = null, suggestion = null) {
  if (replActive) {
    logger.warning('REPL already active', 'Ignoring duplicate request');
    return 'continue';
  }

  replActive = true;
  let exitReason = 'exit';
  
  try {
    logger.space();
    logger.section('Interactive Mode', 'Terminal pass-through with Git command execution');
    
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
      'Any Git command': 'Direct terminal pass-through (e.g., git pull, git status)',
      'help': 'Show detailed help message',
      'exit': 'Exit REPL and continue',
      'resume': 'Resume watcher and exit REPL'
    };
    
    logger.config('AVAILABLE COMMANDS', commands);
    
    logger.space();
    logger.info('💡 Pro Tips:', 'TIPS');
    logger.info('  • Type any command directly - it will be passed to terminal');
    logger.info('  • Duplicate characters are automatically cleaned up');
    logger.info('  • Type "resume" to resume watcher and exit REPL');
    logger.info('  • Type "exit" to exit REPL without resuming');
    logger.info('  • Use Ctrl+C to force exit or Ctrl+R to resume globally');
    logger.space();

    // Setup global keyboard handler
    setupGlobalKeyHandler();

    exitReason = await new Promise((resolve) => {
      let isWaitingForInput = true;
      
      // Setup stdin for raw input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      // Display initial prompt
      process.stdout.write(chalk.green('auto-git> '));
      
      const handleInput = async (key) => {
        // Handle special keys
        if (key === '\u0003') { // Ctrl+C
          logger.space();
          logger.info('Force exiting Auto-Git...', 'SHUTDOWN');
          resolve('force_exit');
          return;
        }
        
        if (key === '\u0012') { // Ctrl+R
          logger.space();
          logger.info('Global Ctrl+R detected - resuming watcher...', 'RESUME');
          resolve('resume');
          return;
        }
        
        if (key === '\r' || key === '\n') { // Enter
          process.stdout.write('\n');
          
          if (currentInput.trim()) {
            const sanitizedInput = sanitizeInput(currentInput);
            
            // Temporarily disable input handling while processing command
            isWaitingForInput = false;
            
            try {
              const result = await executeTerminalCommand(sanitizedInput);
              
              if (result === 'exit') {
                resolve('exit');
                return;
              }
              if (result === 'resume') {
                resolve('resume');
                return;
              }
              if (result === 'retry') {
                resolve('retry');
                return;
              }
            } catch (error) {
              logger.space();
              logger.error('Command execution error', error.message);
              logger.space();
            }
            
            // Re-enable input handling after command completes
            isWaitingForInput = true;
          }
          
          currentInput = '';
          process.stdout.write(chalk.green('auto-git> '));
          return;
        }
        
        if (key === '\u007f' || key === '\b') { // Backspace
          if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            process.stdout.write('\b \b');
          }
          return;
        }
        
        // Regular character input - only accept if waiting for input
        if (isWaitingForInput && key >= ' ' && key <= '~') {
          currentInput += key;
          process.stdout.write(key);
        }
      };
      
      process.stdin.on('data', handleInput);
      
      // Store the handler for cleanup
      process.stdin._replInputHandler = handleInput;
    });
    
  } finally {
    replActive = false;
    currentInput = '';
    
    // Cleanup global handler
    cleanupGlobalKeyHandler();
    
    // Remove the input handler
    if (process.stdin._replInputHandler) {
      process.stdin.removeListener('data', process.stdin._replInputHandler);
      delete process.stdin._replInputHandler;
    }
    
    // Restore stdin
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    // If force exit was requested, exit immediately
    if (exitReason === 'force_exit') {
      forceExit(0);
    }
    
    logger.space();
    logger.info('Exiting interactive mode...', 'SHUTDOWN');
  }
  
  return exitReason;
}

function setupGlobalKeyHandler() {
  if (globalKeyHandler) return;
  
  keypress(process.stdin);
  
  globalKeyHandler = (ch, key) => {
    if (!key) return;
    
    // These handlers work globally even when REPL is active
    if (key.ctrl && key.name === 'c') {
      logger.space();
      logger.info('Global Ctrl+C detected - force exiting...', 'SHUTDOWN');
      forceExit(0);
    }
    
    if (key.ctrl && key.name === 'r') {
      logger.space();
      logger.info('Global Ctrl+R detected - resuming watcher...', 'RESUME');
      // This will be handled by the main REPL loop
    }
  };
  
  process.stdin.on('keypress', globalKeyHandler);
}

function cleanupGlobalKeyHandler() {
  if (globalKeyHandler) {
    process.stdin.removeListener('keypress', globalKeyHandler);
    globalKeyHandler = null;
  }
}

async function executeTerminalCommand(command) {
  const [action, ...args] = command.split(' ');
  
  // Handle special REPL commands first
  switch (action.toLowerCase()) {
    case 'retry':
      return 'retry';
      
    case 'resume':
      return 'resume';
      
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';
      
    case 'help':
      await showHelp();
      return 'continue';
      
    case 'status':
      await executeGitCommand(['status']);
      return 'continue';
      
    case 'diff':
      await executeGitCommand(['diff']);
      return 'continue';
      
    case 'commit':
      await handleManualCommit();
      return 'continue';
      
    case 'reset':
      await executeGitCommand(['reset', ...args]);
      return 'continue';
  }
  
  // For any other command, try to execute it as a terminal command
  await executeTerminalPassthrough(command);
  return 'continue';
}

async function executeTerminalPassthrough(command) {
  logger.space();
  const spinner = logger.startSpinner(`Executing: ${command}`);
  
  try {
    // Use spawn for real terminal pass-through
    const child = spawn('sh', ['-c', command], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    const exitCode = await new Promise((resolve) => {
      child.on('close', resolve);
    });
    
    if (exitCode === 0) {
      logger.succeedSpinner(`Command completed: ${command}`);
      
      if (stdout.trim()) {
        logger.space();
        logger.info('Output:', 'RESULT');
        console.log(chalk.gray(stdout.trim()));
      }
    } else {
      logger.failSpinner(`Command failed: ${command}`);
      
      if (stderr.trim()) {
        logger.space();
        logger.error('Error Output', stderr.trim());
        
        // Get AI suggestion for failed commands
        await getAISuggestion(command, stderr.trim());
      }
    }
    
  } catch (error) {
    logger.failSpinner(`Command execution failed: ${command}`);
    logger.space();
    logger.error('Execution Error', error.message);
    
    // Get AI suggestion for execution errors
    await getAISuggestion(command, error.message);
  }
  
  logger.space();
}

async function executeGitCommand(args) {
  const gitArgs = args.join(' ');
  logger.space();
  const spinner = logger.startSpinner(`Running git ${gitArgs}...`);
  
  try {
    const result = await execa('git', args, { 
      stdio: ['inherit', 'pipe', 'pipe'],
      timeout: 30000
    });
    
    logger.succeedSpinner(`Git command completed: ${gitArgs}`);
    
    if (result.stdout && result.stdout.trim()) {
      logger.space();
      logger.info('Git Output:', 'RESULT');
      console.log(chalk.gray(result.stdout));
    }
    
  } catch (error) {
    logger.failSpinner(`Git command failed: ${gitArgs}`);
    
    const errorMessage = error.stderr || error.message || 'Unknown error';
    logger.space();
    logger.error('Git Error', errorMessage);
    
    // Get AI suggestion for failed git commands
    await getAISuggestion(`git ${gitArgs}`, errorMessage);
  }
  
  logger.space();
}

async function getAISuggestion(command, errorMessage) {
  logger.space();
  const aiSpinner = logger.startSpinner('🤖 Analyzing error with AI...');
  
  try {
    const suggestion = await generateErrorSuggestion(
      `Command failed: ${command}\nError: ${errorMessage}`
    );
    
    logger.succeedSpinner('AI analysis complete');
    logger.space();
    
    logger.section('🤖 AI Suggestion', 'Intelligent troubleshooting assistance');
    logger.space();
    logger.info(suggestion);
    logger.space();
    logger.info('💡 You can run the suggested commands directly in this terminal!', 'TIP');
    
  } catch (aiError) {
    logger.failSpinner('AI suggestion failed');
    logger.space();
    logger.warning('Could not get AI suggestion', aiError.message);
  }
  
  logger.space();
}

async function handleManualCommit() {
  logger.space();
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
      
      logger.space();
      logger.section('🤖 AI-Generated Commit Message', 'Proposed commit for your changes');
      logger.space();
      logger.info(chalk.green(message));
      logger.space();
      
      logger.info('✅ Proceeding with this commit message...', 'AUTO-COMMIT');
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
      logger.space();
      
    } catch (error) {
      logger.failSpinner('Commit failed');
      logger.space();
      logger.error('Commit operation failed', error.message);
      logger.space();
    }
    
  } catch (error) {
    logger.failSpinner('Manual commit failed');
    logger.space();
    logger.error('Commit error', error.message);
    logger.space();
  }
}

async function showHelp() {
  logger.space();
  logger.section('Auto-Git REPL Help', 'Terminal pass-through with Git integration');
  
  logger.space();
  const basicCommands = {
    'retry': 'Retry the last failed operation',
    'status': 'Show git status',
    'diff': 'Show current git diff',
    'commit': 'Manual commit with AI-generated message',
    'reset <args>': 'Git reset with specified arguments'
  };
  
  logger.config('BUILT-IN COMMANDS', basicCommands);
  
  logger.space();
  const terminalCommands = {
    'git pull': 'Pull latest changes from remote',
    'git log --oneline': 'Show commit history',
    'git branch -a': 'List all branches',
    'ls -la': 'List directory contents',
    'pwd': 'Show current directory'
  };
  
  logger.config('TERMINAL PASS-THROUGH (any command works)', terminalCommands);
  
  logger.space();
  const controlCommands = {
    'help': 'Show this help message',
    'resume': 'Resume watcher and exit REPL',
    'exit': 'Exit REPL without resuming watcher',
    'Ctrl+R': 'Global resume (works anywhere)',
    'Ctrl+C': 'Force exit application'
  };
  
  logger.config('CONTROL COMMANDS', controlCommands);
  
  logger.space();
  logger.section('💡 Features', 'What makes this REPL special');
  logger.space();
  logger.info('• Full terminal pass-through - any command works');
  logger.info('• Automatic input sanitization removes duplicate characters');
  logger.info('• AI error analysis for failed commands');
  logger.info('• Global keyboard shortcuts work from anywhere');
  logger.info('• Git commands get special handling and suggestions');
  logger.space();
}

export function isReplActive() {
  return replActive;
} 