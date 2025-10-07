# Intelligent Commit Implementation - Testing Guide

## Overview

This guide helps you test the newly implemented intelligent commit system in the GitCue VSCode extension.

## What Was Implemented

### 1. Core Features
- ✅ **Activity Tracking**: Monitors file changes and tracks activity patterns
- ✅ **Smart Debouncing**: Waits for activity to settle before analyzing
- ✅ **Time-Based Throttling**: Enforces minimum time between commits
- ✅ **AI Analysis Enhancement**: Completeness, significance, change type, risk assessment
- ✅ **Threshold System**: Configurable commit criteria (any/medium/major)
- ✅ **Auto-Cancel**: Cancels pending commits when new changes are detected

### 2. Configuration Options
- `commitThreshold`: 'any' | 'medium' | 'major'
- `minTimeBetweenCommits`: Time in ms (default: 30 min)
- `activitySettleTime`: Time in ms (default: 5 min)
- `requireCompleteness`: Boolean (default: true)
- `bufferTimeSeconds`: Number (default: 30)
- `cancelOnNewChanges`: Boolean (default: true)

## Testing Scenarios

### Scenario 1: Basic Intelligent Mode
**Goal**: Verify intelligent mode works with default settings

1. Configure GitCue:
   ```json
   {
     "gitcue.commitMode": "intelligent",
     "gitcue.intelligentCommit.commitThreshold": "medium",
     "gitcue.intelligentCommit.activitySettleTime": 120000,
     "gitcue.intelligentCommit.minTimeBetweenCommits": 300000
   }
   ```

2. Enable auto-watch (Ctrl+Alt+W)
3. Make a meaningful code change (add a new function)
4. Wait for activity to settle (2 minutes)
5. Observe:
   - ✅ Activity log shows "Activity settled"
   - ✅ AI analysis runs
   - ✅ If threshold met, buffer notification appears
   - ✅ Commit executes after buffer period

**Expected**: Commit should occur ~2 minutes after stopping edits

### Scenario 2: Activity Settle Time
**Goal**: Verify system waits for activity to stop

1. Configure short settle time (2 min)
2. Make a change, wait 1 minute
3. Make another change, wait 1 minute
4. Make another change, wait 2 minutes without edits
5. Observe:
   - ✅ No commit during the first 2 changes
   - ✅ Commit analysis starts after final 2-minute wait

**Expected**: Only one analysis after all activity stops

### Scenario 3: Minimum Time Between Commits
**Goal**: Verify time throttling works

1. Configure:
   ```json
   {
     "gitcue.intelligentCommit.minTimeBetweenCommits": 600000,
     "gitcue.intelligentCommit.activitySettleTime": 60000
   }
   ```

2. Make first change, let it commit
3. Immediately make second change
4. Wait for settle time (1 min)
5. Observe:
   - ✅ Activity log shows "X minutes remaining before next commit"
   - ✅ Analysis delayed until min time passes

**Expected**: Second commit waits for minimum interval

### Scenario 4: Commit Threshold - Medium
**Goal**: Test medium threshold filtering

1. Configure threshold: "medium"
2. Test with these changes:
   - **Formatting only** (fix indentation): Should skip
   - **Add comments only**: Should skip
   - **Fix a bug**: Should commit
   - **Add new feature**: Should commit
   
3. Observe AI decision in Activity log

**Expected**: Only bug fixes and features commit

### Scenario 5: Commit Threshold - Major
**Goal**: Test major threshold filtering

1. Configure threshold: "major"
2. Test with these changes:
   - **Small bug fix**: Should skip
   - **Minor refactoring**: Should skip
   - **New major feature**: Should commit
   - **Breaking API change**: Should commit

**Expected**: Only significant changes commit

### Scenario 6: Commit Threshold - Any
**Goal**: Test any threshold (commits everything)

1. Configure threshold: "any"
2. Test with these changes:
   - **Fix typo**: Should commit
   - **Add comment**: Should commit
   - **Rename variable**: Should commit

**Expected**: All meaningful changes commit

### Scenario 7: Completeness Requirement
**Goal**: Test completeness filtering

1. Configure: `"requireCompleteness": true`
2. Test with these changes:
   - **Add TODO comment and partial code**: Should skip
   - **Add console.log for debugging**: Should skip
   - **Complete function with tests**: Should commit
   - **Documented feature**: Should commit

**Expected**: Only complete changes commit

### Scenario 8: Cancel on New Changes
**Goal**: Test auto-cancellation

1. Configure: `"cancelOnNewChanges": true`
2. Make a change, wait for settle time
3. When buffer notification appears, quickly make another change
4. Observe:
   - ✅ Buffer notification disappears
   - ✅ Activity log shows "cancelled pending commit"
   - ✅ New activity tracking starts

