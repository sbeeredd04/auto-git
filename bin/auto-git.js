#!/usr/bin/env node

import { Command } from 'commander';
import { execa } from 'execa';
import { startWatcher, performSingleCommit, cleanup } from '../lib/watcher.js';
import { getConfig, validateConfig, getInteractiveConfig } from '../lib/config.js';
import { isGitRepository, hasRemote, getCurrentBranch } from '../lib/git.js';
import { forceExit } from '../lib/utils.js';
import { startInteractiveSession } from '../lib/repl.js';
import logger from '../utils/logger.js';

const program = new Command();

// Global Ctrl+C handler for force exit
process.on('SIGINT', () => {
  logger.space();
  logger.info('Force exiting Auto-Git...', 'SHUTDOWN');
  cleanup();
  forceExit(0);
});

// Custom help formatter with styled output
function displayStyledHelp() {
  logger.section('Auto-Git v3.7.1', 'AI-powered Git automation with interactive terminal session');
  
  logger.space();
  logger.info('USAGE:', 'COMMAND');
  logger.info('  auto-git [command] [options]', '');
  
  logger.space();
  const commands = {
    'watch': 'Watch files and auto-commit with AI messages',
    'commit (c)': 'Generate AI commit for current changes',
    'interactive': 'Start interactive terminal session with AI error assistance',
    'reset <count>': 'Undo commits with safety checks',
    'config': 'Show configuration',
    'setup': 'Interactive setup guide for first-time users',
    'debug': 'Run system diagnostics and health check',
    'help': 'Display this help information'
  };
  
  logger.config('AVAILABLE COMMANDS', commands);
  
  logger.space();
  logger.info('INTERACTIVE FEATURES:', 'FEATURES');
  logger.info('  Interactive Session  Full terminal pass-through with AI error help', '');
  logger.info('  Ctrl+C              Exit from anywhere', '');
  logger.info('  Input Sanitization  Automatic duplicate character removal', '');
  logger.info('  AI Error Analysis   Smart suggestions for failed commands', '');
  
  logger.space();
  logger.info('EXAMPLES:', 'EXAMPLES');
  logger.info('  auto-git setup                    # First-time setup guide', '');
  logger.info('  auto-git watch                    # Start file watching', '');
  logger.info('  auto-git interactive              # Start interactive session', '');
  logger.info('  auto-git commit --verbose         # One-time commit with details', '');
  logger.info('  auto-git reset 2 --soft           # Undo last 2 commits (soft)', '');
  logger.info('  auto-git config                   # Show current configuration', '');
  
  logger.space();
  logger.info('QUICK START:', 'SETUP');
  logger.info('  1. Get API key: https://aistudio.google.com/app/apikey', '');
  logger.info('  2. Set API key: export GEMINI_API_KEY="your-key"', '');
  logger.info('  3. Run setup:   auto-git setup', '');
  logger.info('  4. Start using: auto-git watch or auto-git interactive', '');
  
  logger.space();
  logger.info('For detailed help on any command, use: auto-git [command] --help', 'HELP');
}

// Enhanced error handler for missing API key
function handleMissingApiKey(commandName) {
  logger.space();
  logger.error('Gemini API Key Required', 'API key not found or configured');
  
  logger.space();
  logger.warning('QUICK SETUP REQUIRED', 'Auto-Git needs a Gemini API key to function');
  
  logger.space();
  logger.info('OPTION 1 - Use Setup Guide (Recommended):', 'SETUP');
  logger.info('  auto-git setup', '');
  
  logger.space();
  logger.info('OPTION 2 - Manual Setup:', 'MANUAL');
  logger.info('  1. Get API key: https://aistudio.google.com/app/apikey', '');
  logger.info('  2. Set environment variable:', '');
  logger.info('     export GEMINI_API_KEY="your-api-key-here"', '');
  logger.info('  3. Or create config file:', '');
  logger.info('     echo \'{"apiKey": "your-key"}\' > ~/.auto-gitrc.json', '');
  
  logger.space();
  logger.info('OPTION 3 - Test Configuration:', 'TEST');
  logger.info('  auto-git config                   # Check current setup', '');
  logger.info('  auto-git debug                    # Run diagnostics', '');
  
  logger.space();
  logger.info(`After setup, retry: auto-git ${commandName}`, 'RETRY');
}

program
  .name('auto-git')
  .description('Auto-commit and push with AI-generated commit messages using Gemini - now with full terminal pass-through REPL, automatic input sanitization, and bulletproof global keyboard controls')
  .version('3.7.1')
  .configureHelp({
    formatHelp: () => {
      displayStyledHelp();
      return ''; // Return empty string since we handle formatting ourselves
    }
  });

