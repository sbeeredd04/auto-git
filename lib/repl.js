import { spawn } from 'child_process';
import { execa } from 'execa';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import logger from '../utils/logger.js';
import { generateErrorSuggestion } from './gemini.js';
import { formatMarkdown, formatAISuggestion, formatGitCommand, createBox } from '../utils/markdown.js';

let replActive = false;
let currentInput = '';
let inputHandler = null;
let shouldExit = false;
let sessionHistory = [];
let historyIndex = -1;

// Session persistence
const HISTORY_FILE = path.join(os.homedir(), '.auto-git-history.json');
const MAX_HISTORY_SIZE = 100;

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

// Load session history from file
async function loadSessionHistory() {
  try {
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    const history = JSON.parse(data);
    sessionHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_SIZE) : [];
  } catch (error) {
    // File doesn't exist or is corrupted, start with empty history
    sessionHistory = [];
  }
}

// Save session history to file
async function saveSessionHistory() {
  try {
    const historyToSave = sessionHistory.slice(-MAX_HISTORY_SIZE);
    await fs.writeFile(HISTORY_FILE, JSON.stringify(historyToSave, null, 2));
  } catch (error) {
    // Silently fail if we can't save history
    logger.debug('Failed to save session history:', error.message);
  }
}

// Add command to history
function addToHistory(command) {
  if (command && command.trim() && command !== sessionHistory[sessionHistory.length - 1]) {
    sessionHistory.push(command.trim());
    if (sessionHistory.length > MAX_HISTORY_SIZE) {
      sessionHistory = sessionHistory.slice(-MAX_HISTORY_SIZE);
    }
  }
  historyIndex = sessionHistory.length;
}

// Get command from history
function getFromHistory(direction) {
  if (sessionHistory.length === 0) return '';
  
  if (direction === 'up') {
    historyIndex = Math.max(0, historyIndex - 1);
  } else if (direction === 'down') {
    historyIndex = Math.min(sessionHistory.length, historyIndex + 1);
  }
  
  return historyIndex < sessionHistory.length ? sessionHistory[historyIndex] : '';
}

