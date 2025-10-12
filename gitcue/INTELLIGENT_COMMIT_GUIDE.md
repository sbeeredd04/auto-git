# 🧠 Intelligent Commit System - GitCue VSCode Extension

## Overview

The Intelligent Commit System provides sophisticated control over when and how commits are made in the GitCue VSCode extension. Instead of committing at random times, the system uses AI-powered analysis combined with configurable thresholds and activity tracking to make smart commit decisions.

## Key Features

### 1. **Activity Tracking & Debouncing**
- **Activity Settle Time**: Waits for development activity to settle before analyzing changes
- **Minimum Time Between Commits**: Prevents too-frequent commits by enforcing a minimum interval
- **Smart Change Detection**: Tracks file changes and avoids duplicate processing using diff hashing

### 2. **AI-Powered Analysis**
- **Significance Assessment**: Analyzes whether changes are trivial, minor, medium, major, or critical
- **Completeness Check**: Determines if changes are incomplete (WIP), partial (functional but missing tests/docs), or complete
- **Change Type Classification**: Identifies the type of change (feature, bugfix, refactor, docs, etc.)
- **Risk Evaluation**: Assesses the risk level of changes (breaking changes, architecture modifications)

### 3. **Configurable Commit Thresholds**
- **any**: Commits all meaningful changes
- **medium**: Commits substantial changes (features, bug fixes) - **Default**
- **major**: Only commits significant features and major changes

### 4. **Buffer Period & Cancellation**
- **Configurable Buffer Time**: Grace period to cancel commits before execution
- **Auto-Cancel on New Changes**: Automatically cancels pending commits if new file changes are detected
- **Manual Cancellation**: Cancel via notification, webview, or keyboard shortcut

## Configuration

### VS Code Settings

Access via: `File > Preferences > Settings > GitCue`

#### Core Settings

```json
{
  "gitcue.commitMode": "intelligent",  // Enable intelligent commit mode
  "gitcue.autoPush": true,             // Auto-push after commit
  "gitcue.enableNotifications": true,  // Show notifications
  "gitcue.debounceMs": 30000          // Standard debounce (30 seconds)
}
```

#### Intelligent Commit Settings

```json
{
  "gitcue.intelligentCommit.commitThreshold": "medium",
  "gitcue.intelligentCommit.minTimeBetweenCommits": 1800000,  // 30 minutes
  "gitcue.intelligentCommit.activitySettleTime": 300000,      // 5 minutes
  "gitcue.intelligentCommit.requireCompleteness": true,
  "gitcue.intelligentCommit.bufferTimeSeconds": 30,
  "gitcue.intelligentCommit.cancelOnNewChanges": true
}
```

### Configuration Presets

#### 🛡️ Conservative (Major Changes Only)
**Best for**: Production applications, stable branches

```json
{
  "gitcue.commitMode": "intelligent",
  "gitcue.intelligentCommit": {
    "commitThreshold": "major",
    "minTimeBetweenCommits": 3600000,    // 1 hour
    "activitySettleTime": 600000,        // 10 minutes
    "requireCompleteness": true,
    "bufferTimeSeconds": 60,
    "cancelOnNewChanges": true
  }
}
```

#### ⚖️ Balanced (Recommended Default)
**Best for**: Most development workflows

```json
{
  "gitcue.commitMode": "intelligent",
  "gitcue.intelligentCommit": {
    "commitThreshold": "medium",
    "minTimeBetweenCommits": 1800000,    // 30 minutes
    "activitySettleTime": 300000,        // 5 minutes
    "requireCompleteness": true,
    "bufferTimeSeconds": 30,
    "cancelOnNewChanges": true
  }
}
```

#### ⚡ Frequent Commits
**Best for**: Experimental projects, documentation work

```json
{
  "gitcue.commitMode": "intelligent",
  "gitcue.intelligentCommit": {
    "commitThreshold": "any",
    "minTimeBetweenCommits": 600000,     // 10 minutes
    "activitySettleTime": 120000,        // 2 minutes
    "requireCompleteness": false,
    "bufferTimeSeconds": 15,
    "cancelOnNewChanges": false
  }
}
```

## How It Works

### Activity Flow

```
1. File Change Detected
   ↓
2. Track Activity & Cancel Pending Commits (if enabled)
   ↓
3. Wait for Activity to Settle (activitySettleTime)
   ↓
4. Check Time Since Last Commit (minTimeBetweenCommits)
   ↓
5. Analyze Changes with AI
   - Assess significance
   - Check completeness
   - Identify change type
   - Evaluate risk
   ↓
6. Apply Threshold & Completeness Filters
   ↓
7. Start Buffer Period (bufferTimeSeconds)
   - Show notification with details
   - Allow cancellation
   ↓
8. Execute Commit (if not cancelled)
   ↓
9. Update Last Commit Time
```

### Commit Decision Logic

The AI analyzes changes and returns:
- `shouldCommit`: Boolean decision
- `reason`: Explanation for the decision
- `significance`: LOW, MEDIUM, or HIGH
- `completeness`: incomplete, partial, or complete
- `changeType`: feature, bugfix, refactor, docs, etc.
- `riskLevel`: low, medium, or high

**Threshold Logic:**
- `any`: Commits if significance >= LOW
- `medium`: Commits if significance >= MEDIUM
- `major`: Commits if significance >= HIGH

**Completeness Logic:**
- If `requireCompleteness: true`, only commits if completeness is `complete` or `partial`
- If `requireCompleteness: false`, commits regardless of completeness

## Usage Examples

### Starting Intelligent Mode