program
  .command('watch')
  .description('Watch for file changes recursively and auto-commit with AI-generated messages')
  .option('-p, --paths <paths...>', 'Custom paths to watch (default: all files recursively)')
  .option('--no-push', 'Commit but do not push to remote')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      // Set verbose mode if requested
      if (options.verbose) {
        logger.setVerbose(true);
      }

      // Validate configuration with enhanced error handling
      try {
        validateConfig();
      } catch (error) {
        if (error.message.includes('GEMINI_API_KEY')) {
          handleMissingApiKey('watch');
          process.exit(1);
        }
        throw error;
      }
      
      logger.section('Auto-Git Watcher v3.7.1', 'Initializing file monitoring system with bulletproof infinite REPL looping and perfect state management');
      
      const isRepo = await isGitRepository();
      if (!isRepo) {
        logger.error(
          'Not a Git repository',
          'Please run this command inside a Git repository or initialize one with: git init'
        );
        logger.space();
        logger.info('QUICK FIX:', 'SETUP');
        logger.info('  git init                          # Initialize new repository', '');
        logger.info('  git remote add origin <url>       # Add remote (optional)', '');
        logger.info('  auto-git watch                    # Start watching', '');
        process.exit(1);
      }
      
      const branch = await getCurrentBranch();
      const remote = await hasRemote();
      const config = getConfig();
      const interactiveConfig = getInteractiveConfig();
      
      logger.repoStatus(branch, remote, !!config.apiKey);
      
      // Show interactive features status
      logger.space();
      logger.info('Interactive Features:', 'FEATURES');
      logger.info(`  Error Recovery: ${interactiveConfig.interactiveOnError ? '✓ Enabled' : '✗ Disabled'}`);
      logger.info(`  AI Suggestions: ${interactiveConfig.enableSuggestions ? '✓ Enabled' : '✗ Disabled'}`);
      logger.info(`  Navigation Menu: ✓ Enabled (Ctrl+P)`);
      logger.info(`  Arrow Key Navigation: ✓ Enabled`);
      
      // Pass custom paths if provided, otherwise use default recursive watching
      const watchPaths = options.paths && options.paths.length > 0 && !options.paths.includes('.') 
        ? options.paths 
        : null; // null will use config defaults
      
      const watcher = await startWatcher(watchPaths);
      
      // The global SIGINT handler will take care of cleanup
      // No need for a duplicate handler here
      
    } catch (error) {
      logger.error('Failed to start watcher', error.message);
      logger.space();
      logger.info('TROUBLESHOOTING:', 'HELP');
      logger.info('  auto-git debug                    # Run diagnostics', '');
      logger.info('  auto-git config                   # Check configuration', '');
      logger.info('  auto-git setup                    # Re-run setup', '');
      process.exit(1);
    }
  });