export async function startInteractiveSession() {
  if (replActive) {
    logger.warning('Interactive session already active', 'Ignoring duplicate request');
    return;
  }

  replActive = true;
  shouldExit = false;
  currentInput = '';
  
  // Load session history
  await loadSessionHistory();
  
  try {
    logger.space();
    logger.section('Auto-Git Interactive Session v4.1.0', 'Enhanced terminal with AI assistance and session persistence');
    
    logger.space();
    logger.info(' Enhanced Features:', 'GUIDE');
    logger.info('  • Type any command - executed with full terminal support');
    logger.info('  • AI-powered error analysis with markdown formatting');
    logger.info('  • Session history with ↑↓ arrow key navigation');
    logger.info('  • Persistent command history across sessions');
    logger.info('  • Git command syntax highlighting');
    logger.info('  • Use Ctrl+C to exit');
    
    logger.space();
    logger.info('Examples:', 'EXAMPLES');
    logger.info('  git status                        # Show repository status');
    logger.info('  git pull                          # Pull latest changes');
    logger.info('  git log --oneline -10             # Show recent commits');
    logger.info('  ls -la                            # List directory contents');
    logger.info('  history                           # Show command history');
    logger.info('  clear                             # Clear terminal screen');
    logger.info('  help                              # Show available commands');
    
    if (sessionHistory.length > 0) {
      logger.space();
      logger.info(`📚 Session history loaded: ${sessionHistory.length} commands`, 'HISTORY');
      logger.info('Use ↑↓ arrow keys to navigate through previous commands', 'TIP');
    }
    
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
    
    // Save session history
    await saveSessionHistory();
    
    // Cleanup handlers
    cleanupHandlers();
    
    logger.space();
    logger.info('Session saved. Exiting interactive session...', 'SHUTDOWN');
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
  const promptText = 'auto-git> ';
  process.stdout.write(chalk.green(promptText));
}

function clearCurrentLine() {
  process.stdout.write('\r\x1b[K');
}

function redrawInput() {
  clearCurrentLine();
  showPrompt();
  process.stdout.write(currentInput);
}

async function runInteractiveLoop() {
  return new Promise((resolve, reject) => {
    let isProcessingCommand = false;
    
    // Add error handler for the process
    const errorHandler = (error) => {
      logger.debug(`Process error: ${error.message}`);
      // Don't exit on process errors, just log them
    };
    
    process.on('error', errorHandler);
    
    inputHandler = (key) => {
      try {
        // Handle Ctrl+C - ONLY way to exit
        if (key === '\u0003') {
          logger.space();
          logger.info('Exiting interactive session...', 'SHUTDOWN');
          shouldExit = true;
          process.removeListener('error', errorHandler);
          resolve();
          return;
        }
        
        // Ignore input while processing a command
        if (isProcessingCommand) {
          return;
        }
      
        // Handle arrow keys for history navigation
        if (key === '\u001b[A') { // Up arrow
          const historyCommand = getFromHistory('up');
          if (historyCommand) {
            currentInput = historyCommand;
            redrawInput();
          }
          return;
        }
        
        if (key === '\u001b[B') { // Down arrow
          const historyCommand = getFromHistory('down');
          currentInput = historyCommand;
          redrawInput();
          return;
        }
        
        // Handle Enter - check for both \r and \n, and handle line-by-line input
        if (key === '\r' || key === '\n' || key.includes('\n')) {
          process.stdout.write('\n');
          
          // Handle multi-line input by processing each line
          if (key.includes('\n')) {
            const lines = key.split('\n').filter(line => line.trim());
            
            if (lines.length > 0) {
              // Process the first line with current input
              const firstLine = lines[0].replace('\r', '');
              currentInput += firstLine;
              
              if (currentInput.trim()) {
                const sanitizedInput = sanitizeInput(currentInput);
                addToHistory(sanitizedInput);
                
                // Set flag to prevent input during command execution
                isProcessingCommand = true;
                
                // Execute command asynchronously with proper error handling
                executeCommand(sanitizedInput)
                  .then((result) => {
                    // Only exit if explicitly requested
                    if (result === 'exit') {
                      shouldExit = true;
                      process.removeListener('error', errorHandler);
                      resolve();
                      return;
                    }
                    
                    // Reset input and show new prompt - ALWAYS continue session
                    currentInput = '';
                    historyIndex = sessionHistory.length;
                    isProcessingCommand = false;
                    
                    // Always show prompt again to continue session
                    if (!shouldExit) {
                      showPrompt();
                    }
                  })
                  .catch((error) => {
                    logger.debug(`Command execution error: ${error.message}`);
                    
                    // Reset state and continue session even on error
                    currentInput = '';
                    historyIndex = sessionHistory.length;
                    isProcessingCommand = false;
                    
                    // Always show prompt again to continue session
                    if (!shouldExit) {
                      logger.space();
                      logger.warning('Command execution failed, continuing session...', 'RECOVERY');
                      showPrompt();
                    }
                  });
              } else {
                // Empty command, just show prompt again
                currentInput = '';
                historyIndex = sessionHistory.length;
                if (!shouldExit) {
                  showPrompt();
                }
              }
            } else {
              // No valid lines, just show prompt again
              currentInput = '';
              historyIndex = sessionHistory.length;
              if (!shouldExit) {
                showPrompt();
              }
            }
          } else {
            // Single Enter key press
            if (currentInput.trim()) {
              const sanitizedInput = sanitizeInput(currentInput);
              addToHistory(sanitizedInput);
              
              // Set flag to prevent input during command execution
              isProcessingCommand = true;
              
              // Execute command asynchronously with proper error handling
              executeCommand(sanitizedInput)
                .then((result) => {
                  // Only exit if explicitly requested
                  if (result === 'exit') {
                    shouldExit = true;
                    process.removeListener('error', errorHandler);
                    resolve();
                    return;
                  }
                  
                  // Reset input and show new prompt - ALWAYS continue session
                  currentInput = '';
                  historyIndex = sessionHistory.length;
                  isProcessingCommand = false;
                  
                  // Always show prompt again to continue session
                  if (!shouldExit) {
                    showPrompt();
                  }
                })
                .catch((error) => {
                  logger.debug(`Command execution error: ${error.message}`);
                  
                  // Reset state and continue session even on error
                  currentInput = '';
                  historyIndex = sessionHistory.length;
                  isProcessingCommand = false;
                  
                  // Always show prompt again to continue session
                  if (!shouldExit) {
                    logger.space();
                    logger.warning('Command execution failed, continuing session...', 'RECOVERY');
                    showPrompt();
                  }
                });
            } else {
              // Empty command, just show prompt again
              currentInput = '';
              historyIndex = sessionHistory.length;
              if (!shouldExit) {
                showPrompt();
              }
            }
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
      } catch (error) {
        logger.debug(`Input handler error: ${error.message}`);
        // Don't exit on input errors, just log them and continue
        if (!shouldExit) {
          logger.space();
          logger.warning('Input handling error, continuing session...', 'RECOVERY');
          showPrompt();
        }
      }
    };
    
    process.stdin.on('data', inputHandler);
    
    // Add error handler for stdin - don't exit on stdin errors
    process.stdin.on('error', (error) => {
      logger.debug(`Stdin error: ${error.message}`);
      // Don't exit on stdin errors, just log them
    });
    
    // Add additional safety handlers to prevent unexpected exits
    process.stdin.on('end', () => {
      logger.debug('Stdin ended - this should not happen in interactive mode');
      // Don't automatically exit, let user control with Ctrl+C
    });
    
    process.stdin.on('close', () => {
      logger.debug('Stdin closed - this should not happen in interactive mode');
      // Don't automatically exit, let user control with Ctrl+C
    });
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
  try {
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
        
      case 'history':
        await showHistory();
        return 'continue';
        
      case 'version':
        logger.info('Auto-Git Interactive Session v4.1.0', 'VERSION');
        return 'continue';
    }
    
    // Execute as terminal command
    await executeTerminalCommand(command);
    return 'continue';
  } catch (error) {
    logger.debug(`Execute command error: ${error.message}`);
    logger.space();
    logger.warning('Command execution failed, continuing session...', 'RECOVERY');
    logger.space();
    return 'continue'; // Always continue session
  }
}

async function executeTerminalCommand(command) {
  try {
    logger.space();
    
    // Show formatted command if it's a git command
    if (command.startsWith('git ')) {
      logger.info(`Executing: ${formatGitCommand(command)}`, 'COMMAND');
    } else {
      logger.info(`Executing: ${chalk.cyan(command)}`, 'COMMAND');
    }
    
    const spinner = logger.startSpinner('Running command...');
    
    try {
      // Temporarily disable raw mode to prevent conflicts
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      
      // Use spawn without inheriting stdin to avoid conflicts
      const child = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe']
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
        child.on('error', (error) => {
          logger.debug(`Child process error: ${error.message}`);
          resolve(1); // Return non-zero exit code on error
        });
      });
      
      // Always restore raw mode after command execution
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      
      if (exitCode === 0) {
        logger.succeedSpinner('Command completed successfully');
        
        if (stdout.trim()) {
          logger.space();
          logger.info('Output:', 'RESULT');
          console.log(chalk.gray(stdout.trim()));
        }
      } else {
        logger.failSpinner(`Command failed with exit code ${exitCode}`);
        
        if (stderr.trim()) {
          logger.space();
          logger.error('Error Output', stderr.trim());
          
          // Get AI suggestion for failed commands - wrapped in try-catch
          try {
            await getAISuggestion(command, stderr.trim());
          } catch (aiError) {
            logger.debug(`AI suggestion failed: ${aiError.message}`);
            logger.space();
            logger.warning('AI suggestion unavailable, continuing session...', 'RECOVERY');
          }
        }
      }
      
    } catch (error) {
      // Ensure raw mode is restored even if there's an error
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true);
      }
      
      logger.failSpinner(`Command execution failed: ${command}`);
      logger.space();
      logger.error('Execution Error', error.message);
      
      // Get AI suggestion for execution errors - wrapped in try-catch
      try {
        await getAISuggestion(command, error.message);
      } catch (aiError) {
        logger.debug(`AI suggestion failed: ${aiError.message}`);
        logger.space();
        logger.warning('AI suggestion unavailable, continuing session...', 'RECOVERY');
      }
    }
    
    logger.space();
  } catch (error) {
    // Catch any unexpected errors to prevent session termination
    logger.debug(`Terminal command error: ${error.message}`);
    
    // Ensure raw mode is restored
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    
    logger.space();
    logger.warning('Command execution failed, continuing session...', 'RECOVERY');
    logger.space();
  }
}

