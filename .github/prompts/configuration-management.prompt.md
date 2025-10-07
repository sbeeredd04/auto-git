# Configuration Management Prompt

## Context

Configuration is critical to the flexibility and usability of both Auto-Git CLI and GitCue extension. The system supports multiple configuration sources with a clear precedence hierarchy:

1. Command-line arguments (highest priority)
2. Environment variables
3. Configuration file (~/.auto-gitrc.json)
4. VS Code settings (for extension)
5. Default values (lowest priority)

Configuration affects all aspects of the system including AI integration, commit behavior, file watching, and UI preferences.

## Objective

Implement, manage, and validate configuration systems that provide users with flexible control over behavior while maintaining sensible defaults and clear error messages for invalid configurations.

## Configuration Architecture

### Auto-Git CLI Configuration

**File Location**: `~/.auto-gitrc.json`

**Module**: `/lib/config.js`

**Configuration Structure:**
```json
{
  "apiKey": "gemini-api-key",
  "commitMode": "intelligent",
  "noPush": false,
  "watchPaths": ["**/*"],
  "debounceMs": 30000,
  "rateLimiting": {
    "maxCallsPerMinute": 15,
    "bufferTimeSeconds": 30
  },
  "intelligentCommit": {
    "commitThreshold": "medium",
    "requireCompleteness": true,
    "activitySettleTime": 120000,
    "minTimeBetweenCommits": 300000,
    "cancelOnNewChanges": true
  },
  "watchOptions": {
    "ignored": [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/build/**",
      "**/*.log"
    ],
    "persistent": true,
    "ignoreInitial": true,
    "followSymlinks": false,
    "depth": undefined
  },
  "interactiveOnError": true,
  "enableSuggestions": true
}
```

### GitCue Extension Configuration

**Settings Prefix**: `gitcue.*`

**Module**: `/gitcue/src/utils/config.ts`

**VS Code Settings:**
```json
{
  "gitcue.geminiApiKey": "api-key",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.watchPaths": ["**/*"],
  "gitcue.debounceMs": 30000,
  "gitcue.bufferTimeSeconds": 30,
  "gitcue.maxCallsPerMinute": 15,
  "gitcue.enableNotifications": true,
  "gitcue.autoWatch": false,
  "gitcue.interactiveOnError": true,
  "gitcue.enableSuggestions": true,
  "gitcue.terminalVerbose": false,
  "gitcue.sessionPersistence": true,
  "gitcue.maxHistorySize": 100,
  "gitcue.watchIgnored": [
    "/(^|[/\\\\])\\../",
    "/node_modules/",
    "/\\.git/",
    "/\\.DS_Store/",
    "/\\.log$/",
    "/dist\\/",
    "/build\\/"
  ]
}
```

## Requirements

### Configuration Loading

**CLI Configuration Loader:**

```javascript
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_FILE = path.join(os.homedir(), '.auto-gitrc.json');

export function getConfig() {
  const config = {
    // Default values
    apiKey: process.env.GEMINI_API_KEY || '',
    commitMode: process.env.AUTO_GIT_COMMIT_MODE || 'periodic',
    noPush: process.env.AUTO_GIT_NO_PUSH === 'true',
    debounceMs: parseInt(process.env.AUTO_GIT_DEBOUNCE_MS || '30000'),
    watchPaths: ['**/*'],
    // ... other defaults
  };

  // Load from config file if exists
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      Object.assign(config, fileConfig);
    }
  } catch (error) {
    console.warn('Failed to load config file:', error.message);
  }

  return config;
}
```

**Extension Configuration Loader:**

