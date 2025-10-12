# 🧠 Intelligent Commit Pipeline Configuration

## Overview

The enhanced intelligent commit pipeline provides sophisticated control over when and how commits are made, with configurable thresholds, activity detection, and completeness analysis.

## Configuration Options

### Core Intelligent Commit Settings

```javascript
// In config.js or ~/.auto-gitrc.json
{
  "intelligentCommit": {
    // Commit threshold: determines minimum change significance to commit
    "commitThreshold": "medium", // Options: "any", "medium", "major"
    
    // Minimum time between commits in intelligent mode (30 minutes default)
    "minTimeBetweenCommits": 1800000, // milliseconds
    
    // Time to wait for user activity to settle before analyzing (5 minutes default)
    "activitySettleTime": 300000, // milliseconds
    
    // Only commit when changes appear to be complete implementations
    "requireCompleteness": true,
    
    // Buffer time for user to cancel commits
    "bufferTimeSeconds": 30,
    
    // Cancel commit if new changes detected during buffer period
    "cancelOnNewChanges": true
  }
}
```

### Environment Variables

```bash
# Commit threshold configuration
export AUTO_GIT_COMMIT_THRESHOLD="major"  # any, medium, major

# Timing configuration
export AUTO_GIT_MIN_TIME_BETWEEN_COMMITS=1800000  # 30 minutes in ms
export AUTO_GIT_ACTIVITY_SETTLE_TIME=300000       # 5 minutes in ms
export AUTO_GIT_BUFFER_TIME_SECONDS=30

# Completeness and cancellation
export AUTO_GIT_REQUIRE_COMPLETENESS=true
export AUTO_GIT_CANCEL_ON_NEW_CHANGES=true
```

## Commit Thresholds

### "any" - Commit All Meaningful Changes
- **Commits**: Any change that improves the codebase
- **Skips**: Only completely meaningless changes (empty commits, etc.)
- **Use Case**: Frequent commits, detailed history
- **Example**: Formatting fixes, comment updates, minor tweaks

### "medium" - Commit Substantial Changes (Default)
- **Commits**: Features, bug fixes, meaningful refactoring, documentation updates
- **Skips**: Formatting only, comment changes, trivial tweaks
- **Use Case**: Balanced approach, clean history without noise
- **Example**: New functions, bug fixes, configuration changes

### "major" - Only Significant Features
- **Commits**: New features, major bug fixes, breaking changes, architectural improvements
- **Skips**: Minor fixes, small refactoring, documentation updates, formatting
- **Use Case**: Milestone-based commits, major feature releases
- **Example**: New modules, API changes, major refactoring

## AI Analysis Framework

### Significance Levels
- **Trivial**: Whitespace, formatting, comments only
- **Minor**: Small bug fixes, typos, minor tweaks
- **Medium**: Feature additions, meaningful refactoring, substantial bug fixes
- **Major**: New functionality, breaking changes, architectural changes
- **Critical**: Security fixes, major features, system-wide changes

### Completeness Assessment
- **Incomplete**: Work in progress, debugging code, temporary changes
- **Partial**: Functional but missing tests, documentation, or edge cases
- **Complete**: Fully implemented, tested, documented, ready for production

### Change Type Classification
- **feature**: New functionality or enhancements
- **bugfix**: Bug fixes and error corrections
- **refactor**: Code restructuring without functionality changes
- **docs**: Documentation updates
- **style**: Formatting, code style changes
- **test**: Test additions or modifications
- **chore**: Maintenance tasks, build changes
- **performance**: Performance improvements
- **security**: Security-related changes

## Activity Detection & Debouncing

### Smart Activity Monitoring
```
File Change Detected
        ↓
Track Activity Count
        ↓
Cancel Pending Commits (if enabled)
        ↓
Wait for Activity to Settle (5 min default)
        ↓
Check Time Since Last Commit (30 min minimum)
        ↓
Analyze Changes with AI
        ↓
Apply Threshold & Completeness Filters
        ↓
Start Buffer Period (30 sec default)
        ↓
Execute Commit (if not cancelled)
```

### Key Features

1. **Activity Settle Time**: Waits for user to stop making changes before analyzing
2. **Minimum Commit Interval**: Prevents too frequent commits in intelligent mode
3. **Buffer Period Cancellation**: Automatically cancels commits if new changes detected
4. **Smart Debouncing**: Different logic for intelligent vs periodic modes

