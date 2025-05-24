#!/usr/bin/env node

import { Command } from 'commander';
import { startWatcher, performSingleCommit } from '../lib/watcher.js';
import { getConfig, validateConfig } from '../lib/config.js';
import { isGitRepository, hasRemote, getCurrentBranch } from '../lib/git.js';

const program = new Command();

program
  .name('auto-git')
  .description('Auto-commit and push with AI-generated commit messages using Gemini')
  .version('1.0.0');

program
  .command('watch')
  .description('Watch for file changes and auto-commit with AI-generated messages')
  .option('-p, --paths <paths...>', 'Paths to watch for changes', ['.'])
  .option('--no-push', 'Commit but do not push to remote')
  .action(async (options) => {
    try {
      // Validate configuration
      validateConfig();
      
      console.log('🚀 Auto-Git Watcher Starting...');
      console.log('📋 Configuration check...');
      
      const isRepo = await isGitRepository();
      if (!isRepo) {
        console.error('❌ Error: Not a git repository.');
        console.error('💡 Please run this command in a git repository.');
        process.exit(1);
      }
      
      const branch = await getCurrentBranch();
      const remote = await hasRemote();
      
      console.log(`📂 Repository: ✅`);
      console.log(`🌿 Branch: ${branch}`);
      console.log(`🔗 Remote: ${remote ? '✅' : '❌ (commits will be local only)'}`);
      console.log('');
      
      const watcher = await startWatcher(options.paths);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n👋 Stopping watcher...');
        watcher.close();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('commit')
  .alias('c')
  .description('Generate AI commit message for current changes and commit/push')
  .option('--dry-run', 'Show what would be committed without actually committing')
  .option('--no-push', 'Commit but do not push to remote')
  .action(async (options) => {
    try {
      // Validate configuration
      validateConfig();
      
      if (options.dryRun) {
        console.log('🧪 Dry run mode - no actual commits will be made');
        // TODO: Implement dry run functionality
        console.log('💡 Dry run functionality coming soon!');
        return;
      }
      
      await performSingleCommit();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = getConfig();
      
      console.log('⚙️  Current Configuration:');
      console.log('');
      console.log(`🔑 API Key: ${config.apiKey ? '✅ Set' : '❌ Not set'}`);
      console.log(`👀 Watch paths: ${config.watchPaths.join(', ')}`);
      console.log(`⏱️  Debounce time: ${config.debounceMs}ms`);
      console.log('');
      console.log('📝 Configuration sources (in order of priority):');
      console.log('   1. Environment variables (GEMINI_API_KEY)');
      console.log('   2. User config (~/.auto-gitrc.json)');
      console.log('   3. .env file');
      console.log('');
      
      if (!config.apiKey) {
        console.log('💡 To set up your API key:');
        console.log('   export GEMINI_API_KEY="your-api-key"');
        console.log('   OR create ~/.auto-gitrc.json with: {"apiKey": "your-api-key"}');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Interactive setup guide')
  .action(() => {
    console.log('🛠️  Auto-Git Setup Guide');
    console.log('');
    console.log('1️⃣  Get a Gemini API key:');
    console.log('   → Visit: https://aistudio.google.com/app/apikey');
    console.log('   → Create a new API key');
    console.log('');
    console.log('2️⃣  Set your API key (choose one):');
    console.log('   → Environment variable: export GEMINI_API_KEY="your-key"');
    console.log('   → Config file: echo \'{"apiKey": "your-key"}\' > ~/.auto-gitrc.json');
    console.log('');
    console.log('3️⃣  Test the setup:');
    console.log('   → auto-git config');
    console.log('');
    console.log('4️⃣  Start using:');
    console.log('   → auto-git commit   (one-time commit)');
    console.log('   → auto-git watch    (continuous watching)');
    console.log('');
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv); 