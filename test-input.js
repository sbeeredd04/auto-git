#!/usr/bin/env node

import inquirer from 'inquirer';
import keypress from 'keypress';

console.log('Testing input handling...');
console.log('This will test if keyboard input is duplicated');

// Enable keypress
keypress(process.stdin);

let keypressActive = false;

function setupKeypress() {
  if (keypressActive) return;
  
  process.stdin.on('keypress', (ch, key) => {
    if (!key) return;
    
    if (key.ctrl && key.name === 'c') {
      console.log('\nShutting down...');
      process.exit(0);
    }
    
    if (key.ctrl && key.name === 'i') {
      console.log('\nEntering interactive mode...');
      startInteractive();
    }
  });
  
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  keypressActive = true;
}

async function startInteractive() {
  // Disable raw mode for inquirer
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  
  console.log('Interactive mode - type "exit" to return');
  
  while (true) {
    const { command } = await inquirer.prompt([{
      type: 'input',
      name: 'command',
      message: 'test>',
      prefix: ''
    }]);
    
    if (command.trim() === 'exit') {
      break;
    }
    
    console.log(`You typed: "${command}"`);
    
    if (command.includes('git')) {
      console.log('✓ Git command detected correctly');
    }
  }
  
  // Restore raw mode
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  
  console.log('Exited interactive mode. Press Ctrl+I to enter again, Ctrl+C to quit.');
}

setupKeypress();
console.log('Press Ctrl+I to enter interactive mode, Ctrl+C to quit');
console.log('Waiting for input...'); 