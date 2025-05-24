#!/usr/bin/env node

import { Command } from 'commander';
import { startWatcher, performSingleCommit } from '../lib/watcher.js';
import { getConfig, validateConfig } from '../lib/config.js';
import { isGitRepository, hasRemote, getCurrentBranch } from '../lib/git.js';
import logger from '../utils/logger.js';

const program = new Command();

program
  .name('auto-git')
  .description('Auto-commit and push with AI-generated commit messages using Gemini')
  .version('1.0.0');

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

      // Validate configuration
      validateConfig();
      
      logger.section('Auto-Git Watcher', 'Initializing file monitoring system');
      
      const isRepo = await isGitRepository();
      if (!isRepo) {
        logger.error(
          'Not a Git repository',
          'Please run this command inside a Git repository or initialize one with: git init'
        );
        process.exit(1);
      }
      
      const branch = await getCurrentBranch();
      const remote = await hasRemote();
      const config = getConfig();
      
      logger.repoStatus(branch, remote, !!config.apiKey);
      
      // Pass custom paths if provided, otherwise use default recursive watching
      const watchPaths = options.paths && options.paths.length > 0 && !options.paths.includes('.') 
        ? options.paths 
        : null; // null will use config defaults
      
      const watcher = await startWatcher(watchPaths);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.space();
        logger.info('Stopping file watcher...', 'SHUTDOWN');
        watcher.close();
        process.exit(0);
      });
      
    } catch (error) {
      logger.error('Failed to start watcher', error.message);
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

      // Validate configuration
      validateConfig();
      
      if (options.dryRun) {
        logger.warning('Dry run mode enabled', 'No actual commits will be made');
        logger.info('Dry run functionality coming soon!');
        return;
      }
      
      await performSingleCommit();
      
    } catch (error) {
      logger.error('Commit operation failed', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = getConfig();
      
      const configItems = {
        'API Key': config.apiKey ? '✓ Set' : '✗ Not set',
        'Watch Paths': config.watchPaths.join(', '),
        'Recursive Watching': config.watchOptions.depth === undefined,
        'Debounce Time': `${config.debounceMs}ms`,
        'Follow Symlinks': config.watchOptions.followSymlinks
      };

      logger.config('AUTO-GIT CONFIGURATION', configItems);
      
      logger.space();
      logger.info('Configuration sources (in order of priority):');
      logger.info('  1. Environment variables (GEMINI_API_KEY, AUTO_GIT_WATCH_PATHS, AUTO_GIT_DEBOUNCE_MS)');
      logger.info('  2. User config (~/.auto-gitrc.json)');
      logger.info('  3. .env file');
      
      if (!config.apiKey) {
        logger.space();
        logger.warning(
          'API key not configured',
          'Set GEMINI_API_KEY environment variable or create ~/.auto-gitrc.json'
        );
      }

      logger.space();
      logger.info('Ignored Patterns:');
      config.watchOptions.ignored.forEach(pattern => {
        logger.info(`  ${pattern.toString()}`, '');
      });
      
    } catch (error) {
      logger.error('Failed to load configuration', error.message);
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
      'Start using: auto-git commit (one-time) or auto-git watch (continuous)'
    ];

    logger.setup(steps);
  });

// Add debug command for troubleshooting
program
  .command('debug')
  .description('Run system diagnostics')
  .action(async () => {
    logger.section('Auto-Git Diagnostics', 'System health check');
    
    try {
      const config = getConfig();
      const isRepo = await isGitRepository();
      const branch = isRepo ? await getCurrentBranch() : null;
      const remote = isRepo ? await hasRemote() : false;
      
      const diagnostics = {
        'Node.js Version': process.version,
        'Platform': process.platform,
        'Working Directory': process.cwd(),
        'Git Repository': isRepo,
        'Current Branch': branch || 'N/A',
        'Remote Configured': remote,
        'API Key Set': !!config.apiKey,
        'Config File Exists': 'Checking...'
      };

      logger.config('SYSTEM DIAGNOSTICS', diagnostics);
      
    } catch (error) {
      logger.error('Diagnostics failed', error.message);
    }
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv); 