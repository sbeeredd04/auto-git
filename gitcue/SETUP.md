# GitCue Extension - Setup Guide

## 🚀 Quick Installation & Testing

### 1. Install the Extension

**Option A: Install from VSIX file**
```bash
code --install-extension gitcue-0.0.1.vsix
```

**Option B: Development Mode**
1. Open VS Code
2. Press `F5` to launch Extension Development Host
3. Test the extension in the new window

### 2. Configure API Key

1. Open VS Code Settings (`Cmd+,` or `Ctrl+,`)
2. Search for "GitCue"
3. Set your Gemini API key in `GitCue: Gemini Api Key`

Or set via environment variable:
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Test the Extension

1. **Open a Git repository** in VS Code
2. **Make some changes** to files
3. **Try manual commit**: `Cmd+Alt+C` (Mac) or `Ctrl+Alt+C` (Windows/Linux)
4. **Toggle auto-watch**: `Cmd+Alt+W` (Mac) or `Ctrl+Alt+W` (Windows/Linux)
5. **Open dashboard**: Command Palette → "GitCue: Open Dashboard"

## 🎯 Features to Test

### ✅ Manual Commit
- [ ] Press `Cmd+Alt+C` to trigger AI commit
- [ ] Review the generated commit message
- [ ] Edit message if needed
- [ ] Choose to push or not
- [ ] Verify commit was created

### ✅ Auto-Watch Mode
- [ ] Press `Cmd+Alt+W` to start watching
- [ ] Status bar shows "GitCue: Watching"
- [ ] Make file changes
- [ ] Wait for debounce period (30 seconds default)
- [ ] Commit preview should appear automatically

### ✅ Dashboard
- [ ] Open Command Palette (`Cmd+Shift+P`)
- [ ] Run "GitCue: Open Dashboard"
- [ ] Verify status information is displayed
- [ ] Check configuration details

### ✅ Settings
- [ ] Open VS Code Settings
- [ ] Search for "GitCue"
- [ ] Verify all settings are available
- [ ] Test changing commit mode, auto-push, etc.

### ✅ Status Bar
- [ ] GitCue status visible in status bar
- [ ] Click to toggle watching mode
- [ ] Icon changes based on state

## 🔧 Troubleshooting

### Extension Not Loading
```bash
# Check if extension is installed
code --list-extensions | grep gitcue

# Reload VS Code window
Cmd+R (Mac) or Ctrl+R (Windows/Linux)
```

### API Key Issues
```bash
# Check environment variable
echo $GEMINI_API_KEY

# Or set in VS Code settings
# Settings → Search "GitCue" → Set API key
```

### Git Repository Issues
```bash
# Ensure you're in a Git repository
git status

# Initialize if needed
git init
git remote add origin <your-repo-url>
```

### Debug Information
1. Open Output panel: `View → Output`
2. Select "GitCue" from dropdown
3. Check for error messages
4. Use "GitCue: Show Status" command

## 📦 Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npx @vscode/vsce package

# Install packaged extension
code --install-extension gitcue-0.0.1.vsix

# Uninstall extension
code --uninstall-extension sbeeredd04.gitcue
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **Status Bar**: GitCue status indicator on the right
2. **Commands**: All GitCue commands available in Command Palette
3. **Settings**: GitCue settings section in VS Code preferences
4. **Notifications**: Success messages when commits are made
5. **Output**: Detailed logs in GitCue output channel

## 🚀 Next Steps

Once the extension is working:

1. **Customize Settings**: Adjust watch patterns, debounce time, etc.
2. **Test Different Modes**: Try both "intelligent" and "periodic" modes
3. **Keyboard Shortcuts**: Customize hotkeys in VS Code keybindings
4. **Share Feedback**: Report issues or suggestions on GitHub

---

**Happy coding with GitCue! 🎯** 