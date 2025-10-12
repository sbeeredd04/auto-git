import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load .env file if present
dotenv.config();

let config = null;

export function getConfig() {
  if (config) return config;

  config = {
    apiKey: null,
    watch: true,
    // Commit mode: 'periodic' (time-based) or 'intelligent' (AI-driven decisions)
    commitMode: 'periodic', // Default to existing behavior
    // Push configuration
    noPush: false, // Default to push commits to remote
    // Interactive features (new in v3.3.0) - Simplified hotkey system with navigation
    interactiveOnError: true,
    enableSuggestions: true,
    // Intelligent commit configuration
    intelligentCommit: {
      // Commit threshold: 'any', 'medium', 'major' - determines minimum change significance to commit
      commitThreshold: 'medium', // 'any' = commit all changes, 'medium' = skip trivial changes, 'major' = only significant features
      // Minimum time between commits in intelligent mode (in milliseconds)
      minTimeBetweenCommits: 30 * 60 * 1000, // 30 minutes default
      // Time to wait for user activity to settle before analyzing (in milliseconds)
      activitySettleTime: 5 * 60 * 1000, // 5 minutes of no file changes before analyzing
      // Enhanced analysis for completeness detection
      requireCompleteness: true, // Only commit when changes appear to be complete implementations
      // Buffer time configuration
      bufferTimeSeconds: 30, // Time to allow user to cancel commit/push
      // Cancel commit if new changes detected during buffer period
      cancelOnNewChanges: true,
    },
    // Rate limiting for intelligent commits (max 15 calls per minute)
    rateLimiting: {
      maxCallsPerMinute: 15,
    },
    hotkeys: {
      // Primary control hotkeys
      pause: 'ctrl+p',           // Ctrl+P to pause and show navigation menu
      // Navigation is handled by arrow keys when paused
      // Enter key to select option, Escape to cancel
    },
    // Watch all files recursively from repository root by default
    watchPaths: ['**/*'], // This will watch all files and directories recursively
    // Alternative explicit patterns for comprehensive watching:
    // watchPaths: ['.', '**/*.js', '**/*.ts', '**/*.json', '**/*.md', '**/*.yml', '**/*.yaml'],
    debounceMs: 30000, // Wait at least 30 seconds before committing
    // Additional watch configuration
    watchOptions: {
      ignored: [
        // Ignore common non-source files and directories
        /(^|[/\\])\../, // ignore dotfiles (except .env, .gitignore, etc.)
        /node_modules/,
        /\.git/,
        /\.DS_Store/,
        /\.log$/,
        /\.tmp$/,
        /\.temp$/,
        /\.swp$/,
        /\.swo$/,
        // Ignore build outputs
        /dist\//,
        /build\//,
        /coverage\//,
        // Ignore package locks (usually auto-generated)
        /package-lock\.json$/,
        /yarn\.lock$/,
        /pnpm-lock\.yaml$/,
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false, // Don't follow symbolic links for security
      depth: undefined, // Watch all depth levels (recursive)
    },
  };

  // 1. Load from user config file (~/.auto-gitrc.json)
  const userConfigPath = join(homedir(), '.auto-gitrc.json');
  if (existsSync(userConfigPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(userConfigPath, 'utf8'));
      // Deep merge for watchOptions and hotkeys
      if (userConfig.watchOptions) {
        config.watchOptions = { ...config.watchOptions, ...userConfig.watchOptions };
        delete userConfig.watchOptions;
      }
      if (userConfig.hotkeys) {
        config.hotkeys = { ...config.hotkeys, ...userConfig.hotkeys };
        delete userConfig.hotkeys;
      }
      Object.assign(config, userConfig);
    } catch (err) {
      console.warn('Warning: Could not parse ~/.auto-gitrc.json:', err.message);
    }
  }

  // 2. Override with environment variables
  if (process.env.GEMINI_API_KEY) {
    config.apiKey = process.env.GEMINI_API_KEY;
  }

  if (process.env.AUTO_GIT_WATCH_PATHS) {
    config.watchPaths = process.env.AUTO_GIT_WATCH_PATHS.split(',').map(p => p.trim());
  }

  if (process.env.AUTO_GIT_DEBOUNCE_MS) {
    config.debounceMs = parseInt(process.env.AUTO_GIT_DEBOUNCE_MS, 10);
  }

  if (process.env.AUTO_GIT_INTERACTIVE_ON_ERROR) {
    config.interactiveOnError = process.env.AUTO_GIT_INTERACTIVE_ON_ERROR === 'true';
  }

  if (process.env.AUTO_GIT_ENABLE_SUGGESTIONS) {
    config.enableSuggestions = process.env.AUTO_GIT_ENABLE_SUGGESTIONS === 'true';
  }

  if (process.env.AUTO_GIT_COMMIT_MODE) {
    const mode = process.env.AUTO_GIT_COMMIT_MODE.toLowerCase();
    if (mode === 'periodic' || mode === 'intelligent') {
      config.commitMode = mode;
    }
  }

  if (process.env.AUTO_GIT_MAX_CALLS_PER_MINUTE) {
    config.rateLimiting.maxCallsPerMinute = parseInt(process.env.AUTO_GIT_MAX_CALLS_PER_MINUTE, 10);
  }

  if (process.env.AUTO_GIT_BUFFER_TIME_SECONDS) {
    config.intelligentCommit.bufferTimeSeconds = parseInt(process.env.AUTO_GIT_BUFFER_TIME_SECONDS, 10);
  }

  if (process.env.AUTO_GIT_COMMIT_THRESHOLD) {
    const threshold = process.env.AUTO_GIT_COMMIT_THRESHOLD.toLowerCase();
    if (['any', 'medium', 'major'].includes(threshold)) {
      config.intelligentCommit.commitThreshold = threshold;
    }
  }

  if (process.env.AUTO_GIT_MIN_TIME_BETWEEN_COMMITS) {
    config.intelligentCommit.minTimeBetweenCommits = parseInt(process.env.AUTO_GIT_MIN_TIME_BETWEEN_COMMITS, 10);
  }

  if (process.env.AUTO_GIT_ACTIVITY_SETTLE_TIME) {
    config.intelligentCommit.activitySettleTime = parseInt(process.env.AUTO_GIT_ACTIVITY_SETTLE_TIME, 10);
  }

  if (process.env.AUTO_GIT_REQUIRE_COMPLETENESS) {
    config.intelligentCommit.requireCompleteness = process.env.AUTO_GIT_REQUIRE_COMPLETENESS === 'true';
  }

  if (process.env.AUTO_GIT_CANCEL_ON_NEW_CHANGES) {
    config.intelligentCommit.cancelOnNewChanges = process.env.AUTO_GIT_CANCEL_ON_NEW_CHANGES === 'true';
  }

  if (process.env.AUTO_GIT_NO_PUSH) {
    config.noPush = process.env.AUTO_GIT_NO_PUSH === 'true';
  }

  // If user specifies '.' as a watch path, expand it to include all files recursively
  if (config.watchPaths.includes('.') && config.watchPaths.length === 1) {
    config.watchPaths = ['**/*'];
  }

  return config;
}

export function validateConfig() {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error(
      'GEMINI_API_KEY not found. Please set it as an environment variable or in ~/.auto-gitrc.json'
    );
  }
  return config;
}

// Helper function to get effective watch patterns
export function getWatchPatterns() {
  const config = getConfig();
  return config.watchPaths;
}

// Helper function to get watch options for chokidar
export function getWatchOptions() {
  const config = getConfig();
  return config.watchOptions;
}

// Helper function to get interactive configuration
export function getInteractiveConfig() {
  const config = getConfig();
  return {
    interactiveOnError: config.interactiveOnError,
    enableSuggestions: config.enableSuggestions,
    hotkeys: config.hotkeys
  };
}

// Helper function to get commit mode configuration
export function getCommitConfig() {
  const config = getConfig();
  return {
    commitMode: config.commitMode,
    noPush: config.noPush,
    rateLimiting: config.rateLimiting,
    intelligentCommit: config.intelligentCommit
  };
}

// Helper function to get intelligent commit configuration
export function getIntelligentCommitConfig() {
  const config = getConfig();
  return config.intelligentCommit;
} 