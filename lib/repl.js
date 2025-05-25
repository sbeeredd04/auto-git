import { spawn } from 'child_process';
import { execa } from 'execa';
import chalk from 'chalk';
import logger from '../utils/logger.js';
import { generateErrorSuggestion } from './gemini.js';

let replActive = false;
let currentInput = '';
let inputHandler = null;
let shouldExit = false;

// Input sanitization function to remove duplicate characters
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  let result = '';
  let i = 0;
  
  while (i < input.length) {
    const currentChar = input[i];
    result += currentChar;
    
    // If the next character is the same, skip it (remove one duplicate)
    if (i + 1 < input.length && input[i + 1] === currentChar) {
      i += 2; // Skip the duplicate
    } else {
      i += 1; // Move to next character
    }
  }
  
  return result.trim();
}

export async function startInteractiveSession() {
  if (replActive) {
    logger.warning('Interactive session already active', 'Ignoring duplicate request');
    return;
  }

  replActive = true;
  shouldExit = false;
  currentInput = '';
  
  try {
    logger.space();
    logger.section('Auto-Git Interactive Session', 'Terminal pass-through with AI error assistance');
    
    logger.space();
    logger.info('💡 How it works:', 'GUIDE');
    logger.info('  • Type any command - it will be executed directly');
    logger.info('  • Git commands get special handling and suggestions');
    logger.info('  • If a command fails, AI will suggest solutions');
    logger.info('  • Duplicate characters are automatically cleaned up');
    logger.info('  • Use Ctrl+C to exit');
    
    logger.space();
    logger.info('Examples:', 'EXAMPLES');
    logger.info('  git status                        # Show repository status');
    logger.info('  git pull                          # Pull latest changes');
    logger.info('  git log --oneline                 # Show commit history');
    logger.info('  ls -la                            # List directory contents');
    logger.info('  help                              # Show available commands');
    
    logger.space();

    // Setup stdin for raw input
    setupRawInput();
    
    // Display initial prompt
    showPrompt();
    
    // Main interactive loop
    await runInteractiveLoop();
    
  } finally {
    replActive = false;
    currentInput = '';
    shouldExit = false;
    
    // Cleanup handlers
    cleanupHandlers();
    
    logger.space();
    logger.info('Exiting interactive session...', 'SHUTDOWN');
  }
}

function setupRawInput() {
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
}

function showPrompt() {
  process.stdout.write(chalk.green('auto-git> '));
}

async function runInteractiveLoop() {
  return new Promise((resolve) => {
    inputHandler = async (key) => {
      // Handle Ctrl+C
      if (key === '\u0003') {
        logger.space();
        logger.info('Exiting interactive session...', 'SHUTDOWN');
        shouldExit = true;
        resolve();
        return;
      }
      
      // Handle Enter
      if (key === '\r' || key === '\n') {
        process.stdout.write('\n');
        
        if (currentInput.trim()) {
          const sanitizedInput = sanitizeInput(currentInput);
          
          try {
            const result = await executeCommand(sanitizedInput);
            
            if (result === 'exit') {
              shouldExit = true;
              resolve();
              return;
            }
          } catch (error) {
            logger.space();
            logger.error('Command execution error', error.message);
            logger.space();
          }
        }
        
        // Reset input and show new prompt
        currentInput = '';
        if (!shouldExit) {
          showPrompt();
        }
        return;
      }
      
      // Handle Backspace
      if (key === '\u007f' || key === '\b') {
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      
      // Handle regular character input
      if (key >= ' ' && key <= '~') {
        currentInput += key;
        process.stdout.write(key);
      }
    };
    
    process.stdin.on('data', inputHandler);
  });
}

function cleanupHandlers() {
  // Remove input handler
  if (inputHandler) {
    process.stdin.removeListener('data', inputHandler);
    inputHandler = null;
  }
  
  // Restore stdin
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
}

async function executeCommand(command) {
  const [action, ...args] = command.split(' ');
  
  // Handle special commands
  switch (action.toLowerCase()) {
    case 'exit':
    case 'quit':
    case 'q':
      return 'exit';
      
    case 'help':
      await showHelp();
      return 'continue';
      
    case 'clear':
      console.clear();
      return 'continue';
  }
  
  // Execute as terminal command
  await executeTerminalCommand(command);
  return 'continue';
}

async function executeTerminalCommand(command) {
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

async function showHelp() {
  logger.space();
  logger.section('Auto-Git Interactive Help', 'Terminal pass-through with AI assistance');
  
  logger.space();
  const commands = {
    'Any command': 'Execute directly in terminal (e.g., git status, ls, pwd)',
    'help': 'Show this help message',
    'clear': 'Clear the terminal screen',
    'exit': 'Exit interactive session',
    'Ctrl+C': 'Exit interactive session'
  };
  
  logger.config('AVAILABLE COMMANDS', commands);
  
  logger.space();
  const examples = {
    'git status': 'Show repository status',
    'git pull': 'Pull latest changes',
    'git log --oneline': 'Show commit history',
    'git branch -a': 'List all branches',
    'ls -la': 'List directory contents',
    'pwd': 'Show current directory'
  };
  
  logger.config('EXAMPLE COMMANDS', examples);
  
  logger.space();
  logger.section('💡 Features', 'What makes this interactive session special');
  logger.space();
  logger.info('• Full terminal pass-through - any command works');
  logger.info('• Automatic input sanitization removes duplicate characters');
  logger.info('• AI error analysis for failed commands');
  logger.info('• Special handling for Git commands');
  logger.info('• Simple and clean interface');
  logger.space();
}

export function isInteractiveActive() {
  return replActive;
} 