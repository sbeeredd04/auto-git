# Configuration Guide

Complete reference for configuring Auto-Git CLI and GitCue VS Code extension.

## Configuration Options

### Core Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `geminiApiKey` | string | - | Google Gemini API key (required) |
| `commitMode` | string | `periodic` | Commit mode: `periodic` or `intelligent` |
| `autoPush` | boolean | `false` | Automatically push commits to remote |
| `bufferTimeSeconds` | number | `30` | Time to review before committing |
| `debounceMs` | number | `5000` | Wait time after file change (ms) |

### Intelligent Mode Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `commitThreshold` | string | `medium` | Minimum significance: `any`, `medium`, `major` |
| `minTimeBetweenCommits` | number | `60000` | Min time between commits (ms) |
| `activitySettleTime` | number | `10000` | Time to wait for activity to settle (ms) |
| `requireCompleteness` | boolean | `false` | Only commit complete changes |
| `cancelOnNewChanges` | boolean | `true` | Cancel pending commit if new changes detected |

### Terminal Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableSuggestions` | boolean | `true` | Enable AI error suggestions |
| `sessionPersistence` | boolean | `true` | Persist terminal history |
| `maxHistorySize` | number | `1000` | Max terminal history entries |
| `terminalVerbose` | boolean | `false` | Verbose terminal output |

### Notification Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableNotifications` | boolean | `true` | Show VS Code notifications |

## CLI Configuration

### Environment Variables

```bash
# Required
export GEMINI_API_KEY="your-api-key"

# Optional
export AUTO_PUSH="false"
export COMMIT_MODE="intelligent"
export BUFFER_TIME="30"
```

### Configuration File

Create `example-config.json` in your project root:

```json
{
  "geminiApiKey": "your-api-key",
  "commitMode": "intelligent",
  "autoPush": false,
  "bufferTimeSeconds": 30,
  "debounceMs": 5000,
  "intelligentCommit": {
    "commitThreshold": "medium",
    "minTimeBetweenCommits": 60000,
    "activitySettleTime": 10000,
    "requireCompleteness": false,
    "cancelOnNewChanges": true
  }
}
```

### Command Line Options

```bash
# Watch mode
auto-git watch --mode intelligent --no-push

# Single commit
auto-git commit --verbose
```

## VS Code Configuration

### Settings UI

1. Open Settings (`Cmd/Ctrl+,`)
2. Search for "GitCue"
3. Modify settings as needed

### settings.json

Add to your `.vscode/settings.json`:

```json
{
  "gitcue.geminiApiKey": "your-api-key",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": false,
  "gitcue.bufferTimeSeconds": 30,
  "gitcue.enableNotifications": true,
  "gitcue.enableSuggestions": true,
  "gitcue.commitThreshold": "medium"
}
```

## Configuration Presets

### Conservative (Minimal Commits)
```json
{
  "commitMode": "intelligent",
  "commitThreshold": "major",
  "requireCompleteness": true,
  "minTimeBetweenCommits": 300000,
  "bufferTimeSeconds": 60
}
```

### Balanced (Recommended)
```json
{
  "commitMode": "intelligent",
  "commitThreshold": "medium",
  "requireCompleteness": false,
  "minTimeBetweenCommits": 60000,
  "bufferTimeSeconds": 30
}
```

### Aggressive (Frequent Commits)
```json
{
  "commitMode": "periodic",
  "debounceMs": 3000,
  "bufferTimeSeconds": 15
}
```

## Watch Patterns

Auto-Git watches these patterns by default:

```javascript
[
  '**/*.js',
  '**/*.ts',
  '**/*.jsx',
  '**/*.tsx',
  '**/*.json',
  '**/*.md',
  '**/*.css',
  '**/*.html',
  '**/*.py',
  '**/*.java',
  '**/*.go'
]
```

Customize in config file:

```json
{
  "watchPaths": [
    "src/**/*.ts",
    "lib/**/*.js"
  ]
}
```

## Rate Limiting

Auto-Git includes built-in rate limiting:
- Max: 15 API calls per minute
- Uses sliding window algorithm
- Automatically backs off on rate limit

Configure rate limits:

```json
{
  "maxCallsPerMinute": 15,
  "rateLimitBackoffMs": 5000
}
```

## Next Steps

- [Intelligent Commits Guide](./features/intelligent-commits.md)
- [Best Practices](./guides/best-practices.md)
- [Troubleshooting](./guides/troubleshooting.md)
