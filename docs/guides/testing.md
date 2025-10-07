# GitCue Extension Manual Testing Guide

## 📦 Installation

1. **Install from VSIX file**:
   ```bash
   code --install-extension gitcue-0.3.8.vsix
   ```

2. **Or install via VS Code UI**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X)
   - Click the "..." menu → "Install from VSIX..."
   - Select the `gitcue-0.3.8.vsix` file

## 🧪 Testing Scenarios

### 1. Buffer UI Timer Fix Testing

**Objective**: Verify that the commit buffer UI only updates the timer without reloading the entire page.

**Steps**:
1. Configure GitCue with valid Gemini API key
2. Set buffer time to 30 seconds: `"gitcue.bufferTimeSeconds": 30`
3. Make changes to some files in your workspace
4. Run command: `GitCue: AI Commit` (Ctrl+Alt+C)
5. Watch the buffer notification window

**Expected Results**:
- ✅ Timer should count down from 30 to 0
- ✅ Progress bar should decrease smoothly
- ✅ Only timer elements should update (no page flicker)
- ✅ Page should NOT reload every second
- ✅ Background and styling should remain stable
- ✅ Animation effects should work (pulse effect when <10 seconds)

**What to Watch For**:
- **❌ BAD**: Entire page refreshes every second
- **✅ GOOD**: Only timer numbers and progress bar update

### 2. Multiple AI Terminal Testing

**Objective**: Verify that multiple AI terminal instances can be created with unique names.

**Steps**:
1. Open command palette (Ctrl+Shift+P)
2. Run: `GitCue: Open AI Terminal`
3. Verify first terminal opens with name "GitCue AI 1"
4. Run the command again multiple times
5. Check terminal names in the terminal dropdown

**Expected Results**:
- ✅ First terminal: "GitCue AI 1"
- ✅ Second terminal: "GitCue AI 2"
- ✅ Third terminal: "GitCue AI 3"
- ✅ Each terminal should be a separate instance
- ✅ Closing a terminal should not affect others
- ✅ Terminal counter should continue incrementing

**Additional Tests**:
- Test keyboard shortcut: Ctrl+Alt+T (Cmd+Alt+T on Mac)
- Test from dashboard "Open Terminal" button
- Test terminal cleanup when closing terminals

### 3. Watch Status Fix Testing

**Objective**: Verify that the watch status correctly reflects the actual FileWatcherService state.

**Steps**:
1. Open GitCue status panel (should appear in Explorer sidebar)
2. Check initial status should be "Idle"
3. Run command: `GitCue: Toggle Auto-Watch` (Ctrl+Alt+W)
4. Check status should change to "Watching"
5. Open GitCue dashboard
6. Toggle watching from dashboard
7. Check status updates in both places

**Expected Results**:
- ✅ Status provider should show "Status: Watching" when active
- ✅ Status provider should show "Status: Idle" when inactive
- ✅ Status bar should show "👁 GitCue: Watching" when active
- ✅ Status bar should show "👁 GitCue: Idle" when inactive
- ✅ Dashboard should reflect correct state
- ✅ All UI elements should be synchronized

**What to Watch For**:
- **❌ BAD**: Status shows "Watching" but no actual file watching occurs
- **✅ GOOD**: Status matches actual functionality

### 4. UI Modernization Testing

**Objective**: Verify that the UI has been modernized with better styling and responsiveness.

**Steps**:
1. Open GitCue dashboard
2. Check visual styling and responsiveness
3. Test different VS Code themes (light/dark)
4. Resize the panel to test responsiveness
5. Check for proper animations and hover effects

**Expected Results**:
- ✅ Modern card-based layout
- ✅ Smooth hover effects and transitions
- ✅ Proper VS Code theme integration
- ✅ Responsive design that works at different sizes
- ✅ Clean typography and spacing
- ✅ Loading animations and progress indicators
- ✅ Proper use of VS Code color tokens