```typescript
import * as vscode from 'vscode';

export class ConfigManager {
  private static instance: ConfigManager;

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): GitCueConfig {
    const config = vscode.workspace.getConfiguration('gitcue');

    return {
      geminiApiKey: config.get<string>('geminiApiKey', ''),
      commitMode: config.get<string>('commitMode', 'intelligent'),
      autoPush: config.get<boolean>('autoPush', true),
      watchPaths: config.get<string[]>('watchPaths', ['**/*']),
      debounceMs: config.get<number>('debounceMs', 30000),
      bufferTimeSeconds: config.get<number>('bufferTimeSeconds', 30),
      maxCallsPerMinute: config.get<number>('maxCallsPerMinute', 15),
      enableNotifications: config.get<boolean>('enableNotifications', true),
      autoWatch: config.get<boolean>('autoWatch', false),
      interactiveOnError: config.get<boolean>('interactiveOnError', true),
      enableSuggestions: config.get<boolean>('enableSuggestions', true),
      terminalVerbose: config.get<boolean>('terminalVerbose', false),
      sessionPersistence: config.get<boolean>('sessionPersistence', true),
      maxHistorySize: config.get<number>('maxHistorySize', 100),
      watchIgnored: config.get<string[]>('watchIgnored', [])
    };
  }
}
```

### Configuration Validation

**Validation Function:**

```javascript
export function validateConfig(config = getConfig()) {
  const errors = [];

  // API Key validation
  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('GEMINI_API_KEY is required. Set it via environment variable or config file.');
  }

  // Commit mode validation
  if (!['periodic', 'intelligent'].includes(config.commitMode)) {
    errors.push('commitMode must be either "periodic" or "intelligent"');
  }

  // Debounce validation
  if (config.debounceMs < 1000) {
    errors.push('debounceMs must be at least 1000ms');
  }

  // Rate limiting validation
  if (config.rateLimiting) {
    if (config.rateLimiting.maxCallsPerMinute < 1) {
      errors.push('maxCallsPerMinute must be at least 1');
    }
    if (config.rateLimiting.bufferTimeSeconds < 0) {
      errors.push('bufferTimeSeconds cannot be negative');
    }
  }

  // Intelligent commit validation
  if (config.intelligentCommit) {
    const validThresholds = ['any', 'medium', 'major'];
    if (!validThresholds.includes(config.intelligentCommit.commitThreshold)) {
      errors.push('commitThreshold must be one of: ' + validThresholds.join(', '));
    }
  }

  if (errors.length > 0) {
    throw new Error('Configuration validation failed:\n' + errors.join('\n'));
  }

  return config;
}
```

### Environment Variables

**Supported Environment Variables:**

```bash
# API Configuration
GEMINI_API_KEY="your-api-key-here"

# Commit Behavior
AUTO_GIT_COMMIT_MODE="intelligent"     # or "periodic"
AUTO_GIT_NO_PUSH="false"               # true or false

# Timing
AUTO_GIT_DEBOUNCE_MS="30000"

# Rate Limiting
AUTO_GIT_MAX_CALLS_PER_MINUTE="15"
AUTO_GIT_BUFFER_TIME_SECONDS="30"

# Thresholds
AUTO_GIT_COMMIT_THRESHOLD="medium"     # any, medium, major

# Debug
AUTO_GIT_DEBUG="true"
NODE_ENV="development"
```

**Environment Variable Parsing:**

```javascript
function parseEnvBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseEnvNumber(value, defaultValue = 0) {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
```

## Guidelines

### Configuration Updates

**CLI Configuration:**

```bash
# Create config file
cat > ~/.auto-gitrc.json << EOF
{
  "apiKey": "your-api-key",
  "commitMode": "intelligent",
  "rateLimiting": {
    "maxCallsPerMinute": 10
  }
}
EOF

# Update via environment
export GEMINI_API_KEY="new-api-key"
export AUTO_GIT_COMMIT_MODE="periodic"

# Override via CLI
auto-git watch --mode intelligent --no-push
```

**Extension Configuration:**

```typescript
// Programmatic update
const config = vscode.workspace.getConfiguration('gitcue');
await config.update('commitMode', 'intelligent', vscode.ConfigurationTarget.Global);

// User update via VS Code UI
// Ctrl+, (Cmd+,) → Search "gitcue" → Modify settings
```

### Configuration Export/Import

**Export Configuration:**

```javascript
export async function exportConfig(outputPath) {
  const config = getConfig();
  
  // Remove sensitive data
  const exportConfig = { ...config };
  delete exportConfig.apiKey;
  
  // Write to file
  fs.writeFileSync(outputPath, JSON.stringify(exportConfig, null, 2));
  
  logger.info('Configuration exported to ' + outputPath);
}
```

**Import Configuration:**

