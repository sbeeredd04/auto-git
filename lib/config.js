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
    // Watch all files recursively from repository root by default
    watchPaths: ['**/*'], // This will watch all files and directories recursively
    // Alternative explicit patterns for comprehensive watching:
    // watchPaths: ['.', '**/*.js', '**/*.ts', '**/*.json', '**/*.md', '**/*.yml', '**/*.yaml'],
    debounceMs: 30000, // Wait at least 30 seconds before committing
    // Additional watch configuration
    watchOptions: {
      ignored: [
        // Ignore common non-source files and directories
        /(^|[\/\\])\../, // ignore dotfiles (except .env, .gitignore, etc.)
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
      // Deep merge for watchOptions
      if (userConfig.watchOptions) {
        config.watchOptions = { ...config.watchOptions, ...userConfig.watchOptions };
        delete userConfig.watchOptions;
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