## Buffer Period Enhancements

### Enhanced Buffer Display
```
⏰ Enhanced Commit Buffer Period | 30 seconds to cancel

💬 feat(auth): add user authentication system

📋 Change Summary:
   Type: feature | Significance: major | Risk: medium

Press 'c', 'x', or Ctrl+X to cancel, or make file changes to auto-cancel...

⏳ Committing in 25 seconds... (Press 'c', 'x', or Ctrl+X to cancel or edit files to cancel)
```

### Auto-Cancellation
- **File Changes**: New file modifications automatically cancel pending commits
- **User Input**: Manual cancellation with 'c', 'x', or Ctrl+X
- **Activity Reset**: Prevents immediate re-analysis after cancellation

## Usage Examples

### Conservative Setup (Major Changes Only)
```json
{
  "commitMode": "intelligent",
  "intelligentCommit": {
    "commitThreshold": "major",
    "minTimeBetweenCommits": 3600000,  // 1 hour
    "activitySettleTime": 600000,      // 10 minutes
    "requireCompleteness": true,
    "cancelOnNewChanges": true
  }
}
```

### Balanced Setup (Default)
```json
{
  "commitMode": "intelligent",
  "intelligentCommit": {
    "commitThreshold": "medium",
    "minTimeBetweenCommits": 1800000,  // 30 minutes
    "activitySettleTime": 300000,      // 5 minutes
    "requireCompleteness": true,
    "cancelOnNewChanges": true
  }
}
```

### Frequent Commits Setup
```json
{
  "commitMode": "intelligent",
  "intelligentCommit": {
    "commitThreshold": "any",
    "minTimeBetweenCommits": 600000,   // 10 minutes
    "activitySettleTime": 120000,      // 2 minutes
    "requireCompleteness": false,
    "cancelOnNewChanges": false
  }
}
```

## Logging & Monitoring

### Enhanced Analysis Output
```
🧠 Intelligent mode: Activity settled (5 changes), analyzing for commit...

📊 Enhanced Change Analysis:
   Significance: MAJOR
   Completeness: COMPLETE
   Change Type: FEATURE
   Risk Level: MEDIUM
   Threshold: MEDIUM
   Decision: ✅ COMMIT
   Reason: Complete feature implementation with tests and documentation
```

### Activity Tracking
```
⚡ Activity detected, waiting 5 minutes for activity to settle...
⏱️ Intelligent mode: 15 minutes remaining before next commit analysis
🔄 New changes detected during buffer period, cancelling pending commit...
```

## Best Practices

### Recommended Thresholds by Project Type

**Production Applications**: `"major"` threshold
- Ensures only significant, complete features are committed
- Reduces noise in commit history
- Better for code reviews and releases

**Development/Experimental**: `"medium"` threshold
- Balances commit frequency with meaningful changes
- Good for iterative development
- Captures important progress without noise

**Documentation/Config**: `"any"` threshold
- Captures all meaningful improvements
- Good for projects with frequent small updates
- Maintains detailed change history

### Timing Recommendations

**Active Development**: 
- `minTimeBetweenCommits`: 15-30 minutes
- `activitySettleTime`: 3-5 minutes

**Maintenance Mode**:
- `minTimeBetweenCommits`: 1-2 hours
- `activitySettleTime`: 10-15 minutes

**Collaborative Projects**:
- `cancelOnNewChanges`: true
- `requireCompleteness`: true
- Higher thresholds to avoid conflicts

## Troubleshooting

### Common Issues

**Too Many Commits**: Increase threshold or `minTimeBetweenCommits`
**Too Few Commits**: Decrease threshold or `requireCompleteness`
**Commits During Development**: Enable `cancelOnNewChanges`
**Incomplete Commits**: Enable `requireCompleteness`

### Debug Logging
Set `AUTO_GIT_DEBUG=true` to see detailed activity and decision logging.

## Migration from Previous Versions

The new intelligent commit system is backward compatible. Existing configurations will use default values:
- `commitThreshold`: "medium"
- `minTimeBetweenCommits`: 30 minutes
- `requireCompleteness`: true
- `cancelOnNewChanges`: true

Update your configuration to take advantage of the new features. 