1. Open VS Code in a Git repository
2. Enable GitCue auto-watch: `Ctrl+Alt+W` (or `Cmd+Alt+W` on Mac)
3. Start making code changes
4. GitCue will automatically:
   - Track your activity
   - Wait for you to stop making changes
   - Analyze the changes with AI
   - Decide whether to commit based on your threshold
   - Show a buffer notification if committing

### Cancelling Commits

**During Buffer Period:**
- Click "Cancel Commit" in the notification
- Click "Cancel" in the buffer webview panel
- Press `Ctrl+Alt+X` (or `Cmd+Alt+X` on Mac)
- Make new file changes (if `cancelOnNewChanges: true`)

### Understanding Notifications

**Commit Approved:**
```
⏰ GitCue: feature (MEDIUM) - Committing in 30s
```
- Shows change type and significance
- Displays countdown timer
- Allows cancellation

**Commit Skipped:**
```
🤖 GitCue: Changes do not meet threshold (medium)
Continuing to monitor (next analysis in 5min after activity settles)...
```
- Explains why commit was skipped
- Indicates when next analysis will occur

## Activity Log

GitCue logs all activity in the Activity panel:

- 📝 **File Change**: Tracks individual file modifications
- 🤖 **AI Analysis**: Shows when AI is analyzing changes
- ⏰ **Waiting**: Indicates waiting for activity to settle or minimum time
- ✅ **Commit Approved**: Logs successful commit decisions
- ❌ **Skipped**: Logs when commits are skipped with reason
- 🚫 **Cancelled**: Logs when commits are manually cancelled

## Troubleshooting

### Too Many Commits
**Symptoms**: Commits happening too frequently

**Solutions**:
1. Increase `minTimeBetweenCommits` (e.g., from 30min to 1 hour)
2. Raise `commitThreshold` (from "medium" to "major")
3. Enable `requireCompleteness` to filter incomplete changes
4. Increase `activitySettleTime` to wait longer for activity to stop

### Too Few Commits
**Symptoms**: Not committing when you expect it to

**Solutions**:
1. Decrease `minTimeBetweenCommits` (e.g., from 30min to 10min)
2. Lower `commitThreshold` (from "medium" to "any")
3. Disable `requireCompleteness` to allow partial changes
4. Decrease `activitySettleTime` for faster response

### Commits During Active Development
**Symptoms**: Commits interrupting your workflow

**Solutions**:
1. Enable `cancelOnNewChanges` to auto-cancel when you continue editing
2. Increase `activitySettleTime` to ensure you're done
3. Use manual commit mode for active development sessions
4. Increase `bufferTimeSeconds` for more time to cancel

### AI Analysis Failures
**Symptoms**: Error messages about AI analysis

**Solutions**:
1. Verify Gemini API key is configured: `gitcue.geminiApiKey`
2. Check API rate limits: `gitcue.maxCallsPerMinute`
3. Review Output panel for detailed error messages
4. Ensure internet connectivity for AI API calls

## Best Practices

### 1. **Match Threshold to Project Type**
- **Production apps**: Use "major" threshold
- **Active development**: Use "medium" threshold  
- **Documentation/configs**: Use "any" threshold

### 2. **Adjust Timing for Work Style**
- **Rapid prototyping**: Short settle time (2-3 min), frequent commits
- **Careful development**: Long settle time (10-15 min), fewer commits
- **Pair programming**: Enable `cancelOnNewChanges` to prevent interruptions

### 3. **Use Completeness Wisely**
- **Stable branches**: Enable `requireCompleteness`
- **Feature branches**: Disable `requireCompleteness` for WIP commits
- **Experimentation**: Disable for quick iterations

### 4. **Configure Buffer Time**
- **Confident in AI**: Short buffer (15s)
- **Want review time**: Longer buffer (60s)
- **Collaborative work**: Longer buffer with `cancelOnNewChanges`

## Comparison with CLI

The VSCode extension's intelligent commit system is based on the CLI implementation (`lib/watcher.js`) but adapted for the VS Code environment:

### Similarities
- Same activity tracking and debouncing logic
- Identical AI analysis with threshold and completeness
- Same buffer period and cancellation mechanisms
- Consistent configuration options

### Differences
- **UI Integration**: VS Code notifications and webview panels instead of terminal output
- **Status Visualization**: Activity panel and sidebar integration
- **Keyboard Shortcuts**: VS Code command palette integration
- **Settings**: VS Code settings UI instead of config files

## API Reference

### Configuration Interface

```typescript
interface IntelligentCommitConfig {
  commitThreshold: 'any' | 'medium' | 'major';
  minTimeBetweenCommits: number;      // milliseconds
  activitySettleTime: number;          // milliseconds
  requireCompleteness: boolean;
  bufferTimeSeconds: number;
  cancelOnNewChanges: boolean;
}
```

### AI Analysis Response

```typescript
interface CommitDecision {
  shouldCommit: boolean;
  reason: string;
  significance: 'LOW' | 'MEDIUM' | 'HIGH';
  completeness: 'incomplete' | 'partial' | 'complete';
  changeType: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore' | 'performance' | 'security';
  riskLevel: 'low' | 'medium' | 'high';
  suggestedMessage?: string;
  nextSteps?: string[];
}
```

## Related Documentation

- [Main README](./README.md) - Extension overview and features
- [Configuration Guide](./MANUAL_TESTING_GUIDE.md) - Detailed configuration options
- [CLI Intelligent Commit](../lib/INTELLIGENT_COMMIT_CONFIG.md) - CLI version documentation

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the Output panel: `View > Output > GitCue`
3. Open an issue: [GitHub Issues](https://github.com/sbeeredd04/auto-git/issues)