**Expected**: Pending commit automatically cancelled

### Scenario 9: Manual Cancellation
**Goal**: Test manual cancel methods

1. Make a change and let buffer period start
2. Test cancellation methods:
   - Click "Cancel Commit" in notification
   - Press Ctrl+Alt+X
   - Close buffer webview panel
3. Observe:
   - ✅ Commit is cancelled
   - ✅ Activity log updated
   - ✅ Notification shown

**Expected**: All methods successfully cancel

### Scenario 10: Multiple Rapid Changes
**Goal**: Test debouncing with rapid edits

1. Configure short settle time (1 min)
2. Rapidly edit multiple files (every 10 seconds for 2 minutes)
3. Stop editing and wait
4. Observe:
   - ✅ No analysis during rapid changes
   - ✅ Activity counter increases
   - ✅ Analysis happens after activity stops
   - ✅ Single commit for all changes

**Expected**: One commit after all changes settle

## Verification Checklist

### Configuration
- [ ] All intelligent commit settings appear in VS Code settings
- [ ] Settings have correct types (string enums, numbers, booleans)
- [ ] Default values match documentation
- [ ] Settings persist across VS Code restarts

### Activity Tracking
- [ ] File changes increment activity counter
- [ ] Activity log shows file change events
- [ ] Last diff hash prevents duplicate processing
- [ ] Activity settle timer resets on new changes

### AI Analysis
- [ ] Analysis includes significance, completeness, type, risk
- [ ] Threshold logic correctly filters commits
- [ ] Completeness requirement works as expected
- [ ] AI errors fall back gracefully

### Timing & Debouncing
- [ ] Activity settle time works correctly
- [ ] Minimum time between commits enforced
- [ ] Debounce timer clears on new changes
- [ ] Multiple timers don't conflict

### Buffer & Cancellation
- [ ] Buffer notification shows correct countdown
- [ ] Buffer displays change type and significance
- [ ] Cancel on new changes works
- [ ] Manual cancellation methods work
- [ ] Buffer time uses intelligent config value

### User Feedback
- [ ] Notifications show meaningful messages
- [ ] Activity log captures all events
- [ ] Skipped commits explain reason
- [ ] Error messages are helpful

### Edge Cases
- [ ] No changes detected: Skips gracefully
- [ ] API key missing: Shows clear error
- [ ] AI failure: Falls back appropriately
- [ ] Git errors: Logged and reported
- [ ] Rapid start/stop watching: No crashes

## Performance Validation

### Memory
- [ ] No memory leaks from timers
- [ ] Activity tracking doesn't grow unbounded
- [ ] Diff hash map cleans up properly

### API Usage
- [ ] Rate limiting prevents excessive calls
- [ ] Diff hash prevents duplicate API calls
- [ ] AI calls only when necessary

### Responsiveness
- [ ] UI remains responsive during analysis
- [ ] File watching doesn't lag editor
- [ ] Large diffs handled efficiently

## Documentation Validation

- [ ] INTELLIGENT_COMMIT_GUIDE.md is complete
- [ ] README.md references guide correctly
- [ ] Example configuration file is clear
- [ ] VS Code setting descriptions are helpful
- [ ] All features documented

## Known Limitations

1. **API Dependency**: Requires internet connection for AI analysis
2. **Gemini API**: Subject to rate limits and quota
3. **Git Repository**: Must be in a valid git repository
4. **File System**: Relies on VS Code file watching capabilities

## Troubleshooting During Testing

### If commits aren't happening:
1. Check Activity log for AI decision reason
2. Verify threshold isn't too high
3. Check if min time between commits hasn't passed
4. Ensure API key is configured
5. Review Output panel for errors

### If commits happen too frequently:
1. Increase minTimeBetweenCommits
2. Raise commitThreshold
3. Enable requireCompleteness
4. Increase activitySettleTime

### If buffer cancels unexpectedly:
1. Check if cancelOnNewChanges is enabled
2. Verify no background processes modifying files
2. Review Activity log for file change events

## Success Criteria

The implementation is successful if:
- ✅ All 10 test scenarios pass
- ✅ Verification checklist is complete
- ✅ No crashes or errors in normal usage
- ✅ Performance is acceptable
- ✅ Documentation is clear and complete
- ✅ User experience is intuitive

## Next Steps After Testing

1. Address any issues found during testing
2. Update documentation if needed
3. Consider adding telemetry for real-world usage insights
4. Gather user feedback on default settings
5. Optimize timing defaults based on usage patterns

## Feedback

When reporting issues or suggestions:
1. Include your configuration settings
2. Describe the scenario and expected behavior
3. Attach Activity log and Output panel content
4. Note your VS Code and GitCue versions
