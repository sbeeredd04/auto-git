import keypress from 'keypress';
import { startRepl } from './repl.js';
import logger from '../utils/logger.js';

let menuActive = false;
let selectedIndex = 0;
let menuOptions = [];

export function isMenuActive() {
  return menuActive;
}

export async function showNavigationMenu() {
  if (menuActive) return;
  
  menuActive = true;
  selectedIndex = 0;
  
  menuOptions = [
    {
      label: '▶  Resume watching',
      value: 'resume',
      description: 'Continue monitoring files for changes'
    },
    {
      label: '🔧 Interactive mode',
      value: 'interactive',
      description: 'Enter REPL for manual Git operations'
    },
    {
      label: '🛑 Stop and exit',
      value: 'exit',
      description: 'Shutdown Auto-Git completely'
    }
  ];
  
  return new Promise((resolve) => {
    displayMenu();
    
    const handleMenuKeypress = async (ch, key) => {
      if (!key || !menuActive) return;
      
      switch (key.name) {
        case 'up':
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : menuOptions.length - 1;
          displayMenu();
          break;
          
        case 'down':
          selectedIndex = selectedIndex < menuOptions.length - 1 ? selectedIndex + 1 : 0;
          displayMenu();
          break;
          
        case 'return': // Enter key
          const selectedOption = menuOptions[selectedIndex];
          hideMenu();
          process.stdin.removeListener('keypress', handleMenuKeypress);
          resolve(selectedOption.value);
          break;
          
        case 'escape':
          hideMenu();
          process.stdin.removeListener('keypress', handleMenuKeypress);
          resolve('cancel');
          break;
          
        case 'c':
          if (key.ctrl) {
            hideMenu();
            process.stdin.removeListener('keypress', handleMenuKeypress);
            resolve('exit');
          }
          break;
      }
    };
    
    process.stdin.on('keypress', handleMenuKeypress);
  });
}

function displayMenu() {
  // Only clear if this is not the first display
  if (menuActive && selectedIndex >= 0) {
    // Clear the entire screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[H');
  }
  
  logger.space();
  logger.warning('⏸  Watcher Paused', 'Use arrow keys to navigate, Enter to select');
  logger.space();
  
  menuOptions.forEach((option, index) => {
    const isSelected = index === selectedIndex;
    const prefix = isSelected ? '❯' : ' ';
    const style = isSelected ? '\x1b[36m\x1b[1m' : '\x1b[37m'; // Cyan bold for selected, white for others
    const reset = '\x1b[0m';
    
    console.log(`${style}${prefix} ${option.label}${reset}`);
    if (isSelected) {
      console.log(`\x1b[90m  ${option.description}\x1b[0m`); // Gray description
    }
  });
  
  logger.space();
  logger.info('Controls: ↑↓ Navigate • Enter Select • Esc Cancel • Ctrl+C Exit', 'HELP');
}

function hideMenu() {
  menuActive = false;
  selectedIndex = 0;
  
  // Clear the screen
  process.stdout.write('\x1b[2J\x1b[H');
}

export function cleanupMenu() {
  if (menuActive) {
    hideMenu();
  }
} 