program
  .command('commit')
  .alias('c')
  .description('Generate AI commit message for current changes and commit/push')
  .option('--dry-run', 'Show what would be committed without actually committing')
  .option('--no-push', 'Commit but do not push to remote')
  .option('-v, --verbose', 'Enable verbose output')
  .action(async (options) => {
    try {
      // Set verbose mode if requested
      if (options.verbose) {
        logger.setVerbose(true);
      }

      // Validate configuration with enhanced error handling
      try {
        validateConfig();
      } catch (error) {
        if (error.message.includes('GEMINI_API_KEY')) {
          handleMissingApiKey('commit');
          process.exit(1);
        }
        throw error;
      }
      
      if (options.dryRun) {
        logger.warning('Dry run mode enabled', 'No actual commits will be made');
        logger.info('Dry run functionality coming soon!');
        return;
      }
      
      await performSingleCommit();
      
    } catch (error) {
      logger.error('Commit operation failed', error.message);
      logger.space();
      logger.info('TROUBLESHOOTING:', 'HELP');
      logger.info('  auto-git debug                    # Run diagnostics', '');
      logger.info('  auto-git config                   # Check configuration', '');
      logger.info('  git status                        # Check repository state', '');
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Undo last commits with git reset')
  .argument('<count>', 'Number of commits to reset')
  .option('--hard', 'Hard reset (WARNING: destroys changes)')
  .option('--soft', 'Soft reset (keeps changes staged)')
  .option('--mixed', 'Mixed reset (default - keeps changes unstaged)')
  .action(async (count, options) => {
    try {
      const isRepo = await isGitRepository();
      if (!isRepo) {
        logger.error('Not a Git repository', 'Please run this command inside a Git repository');
        logger.space();
        logger.info('QUICK FIX:', 'SETUP');
        logger.info('  git init                          # Initialize repository', '');
        logger.info('  cd /path/to/git/repo              # Navigate to Git repository', '');
        process.exit(1);
      }

      const resetCount = parseInt(count, 10);
      if (isNaN(resetCount) || resetCount < 1) {
        logger.error('Invalid count', 'Please provide a positive number');
        logger.space();
        logger.info('EXAMPLES:', 'USAGE');
        logger.info('  auto-git reset 1                  # Reset last commit (mixed)', '');
        logger.info('  auto-git reset 2 --soft           # Reset 2 commits (soft)', '');
        logger.info('  auto-git reset 1 --hard           # Reset 1 commit (hard)', '');
        process.exit(1);
      }

      let resetType = '';
      if (options.hard) resetType = '--hard';
      else if (options.soft) resetType = '--soft';
      else resetType = '--mixed';

      // Warning for hard reset
      if (options.hard) {
        logger.warning(
          'DESTRUCTIVE OPERATION',
          'Hard reset will permanently destroy uncommitted changes!'
        );
        
        const { default: inquirer } = await import('inquirer');
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to proceed with hard reset?',
          default: false
        }]);
        
        if (!confirm) {
          logger.info('Reset cancelled');
          logger.space();
          logger.info('SAFER ALTERNATIVES:', 'OPTIONS');
          logger.info('  auto-git reset 1 --soft           # Keep changes staged', '');
          logger.info('  auto-git reset 1 --mixed          # Keep changes unstaged', '');
          logger.info('  git stash                         # Temporarily save changes', '');
          return;
        }
      }

      const spinner = logger.startSpinner(`Resetting ${resetCount} commit(s) with ${resetType} mode...`);
      
      try {
        const args = ['reset', resetType, `HEAD~${resetCount}`].filter(Boolean);
        const result = await execa('git', args);
        
        logger.succeedSpinner(`Reset completed: ${resetType} HEAD~${resetCount}`);
        
        if (result.stdout) {
          logger.info('Git output:', result.stdout);
        }
        
        logger.info(`Successfully reset ${resetCount} commit(s)`, 'COMPLETE');
        
        logger.space();
        logger.info('NEXT STEPS:', 'GUIDE');
        logger.info('  git status                        # Check current state', '');
        logger.info('  auto-git commit                   # Make new commit', '');
        logger.info('  auto-git watch                    # Resume watching', '');
        
      } catch (error) {
        logger.failSpinner('Reset failed');
        logger.error('Git reset error', error.message);
        logger.space();
        logger.info('TROUBLESHOOTING:', 'HELP');
        logger.info('  git log --oneline -10             # Check commit history', '');
        logger.info('  git status                        # Check repository state', '');
        logger.info('  auto-git debug                    # Run diagnostics', '');
        process.exit(1);
      }
      
    } catch (error) {
      logger.error('Reset command failed', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = getConfig();
      const interactiveConfig = getInteractiveConfig();
      
      const configItems = {
        'API Key': config.apiKey ? '✓ Set' : '✗ Not set',
        'Watch Paths': config.watchPaths.join(', '),
        'Recursive Watching': config.watchOptions.depth === undefined,
        'Debounce Time': `${config.debounceMs}ms`,
        'Follow Symlinks': config.watchOptions.followSymlinks
      };

      logger.config('AUTO-GIT CONFIGURATION', configItems);
      
      // Show interactive features
      logger.space();
      const interactiveItems = {
        'Interactive Session': '✓ Available (auto-git interactive)',
        'AI Error Suggestions': interactiveConfig.enableSuggestions ? '✓ Enabled' : '✗ Disabled',
        'Input Sanitization': '✓ Enabled',
        'Terminal Pass-through': '✓ Enabled'
      };

      logger.config('INTERACTIVE FEATURES', interactiveItems);
      
      logger.space();
      logger.info('Configuration sources (in order of priority):');
      logger.info('  1. Environment variables (GEMINI_API_KEY, AUTO_GIT_*, etc.)');
      logger.info('  2. User config (~/.auto-gitrc.json)');
      logger.info('  3. .env file');
      
      if (!config.apiKey) {
        logger.space();
        logger.warning(
          'API key not configured',
          'Auto-Git requires a Gemini API key to function'
        );
        
        logger.space();
        logger.info('SETUP OPTIONS:', 'SETUP');
        logger.info('  auto-git setup                    # Interactive setup guide', '');
        logger.info('  export GEMINI_API_KEY="your-key"  # Set environment variable', '');
        logger.info('  # Or create ~/.auto-gitrc.json with your API key', '');
      }

      logger.space();
      logger.info('Ignored Patterns:');
      config.watchOptions.ignored.forEach(pattern => {
        logger.info(`  ${pattern.toString()}`, '');
      });
      
      logger.space();
      logger.info('NEXT STEPS:', 'GUIDE');
      if (!config.apiKey) {
        logger.info('  auto-git setup                    # Complete setup first', '');
      } else {
        logger.info('  auto-git watch                    # Start watching files', '');
        logger.info('  auto-git interactive              # Start interactive session', '');
        logger.info('  auto-git commit                   # Make one-time commit', '');
      }
      
    } catch (error) {
      logger.error('Failed to load configuration', error.message);
      logger.space();
      logger.info('TROUBLESHOOTING:', 'HELP');
      logger.info('  auto-git debug                    # Run system diagnostics', '');
      logger.info('  auto-git setup                    # Re-run setup guide', '');
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Interactive setup guide')
  .action(() => {
    const steps = [
      'Get a Gemini API key from: https://aistudio.google.com/app/apikey',
      'Set your API key: export GEMINI_API_KEY="your-key"',
      'Or create config file: echo \'{"apiKey": "your-key"}\' > ~/.auto-gitrc.json',
      'Test the setup: auto-git config',
      'Start using: auto-git watch (continuous) or auto-git interactive (manual)'
    ];

    logger.setup(steps);
    
    logger.space();
    logger.info('Interactive Session Features:', 'FEATURES');
    logger.info('  • Full terminal pass-through - run any command');
    logger.info('  • AI error analysis for failed commands');
    logger.info('  • Automatic input sanitization');
    logger.info('  • Simple Ctrl+C to exit');
    logger.info('  • Git command suggestions');
    
    logger.space();
    logger.info('EXAMPLE CONFIG FILE (~/.auto-gitrc.json):', 'CONFIG');
    logger.info('  {');
    logger.info('    "apiKey": "your-gemini-api-key",');
    logger.info('    "enableSuggestions": true');
    logger.info('  }');
    
    logger.space();
    logger.info('VERIFICATION COMMANDS:', 'TEST');
    logger.info('  auto-git config                   # Check configuration', '');
    logger.info('  auto-git debug                    # Run diagnostics', '');
    logger.info('  auto-git interactive              # Test interactive session', '');
  });

// Add debug command for troubleshooting
program
  .command('debug')
  .description('Run system diagnostics')
  .action(async () => {
    logger.section('Auto-Git Diagnostics v3.7.1', 'System health check');
    
    try {
      const config = getConfig();
      const interactiveConfig = getInteractiveConfig();
      const isRepo = await isGitRepository();
      const branch = isRepo ? await getCurrentBranch() : null;
      const remote = isRepo ? await hasRemote() : false;
      
      const diagnostics = {
        'Auto-Git Version': '3.7.1',
        'Node.js Version': process.version,
        'Platform': process.platform,
        'Working Directory': process.cwd(),
        'Git Repository': isRepo,
        'Current Branch': branch || 'N/A',
        'Remote Configured': remote,
        'API Key Set': !!config.apiKey,
        'Interactive Features': interactiveConfig.interactiveOnError,
        'AI Suggestions': interactiveConfig.enableSuggestions
      };

      logger.config('SYSTEM DIAGNOSTICS', diagnostics);
      
      // Provide recommendations based on diagnostics
      logger.space();
      logger.info('RECOMMENDATIONS:', 'GUIDE');
      
      if (!config.apiKey) {
        logger.info('  ⚠️  Set up Gemini API key: auto-git setup', '');
      }
      
      if (!isRepo) {
        logger.info('  ⚠️  Initialize Git repository: git init', '');
      }
      
      if (isRepo && !remote) {
        logger.info('  💡 Add remote for pushing: git remote add origin <url>', '');
      }
      
      if (config.apiKey && isRepo) {
        logger.info('  ✅ Ready to use: auto-git watch or auto-git commit', '');
      }
      
    } catch (error) {
      logger.error('Diagnostics failed', error.message);
      logger.space();
      logger.info('BASIC TROUBLESHOOTING:', 'HELP');
      logger.info('  node --version                    # Check Node.js version', '');
      logger.info('  git --version                     # Check Git installation', '');
      logger.info('  pwd                               # Check current directory', '');
    }
  });

program
  .command('interactive')
  .description('Start interactive terminal session with AI error assistance')
  .action(() => {
    startInteractiveSession();
  });

// Show styled help if no command provided
if (process.argv.length <= 2) {
  displayStyledHelp();
  process.exit(0);
}

program.parse(process.argv); 