### 5. End-to-End Workflow Testing

**Objective**: Test the complete GitCue workflow with all new features.

**Steps**:
1. Configure GitCue with Gemini API key
2. Set up watch paths and commit mode
3. Start watching for changes
4. Make file changes
5. Observe commit buffer with timer
6. Test commit cancellation
7. Test multiple terminals
8. Test dashboard functionality

**Expected Results**:
- ✅ Complete workflow should work smoothly
- ✅ All UI elements should be responsive
- ✅ No JavaScript errors in developer console
- ✅ Proper state management across all components

## 🔧 Configuration for Testing

Add these settings to your VS Code settings.json for optimal testing:

```json
{
  "gitcue.geminiApiKey": "your-api-key-here",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": false,
  "gitcue.bufferTimeSeconds": 30,
  "gitcue.watchPaths": ["**/*.ts", "**/*.js", "**/*.json"],
  "gitcue.enableNotifications": true,
  "gitcue.autoWatch": false,
  "gitcue.debounceMs": 2000
}
```

## 🐛 Common Issues to Check

### Buffer UI Issues
- Timer not updating smoothly
- Page reloading/flickering
- Progress bar not working
- Cancel button not responsive

### Terminal Issues
- Terminals not getting unique names
- Terminal counter not incrementing
- Memory leaks from unclosed terminals
- Terminal cleanup not working

### Status Issues
- Status not reflecting actual state
- Status bar not updating
- Dashboard status inconsistent
- Watch toggle not working

### UI Issues
- Poor responsiveness
- Theme integration problems
- Missing animations
- Layout breaking at different sizes

## 📊 Performance Testing

### Memory Usage
- Monitor memory usage with multiple terminals
- Check for memory leaks
- Verify proper cleanup

### Responsiveness
- Test UI responsiveness during file watching
- Check for blocking operations
- Verify smooth animations

### Resource Usage
- Monitor CPU usage during active watching
- Check file system watcher performance
- Verify AI API call efficiency

## 🚀 Advanced Testing Scenarios

### Stress Testing
1. Create 10+ terminals
2. Watch large directories (1000+ files)
3. Make rapid file changes
4. Test with multiple VS Code windows

### Error Handling
1. Test with invalid API key
2. Test with network disconnection
3. Test with corrupted git repository
4. Test with insufficient permissions

### Edge Cases
1. Test with empty workspace
2. Test with very large files
3. Test with binary files
4. Test with symbolic links

## 📝 Bug Report Template

If you find issues, please report them with:

```
**Issue**: Brief description
**Steps to Reproduce**: 
1. Step 1
2. Step 2
3. Step 3

**Expected**: What should happen
**Actual**: What actually happens
**Environment**: 
- VS Code version
- GitCue version
- Operating system
- Node.js version

**Additional Info**: Any error messages, screenshots, or logs
```

## ✅ Testing Checklist

- [ ] Buffer UI updates only timer (no page reload)
- [ ] Multiple terminals with unique names
- [ ] Watch status correctly reflects actual state
- [ ] Modern UI styling and responsiveness
- [ ] Dashboard functionality
- [ ] Status bar updates
- [ ] Keyboard shortcuts work
- [ ] Configuration settings respected
- [ ] Error handling works
- [ ] Performance is acceptable
- [ ] Memory usage is reasonable
- [ ] All commands are registered
- [ ] Extension activates properly
- [ ] Cleanup works correctly

## 📋 Test Results

| Feature | Status | Notes |
|---------|--------|-------|
| Buffer UI Timer | ⏳ Testing | |
| Multiple Terminals | ⏳ Testing | |
| Watch Status | ⏳ Testing | |
| UI Modernization | ⏳ Testing | |
| End-to-End Workflow | ⏳ Testing | |

**Legend**: ✅ Pass | ❌ Fail | ⏳ Testing | ⚠️ Issues Found

---

Happy testing! 🎉 