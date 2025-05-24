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
    watchPaths: ['.'],
    debounceMs: 30000, // Wait atleast 30 seconds before committing
  };

  // 1. Load from user config file (~/.auto-gitrc.json)
  const userConfigPath = join(homedir(), '.auto-gitrc.json');
  if (existsSync(userConfigPath)) {
    try {
      const userConfig = JSON.parse(readFileSync(userConfigPath, 'utf8'));
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