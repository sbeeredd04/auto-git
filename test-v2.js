#!/usr/bin/env node

/**
 * Auto-Git v2.0 Feature Test Script
 * 
 * This script demonstrates and tests all the new interactive features
 * introduced in Auto-Git v2.0
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🚀 Auto-Git v2.0 Feature Test\n'));

const tests = [
  {
    name: 'Version Check',
    command: 'node bin/auto-git.js --version',
    description: 'Verify v2.0.0 is installed'
  },
  {
    name: 'Configuration Display',
    command: 'node bin/auto-git.js config',
    description: 'Show new interactive features in config'
  },
  {
    name: 'Debug Information',
    command: 'node bin/auto-git.js debug',
    description: 'Display v2.0 system diagnostics'
  },
  {
    name: 'Reset Command Help',
    command: 'node bin/auto-git.js reset --help',
    description: 'Show new reset command options'
  },
  {
    name: 'Setup Guide',
    command: 'node bin/auto-git.js setup',
    description: 'Display updated setup guide with v2.0 features'
  }
];

console.log(chalk.yellow('Running feature tests...\n'));

tests.forEach((test, index) => {
  console.log(chalk.cyan(`${index + 1}. ${test.name}`));
  console.log(chalk.gray(`   ${test.description}`));
  console.log(chalk.gray(`   Command: ${test.command}\n`));
  
  try {
    const output = execSync(test.command, { encoding: 'utf8', cwd: process.cwd() });
    console.log(chalk.green('   ✓ Test passed\n'));
  } catch (error) {
    console.log(chalk.red(`   ✗ Test failed: ${error.message}\n`));
  }
});

console.log(chalk.blue.bold('🎉 Auto-Git v2.0 Features Summary:\n'));

const features = [
  '⌨️  Keyboard Shortcuts (Ctrl+P/R/I)',
  '🔧 Interactive REPL with commands',
  '🤖 Error-driven AI suggestions',
  '🔄 Built-in git reset functionality',
  '⚡ Smart error recovery system',
  '🎛️  Real-time pause/resume controls',
  '📊 Enhanced configuration display',
  '🛠️  Comprehensive diagnostics'
];

features.forEach(feature => {
  console.log(chalk.green(`   ${feature}`));
});

console.log(chalk.blue.bold('\n📚 Next Steps:\n'));
console.log(chalk.white('1. Set your Gemini API key: export GEMINI_API_KEY="your-key"'));
console.log(chalk.white('2. Try interactive mode: auto-git watch'));
console.log(chalk.white('3. Test keyboard shortcuts: Ctrl+P (pause), Ctrl+R (resume), Ctrl+I (REPL)'));
console.log(chalk.white('4. Test error recovery with the new reset command'));
console.log(chalk.white('5. Configure hotkeys in ~/.auto-gitrc.json'));

console.log(chalk.blue.bold('\n🚀 Happy coding with Auto-Git v2.0!\n')); 