/**
 * Utility functions for Auto-Git
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load and parse .gitignore patterns
 * @param {string} repoPath - Path to the repository root
 * @returns {Array<string|RegExp>} Array of ignore patterns compatible with chokidar
 */
export function loadGitignorePatterns(repoPath = process.cwd()) {
  const gitignorePath = join(repoPath, '.gitignore');
  
  if (!existsSync(gitignorePath)) {
    return [];
  }
  
  try {
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    
    // Get the raw ignore rules
    const patterns = gitignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Remove empty lines and comments
      .map(pattern => {
        // Convert gitignore patterns to chokidar-compatible patterns
        // Patterns in gitignore are relative to the repo root
        if (pattern.startsWith('/')) {
          // Leading slash means match from root
          return pattern.slice(1);
        }
        // Patterns without leading slash can match at any depth
        return `**/${pattern}`;
      });
    
    return patterns;
  } catch (error) {
    console.warn(`Warning: Could not read .gitignore file: ${error.message}`);
    return [];
  }
}

/**
 * Safely cleanup stdin and restore terminal state
 */
export function cleanupStdin() {
  try {
    // Remove all keypress listeners
    process.stdin.removeAllListeners('keypress');
    
    // Restore raw mode if it was set
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    
    // Ensure stdin is not paused
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  } catch (error) {
    // Silently handle cleanup errors
    console.warn('Warning: Could not fully cleanup stdin:', error.message);
  }
}

/**
 * Setup stdin for keypress events
 */
export function setupStdin() {
  try {
    // Only set raw mode if stdin supports it and it's not already set
    if (process.stdin.setRawMode && !process.stdin.isRaw) {
      process.stdin.setRawMode(true);
    }
    
    // Ensure stdin is resumed for keypress events
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
  } catch (error) {
    console.warn('Warning: Could not setup stdin:', error.message);
  }
}

/**
 * Force exit the application with proper cleanup
 */
export function forceExit(code = 0) {
  try {
    cleanupStdin();
    process.exit(code);
  } catch (error) {
    // Force exit even if cleanup fails
    process.exit(code);
  }
} 