async function getAISuggestion(command, errorMessage) {
  try {
    logger.space();
    const aiSpinner = logger.startSpinner(' Analyzing error with AI...');
    
    try {
      const suggestion = await generateErrorSuggestion(
        `Command failed: ${command}\nError: ${errorMessage}`
      );
      
      logger.succeedSpinner('AI analysis complete');
      logger.space();
      
      // Use markdown formatting for AI suggestions
      const formattedSuggestion = formatAISuggestion(suggestion);
      console.log(formattedSuggestion);
      
      logger.space();
      logger.info(' You can run the suggested commands directly in this terminal!', 'TIP');
      
    } catch (aiError) {
      logger.failSpinner('AI suggestion failed');
      logger.space();
      
      // Show a more user-friendly error message
      if (aiError.message.includes('API') || aiError.message.includes('fetch')) {
        logger.warning('AI service temporarily unavailable', 'Check your internet connection and API key');
      } else if (aiError.message.includes('rate limit')) {
        logger.warning('Rate limit reached', 'Please wait a moment before trying again');
      } else {
        logger.warning('Could not get AI suggestion', 'Falling back to basic troubleshooting');
      }
      
      // Provide basic troubleshooting
      logger.space();
      logger.info(' Basic troubleshooting:', 'HELP');
      if (command.startsWith('git ')) {
        logger.info('  • Check: git status');
        logger.info('  • Check: git log --oneline -5');
        logger.info('  • Try: git --help ' + command.split(' ')[1]);
      } else {
        logger.info('  • Check command syntax');
        logger.info('  • Verify file/directory exists');
        logger.info('  • Check permissions');
        logger.info('  • Try: man ' + command.split(' ')[0]);
      }
    }
    
    logger.space();
  } catch (error) {
    // Catch any unexpected errors to prevent session termination
    logger.debug(`AI suggestion error: ${error.message}`);
    logger.space();
    logger.warning('Unable to provide AI suggestion', 'Continuing with session...');
    logger.space();
  }
}

