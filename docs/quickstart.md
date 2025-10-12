# Quick Start Guide

Get started with Auto-Git in 5 minutes!

## Step 1: Installation

Choose your tool:

### CLI
```bash
npm install -g @sbeeredd04/auto-git
```

### VS Code Extension
1. Open VS Code Extensions (`Cmd/Ctrl+Shift+X`)
2. Search "GitCue"
3. Click Install

## Step 2: Get API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or sign in to your Google account
3. Generate a new API key
4. Copy the key

## Step 3: Configure

### CLI
```bash
export GEMINI_API_KEY="your-api-key-here"
```

### VS Code
1. Open Settings (`Cmd/Ctrl+,`)
2. Search "GitCue API Key"
3. Paste your key

## Step 4: Use Auto-Git

### CLI - Watch Mode
```bash
cd your-project
auto-git watch
```

This will:
- Monitor file changes
- Generate AI commit messages
- Commit automatically based on your settings

### CLI - Single Commit
```bash
auto-git commit
```

### CLI - Interactive Terminal
```bash
auto-git interactive
```

### VS Code - AI Commit
1. Make some code changes
2. Press `Cmd/Ctrl+Alt+C`
3. Review AI-generated commit message
4. Confirm or edit

### VS Code - Auto-Watch
1. Press `Cmd/Ctrl+Alt+W` to start watching
2. Make changes to your code
3. Auto-Git will commit intelligently
4. Press `Cmd/Ctrl+Alt+W` again to stop

### VS Code - AI Terminal
1. Press `Cmd/Ctrl+Alt+T`
2. Run any shell command
3. Get AI help for errors automatically
4. Type `ai` for interactive AI chat

## Step 5: Customize (Optional)

### Choose Commit Mode

**Periodic Mode** (default):
- Commits at regular intervals
- Simple and predictable
- Good for active development

**Intelligent Mode**:
- AI decides when to commit
- Based on code significance
- Better commit history

Set in VS Code: Settings → GitCue → Commit Mode

### Configure Buffer Time

Buffer time lets you review commits before they're made:
- Default: 30 seconds
- Increase for more review time
- Decrease for faster commits

Set in VS Code: Settings → GitCue → Buffer Time Seconds

### Auto-Push Settings

Choose whether to push commits automatically:
- Default: false (local commits only)
- Set to true for automatic pushing

Set in VS Code: Settings → GitCue → Auto Push

## Common Workflows

### Development Workflow
```bash
# Start watching
auto-git watch --mode intelligent

# Code normally
# Auto-Git commits intelligently

# Stop watching (Ctrl+C)
```

### Quick Commit
```bash
# Make changes
git add .
auto-git commit
```

### Review Before Committing
```bash
# In VS Code, commits show 30-second buffer
# Click "Cancel" if you want to make more changes
# Or let it auto-commit after buffer expires
```

## Tips

1. **Start with Periodic Mode** - Get familiar with Auto-Git before trying intelligent mode
2. **Use Buffer Time** - Give yourself time to review AI-generated messages
3. **Try the Terminal** - The AI-powered terminal is great for troubleshooting
4. **Check Activity Logs** - Click on commit entries in VS Code to see detailed info
5. **Customize Watch Patterns** - Only watch files you care about

## Next Steps

- [Configuration Guide](./configuration.md) - Detailed configuration options
- [Intelligent Commits](./features/intelligent-commits.md) - Deep dive into AI commit decisions
- [Interactive Terminal](./features/interactive-terminal.md) - Learn terminal features
- [Best Practices](./guides/best-practices.md) - Get the most out of Auto-Git

## Troubleshooting

### API Key Issues
- Verify key is correct: `auto-git config` (CLI) or check VS Code settings
- Ensure you have API quota remaining
- Check [Google AI Studio](https://makersuite.google.com/app/apikey)

### Terminal Command Errors
- Ensure Git is installed and configured
- Check you're in a Git repository
- Use AI terminal for help: `Cmd/Ctrl+Alt+T`

### No Commits Happening
- Check file watcher is running
- Verify files match watch patterns
- Check debounce and buffer settings
- Review activity logs in dashboard

## Getting Help

- [Issue Tracker](https://github.com/sbeeredd04/auto-git/issues)
- [Full Documentation](./README.md)
- [Contributing Guide](./advanced/contributing.md)
