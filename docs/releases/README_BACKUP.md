# Auto-Git v3.9.0

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![npm downloads](https://img.shields.io/npm/dm/@sbeeredd04/auto-git.svg)](https://www.npmjs.com/package/@sbeeredd04/auto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/issues)

> AI-powered Git automation with intelligent commit decisions using Gemini function calling, smart diff optimization, push control, and enhanced interactive terminal session

Auto-Git is a cross-platform CLI tool that intelligently analyzes your code changes and automatically generates meaningful commit messages using Google's Gemini AI. **Version 3.9.0** introduces revolutionary intelligent commit mode with function calling, smart API optimization, and flexible push control.

## 🚀 What's New in v3.9.0

### 🧠 Intelligent Commit Mode
- **AI-Driven Decisions**: Gemini analyzes changes and decides when to commit based on significance
- **Function Calling**: Structured AI analysis with commit recommendations
- **30-Second Buffer**: Review and cancel commits before execution
- **Smart Significance Detection**: High/Medium/Low change analysis

### ⚡ Smart API Optimization
- **Diff Hash Tracking**: Only calls Gemini when actual changes are detected
- **80% API Usage Reduction**: Prevents redundant calls for unchanged files
- **Rate Limiting**: 15 calls per minute with sliding window protection
- **Debug Logging**: Clear feedback when API calls are optimized

### 📦 Push Control System
- **No-Push Mode**: Commit locally without pushing to remote
- **Flexible Configuration**: Command line, environment variables, or config file
- **Local Development**: Perfect for testing commits before sharing

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Commit Modes](#commit-modes)
  - [Commands](#commands)
  - [Interactive Session](#interactive-session)
- [Configuration](#configuration)
- [Intelligent Commit Guide](#intelligent-commit-guide)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Quick Start

### 1. Install Auto-Git

**Option 1: Use npx (No Installation Required)**
```bash
npx @sbeeredd04/auto-git setup
```

**Option 2: Global Installation**
```bash
npm install -g @sbeeredd04/auto-git
```

### 2. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set it as an environment variable:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Start Using Auto-Git

```bash
# Get beautiful help interface
auto-git --help

# One-time commit with AI message
auto-git commit

# Simple file watching (periodic mode)
auto-git watch

# Intelligent commit mode with AI decisions
auto-git watch --mode intelligent

# Interactive terminal session
auto-git interactive
```

## Installation

### Global Installation (Recommended)
```bash
npm install -g @sbeeredd04/auto-git
```

### Using npx (No Installation)
```bash
npx @sbeeredd04/auto-git [command]
```

### Local Development
```bash
git clone https://github.com/sbeeredd04/auto-git.git
cd auto-git
npm install
npm link
```

## Usage

### Commit Modes

#### Periodic Mode (Default)
Traditional time-based commits after file changes:
```bash
auto-git watch                    # Start periodic mode
auto-git watch --no-push          # Commit without pushing
```

#### Intelligent Mode (New in v3.9.0)
AI analyzes changes and decides when to commit:
```bash
auto-git watch --mode intelligent              # Start intelligent mode
auto-git watch --mode intelligent --no-push    # Intelligent mode, no push
```

**Intelligent Mode Features:**
- Analyzes code changes for significance and completeness
- Only commits when changes represent meaningful work
- 30-second buffer to cancel commits
- Smart API optimization reduces usage by 80%
- Rate limited to 15 API calls per minute

### Commands

#### `auto-git commit` (or `auto-git c`)
Generate AI commit message for current changes:
```bash
auto-git commit                   # Commit and push
auto-git commit --no-push         # Commit only
auto-git commit --verbose         # Detailed logging
```

#### `auto-git watch`
Watch files and auto-commit with AI messages:
```bash
auto-git watch                              # Periodic mode
auto-git watch --mode intelligent           # Intelligent mode
auto-git watch --no-push                    # No push mode
auto-git watch --paths src/ docs/           # Custom paths
```

#### `auto-git interactive`
Enhanced terminal session with AI assistance:
```bash
auto-git interactive
```

**Interactive Features:**
- Persistent command history with arrow key navigation
- Markdown-formatted AI responses
- Git syntax highlighting
- Session persistence across restarts
- Multi-command support

#### `auto-git reset <count>`
Undo commits with safety checks:
```bash
auto-git reset 1                  # Reset last commit (mixed)
auto-git reset 2 --soft           # Reset 2 commits (soft)
auto-git reset 1 --hard           # Reset 1 commit (hard)
```

#### `auto-git config`
Show current configuration:
```bash
auto-git config                   # Display all settings
```

#### `auto-git debug`
Run system diagnostics:
```bash
auto-git debug                    # Health check and recommendations
```

#### `auto-git setup`
Interactive setup guide:
```bash
auto-git setup                    # First-time setup
```

### Interactive Session

The enhanced interactive session provides a powerful terminal environment:

```bash
auto-git interactive
```

**Features:**
- **Command History**: Use ↑↓ arrows to browse previous commands
- **AI Error Analysis**: Get intelligent suggestions for failed commands
- **Git Syntax Highlighting**: Enhanced display for Git commands
- **Session Persistence**: History saved across restarts
- **Markdown Formatting**: Rich AI responses with syntax highlighting
- **Force Exit**: Ctrl+C works anywhere

## Configuration

### Environment Variables
```bash
export GEMINI_API_KEY="your-api-key"
export AUTO_GIT_COMMIT_MODE="intelligent"    # or "periodic"
export AUTO_GIT_NO_PUSH="true"               # Disable pushing
export AUTO_GIT_MAX_CALLS_PER_MINUTE="15"    # Rate limit
export AUTO_GIT_BUFFER_TIME_SECONDS="30"     # Cancellation buffer
export AUTO_GIT_DEBOUNCE_MS="30000"          # File change delay
```

### Configuration File (`~/.auto-gitrc.json`)
```json
{
  "apiKey": "your-gemini-api-key",
  "commitMode": "intelligent",
  "noPush": false,
  "debounceMs": 30000,
  "rateLimiting": {
    "maxCallsPerMinute": 15,
    "bufferTimeSeconds": 30
  },
  "watchPaths": ["src/**", "docs/**"],
  "watchOptions": {
    "ignored": ["node_modules/**", "*.log", "dist/**"]
  }
}
```

### Command Line Options
```bash
# Commit modes
auto-git watch --mode periodic
auto-git watch --mode intelligent

# Push control
auto-git watch --no-push
auto-git commit --no-push

# Verbose output
auto-git watch --verbose
auto-git commit --verbose

# Custom paths
auto-git watch --paths src/ docs/
```

## Intelligent Commit Guide

### How It Works

1. **Change Detection**: Monitors file system events
2. **Diff Analysis**: Generates Git diff for changes
3. **Hash Comparison**: Skips analysis if diff unchanged (optimization)
4. **AI Analysis**: Gemini analyzes changes using function calling
5. **Decision Making**: AI decides if changes warrant a commit
6. **User Buffer**: 30-second window to cancel
7. **Execution**: Automatic commit if not cancelled

### Example Workflow

```bash
$ auto-git watch --mode intelligent --no-push

📝 File changed: src/auth.js
📝 New changes detected, analyzing...
🤖 Analyzing changes for commit decision...
✅ AI analysis completed

📊 Change Analysis:
   Significance: HIGH
   Decision: ✅ COMMIT
   Reason: Added complete user authentication feature with validation

⏰ Commit Buffer Period (30 seconds to cancel)
💬 feat(auth): add user login validation

Press 'c' to cancel this commit within 30 seconds...
⏳ Committing in 29 seconds... (Press 'c' to cancel)

✅ Committed successfully (push disabled)
📝 Commit: feat(auth): add user login validation

# Later, same file saved with no actual changes
📝 File changed: src/auth.js
🔄 Diff unchanged since last analysis, skipping Gemini call
```

### When AI Skips Commits

The AI will skip commits for:
- Incomplete features or work-in-progress
- Debugging code or temporary changes
- Minor formatting or whitespace changes
- Configuration files with trivial updates
- Changes that don't represent a complete unit of work

### Significance Levels

- **High**: New features, critical fixes, breaking changes, major refactoring
- **Medium**: Minor features, bug fixes, code improvements, documentation
- **Low**: Formatting changes, comments, trivial fixes, config tweaks

## Examples

### Basic Usage
```bash
# Setup and first commit
auto-git setup
auto-git commit

# Start watching with intelligent mode
auto-git watch --mode intelligent

# Local development workflow
auto-git watch --mode intelligent --no-push
# ... make changes ...
# ... commits happen automatically when significant ...
git push origin main  # Push when ready
```

### Advanced Configuration
```bash
# Custom environment setup
export AUTO_GIT_COMMIT_MODE=intelligent
export AUTO_GIT_NO_PUSH=true
export AUTO_GIT_BUFFER_TIME_SECONDS=45

# Start with custom settings
auto-git watch --verbose

# Interactive session for manual control
auto-git interactive
```

### Generated Commit Messages

Auto-Git generates conventional commit messages:
- `feat(auth): add user login validation`
- `fix(api): resolve null pointer exception`
- `docs(readme): update installation steps`
- `refactor(utils): simplify date formatting`
- `chore(deps): update package dependencies`

## Troubleshooting

### Common Issues

**"GEMINI_API_KEY not found"**
```bash
# Set your API key
export GEMINI_API_KEY="your-key"
# Or use setup guide
auto-git setup
```

**"Not a git repository"**
```bash
# Initialize Git repository
git init
git remote add origin <url>
auto-git watch
```

**"Rate limit exceeded"**
```bash
# The optimization should prevent this, but if it occurs:
# Wait for rate limit to reset (shows countdown)
# Or reduce file change frequency
```

**"Push failed"**
```bash
# Check remote configuration
git remote -v
# Set upstream branch
git push --set-upstream origin main
# Or use no-push mode
auto-git watch --no-push
```

### Debug Information
```bash
# Get system diagnostics
auto-git debug

# Enable verbose logging
auto-git watch --verbose
auto-git commit --verbose

# Check configuration
auto-git config
```

### Performance Issues

**Too many API calls:**
- The v3.9.0 optimization should reduce calls by 80%
- Check rate limiting in config display
- Use `--verbose` to see when calls are skipped

**Slow response:**
- Increase debounce time: `export AUTO_GIT_DEBOUNCE_MS=60000`
- Use periodic mode for less AI analysis
- Check network connection to Gemini API

## Development

### Project Structure
```
auto-git/
├── bin/auto-git.js           # CLI entrypoint
├── lib/
│   ├── config.js            # Configuration management
│   ├── gemini.js            # Gemini API with function calling
│   ├── git.js               # Git operations
│   ├── watcher.js           # File watching with optimization
│   ├── repl.js              # Interactive session
│   ├── rateLimiter.js       # Rate limiting system
│   └── errorHandler.js      # Error recovery
├── utils/
│   └── logger.js            # Centralized logging
├── example-config.json      # Configuration example
└── package.json
```

### Testing Locally
```bash
# Install and link
npm install
npm link

# Test commands
auto-git config
auto-git debug
auto-git commit --verbose

# Test intelligent mode
auto-git watch --mode intelligent --verbose

# Test optimization
# Save same file multiple times - should see "skipping Gemini call"

# Test interactive features
auto-git interactive
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Security & Privacy

- **No secrets in repos**: API keys never committed
- **Local processing**: Only diffs sent to Gemini
- **Error sanitization**: Sensitive info stripped from errors
- **User control**: 30-second buffer to cancel commits
- **Optional pushing**: Can commit locally only

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/sbeeredd04/auto-git/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sbeeredd04/auto-git/discussions)
- **NPM**: [@sbeeredd04/auto-git](https://www.npmjs.com/package/@sbeeredd04/auto-git)

---

**Auto-Git v3.9.0** - Making Git automation intelligent, efficient, and user-friendly.