async function showHistory() {
  logger.space();
  logger.section('Command History', `${sessionHistory.length} commands in session`);
  
  if (sessionHistory.length === 0) {
    logger.info('No commands in history yet', 'EMPTY');
    logger.space();
    return;
  }
  
  logger.space();
  const recentHistory = sessionHistory.slice(-20); // Show last 20 commands
  recentHistory.forEach((cmd, index) => {
    const number = chalk.gray(`${sessionHistory.length - recentHistory.length + index + 1}.`);
    const command = cmd.startsWith('git ') ? formatGitCommand(cmd) : chalk.cyan(cmd);
    console.log(`  ${number} ${command}`);
  });
  
  if (sessionHistory.length > 20) {
    logger.space();
    logger.info(`... and ${sessionHistory.length - 20} more commands`, 'INFO');
  }
  
  logger.space();
  logger.info('Use ↑↓ arrow keys to navigate through history', 'TIP');
  logger.space();
}

async function showHelp() {
  logger.space();
  logger.section('Auto-Git Interactive Help v4.1.0', 'Enhanced terminal with AI assistance');
  
  logger.space();
  const commands = {
    'Any command': 'Execute directly in terminal (e.g., git status, ls, pwd)',
    'history': 'Show command history for this session',
    'clear': 'Clear the terminal screen',
    'version': 'Show interactive session version',
    'help': 'Show this help message',
    'exit': 'Exit interactive session',
    'Ctrl+C': 'Exit interactive session'
  };
  
  logger.config('AVAILABLE COMMANDS', commands);
  
  logger.space();
  const examples = {
    'git status': 'Show repository status with syntax highlighting',
    'git pull': 'Pull latest changes from remote',
    'git log --oneline -10': 'Show recent commit history',
    'git branch -a': 'List all branches',
    'ls -la': 'List directory contents with details',
    'pwd': 'Show current directory path'
  };
  
  logger.config('EXAMPLE COMMANDS', examples);
  
  logger.space();
  const features = {
    'Session Persistence': 'Command history saved across sessions',
    'Arrow Key Navigation': 'Use ↑↓ to browse command history',
    'AI Error Analysis': 'Intelligent suggestions for failed commands',
    'Markdown Formatting': 'Rich formatting for AI responses',
    'Git Syntax Highlighting': 'Enhanced display for Git commands',
    'Input Sanitization': 'Automatic duplicate character removal'
  };
  
  logger.config('ENHANCED FEATURES (v4.1.0)', features);
  
  logger.space();
  logger.info(' Pro Tips:', 'TIPS');
  logger.info('  • Commands are automatically saved to history');
  logger.info('  • Git commands get special syntax highlighting');
  logger.info('  • AI suggestions are formatted with markdown');
  logger.info('  • Use arrow keys to quickly repeat commands');
  logger.info('  • Session history persists between restarts');
  logger.space();
}

export function isInteractiveActive() {
  return replActive;
} 