/**
 * Utility functions for Auto-Git
 */

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