```javascript
export async function importConfig(inputPath) {
  try {
    const importedConfig = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    
    // Validate imported config
    validateConfig(importedConfig);
    
    // Merge with existing config (preserve API key)
    const currentConfig = getConfig();
    const mergedConfig = { ...importedConfig, apiKey: currentConfig.apiKey };
    
    // Write to config file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
    
    logger.info('Configuration imported successfully');
  } catch (error) {
    logger.error('Failed to import configuration: ' + error.message);
    throw error;
  }
}
```

### Configuration Defaults

**Default Configuration:**

```javascript
export function getDefaultConfig() {
  return {
    apiKey: '',
    commitMode: 'periodic',
    noPush: false,
    watchPaths: ['**/*'],
    debounceMs: 30000,
    rateLimiting: {
      maxCallsPerMinute: 15,
      bufferTimeSeconds: 30,
      slidingWindowSize: 60000
    },
    intelligentCommit: {
      commitThreshold: 'medium',
      requireCompleteness: true,
      activitySettleTime: 120000,
      minTimeBetweenCommits: 300000,
      cancelOnNewChanges: true
    },
    watchOptions: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.log',
        '**/.DS_Store'
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: undefined,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    },
    interactiveOnError: true,
    enableSuggestions: true,
    hotkeys: {
      pause: 'ctrl+p',
      cancel: 'ctrl+x'
    }
  };
}
```

### Configuration Migration

**Version Migration:**

```javascript
export function migrateConfig(config, fromVersion, toVersion) {
  let migrated = { ...config };

  // Migrate from v3 to v4
  if (fromVersion < 4) {
    // Rename old properties
    if (migrated.pushEnabled !== undefined) {
      migrated.noPush = !migrated.pushEnabled;
      delete migrated.pushEnabled;
    }

    // Add new properties with defaults
    if (!migrated.intelligentCommit) {
      migrated.intelligentCommit = getDefaultConfig().intelligentCommit;
    }
  }

  // Save version
  migrated.configVersion = toVersion;

  return migrated;
}
```

## Output Format

### Configuration Display

```
Current Configuration
====================

API Settings:
  API Key: ********...redd (configured)
  Max Calls/Minute: 15
  Buffer Time: 30 seconds

Commit Settings:
  Mode: intelligent
  Push: enabled
  Threshold: medium
  Require Complete: yes

Watch Settings:
  Paths: **/*
  Debounce: 30000ms
  Activity Settle: 120000ms
  Min Time Between: 300000ms

File Watching:
  Ignored Patterns: 8 patterns
  Persistent: yes
  Follow Symlinks: no
  
Interactive:
  On Error: yes
  Suggestions: yes
  Verbose: no

Configuration Sources:
  1. CLI Arguments: (none)
  2. Environment: GEMINI_API_KEY
  3. Config File: ~/.auto-gitrc.json
  4. Defaults: used for remaining settings
```

## Best Practices

### Configuration Design

1. **Sensible Defaults**: Provide good defaults for all settings
2. **Clear Names**: Use descriptive configuration keys
3. **Validation**: Validate all configuration values
4. **Documentation**: Document each setting clearly
5. **Backward Compatibility**: Migrate old configurations
6. **Security**: Don't log sensitive values
7. **Flexibility**: Support multiple configuration sources

### User Experience

1. **Interactive Setup**: Guide users through configuration
2. **Helpful Errors**: Explain what's wrong and how to fix
3. **Examples**: Provide example configurations
4. **Export/Import**: Allow sharing configurations
5. **Reset**: Provide way to reset to defaults
6. **Validation**: Validate before using

## Validation

### Configuration Checklist

- [ ] All required settings have defaults
- [ ] Configuration validation works
- [ ] Environment variables are read
- [ ] Config file is loaded correctly
- [ ] CLI arguments override properly
- [ ] Sensitive data is protected
- [ ] Invalid configs show helpful errors
- [ ] Migration works for old configs
- [ ] Export/import functions correctly
- [ ] Documentation is complete

## Notes

- Never log API keys or sensitive data
- Provide migration path for breaking changes
- Support both camelCase and kebab-case keys
- Consider platform-specific defaults
- Test configuration on all platforms
- Keep configuration structure flat when possible
- Use TypeScript types for type safety
