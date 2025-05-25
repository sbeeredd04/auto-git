# Auto-Git v3.8.1

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![npm downloads](https://img.shields.io/npm/dm/@sbeeredd04/auto-git.svg)](https://www.npmjs.com/package/@sbeeredd04/auto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/issues)
[![GitHub Release](https://img.shields.io/github/release/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/releases)

> AI-powered automatic Git commits with Gemini-generated commit messages - now with enhanced interactive terminal session, persistent command history, markdown-formatted AI suggestions, and rock-solid multi-command support

Auto-Git is a cross-platform CLI tool that watches your files and automatically generates meaningful commit messages using Google's Gemini AI, then commits and pushes your changes. **Version 3.8.1** introduces a revolutionary enhanced interactive terminal session with persistent command history, markdown-formatted AI suggestions, git syntax highlighting, and completely reliable multi-command support.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Commands](#commands)
  - [Enhanced Interactive Session](#enhanced-interactive-session)
  - [Watch Mode](#watch-mode)
  - [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Professional Logging](#professional-logging--ux)
- [How It Works](#how-it-works)
- [Security & Privacy](#security--privacy)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Features

### Core Features
- **AI-Generated Commit Messages**: Uses Google Gemini to create conventional, meaningful commit messages
- **File Watching**: Automatically detect changes and commit them recursively (simple Ctrl+C to exit)
- **One-Shot Commits**: Manual commit generation for current changes
- **Professional Logging**: Clean, colorized output with styled boxes and minimal visual clutter
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Configurable**: Environment variables and user config support
- **Smart Debouncing**: Prevents spam commits during rapid file changes
- **Zero Config**: Works out of the box with just an API key

### 🚀 New in v3.8.1: Rock-Solid Interactive Session
- **🔧 Fixed Multi-Command Support**: Interactive session now reliably continues after each command execution
- **⚡ Improved Command Processing**: Resolved async input handler issues that caused session termination
- **🛡️ Enhanced Terminal State Management**: Proper raw mode handling prevents input conflicts
- **🔄 Seamless Command Flow**: Execute unlimited commands in sequence without interruption
- **📚 Persistent Command History**: Commands saved across sessions with arrow key navigation
- **🎨 Markdown-Formatted AI Responses**: Rich formatting for AI suggestions with syntax highlighting
- **⌨️ Arrow Key Navigation**: Use ↑↓ to browse through command history
- **🎯 Git Syntax Highlighting**: Enhanced display for Git commands with color coding
- **💾 Session Persistence**: Command history automatically saved and restored
- **🎮 Enhanced User Experience**: Improved prompts, better error handling, and cleaner interface

### Previous Features (Enhanced in v3.8.1)
- **AI Error Analysis**: Smart suggestions for failed commands with markdown formatting
- **Built-in Reset Commands**: Undo commits with safety checks
- **Smart Error Recovery**: Automatic retry with user guidance
- **Styled Help System**: Beautiful, organized help with clear navigation
- **Enhanced Error Handling**: Clear error messages with actionable solutions

## Quick Start

### 1. Install Auto-Git

**Option 1: Use npx (Recommended - No Installation Required)**
```bash
npx @sbeeredd04/auto-git setup
```

**Option 2: Global Installation**
```bash
npm install -g @sbeeredd04/auto-git
```

**If you get permission errors on macOS/Linux:**
```bash
# Fix npm permissions or use Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc
nvm install node
npm install -g @sbeeredd04/auto-git
```

### 2. Get a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Set it as an environment variable:

```bash
export GEMINI_API_KEY="your-api-key-here"
```

### 3. Use Auto-Git

**Get help with styled interface:**
```bash
# Beautiful, organized help system
auto-git --help
auto-git help
```

**One-time commit:**
```bash
# With npx (no installation)
npx @sbeeredd04/auto-git commit

# With global installation
auto-git commit
```

**Simple watch mode:**
```bash
# Simple file watching (Ctrl+C to exit)
auto-git watch
```

**Enhanced interactive session:**
```bash
# Start interactive terminal with AI assistance
auto-git interactive
```

## Installation

### Option 1: Global Installation (Recommended)
```bash
npm install -g @sbeeredd04/auto-git
```

### Option 2: Local Development
```bash
git clone https://github.com/sbeeredd04/auto-git.git
cd auto-git
npm install
npm link
```

### Option 3: Direct from Git
```bash
npm install -g git+https://github.com/sbeeredd04/auto-git.git
```

## Usage

### Styled Help System

Auto-Git v3.8.1 features a completely redesigned help system with beautiful styling and clear organization:

```bash
auto-git --help
```

**Example Output:**
```
┌───────────────────────────────────────────────────┐
│  Auto-Git v3.8.1                                  │
│  AI-powered Git automation with enhanced          │
│  interactive terminal session                     │
└───────────────────────────────────────────────────┘

USAGE:
  auto-git [command] [options]

AVAILABLE COMMANDS:
  watch                Watch files and auto-commit (simple Ctrl+C to exit)
  commit (c)           Generate AI commit for current changes
  interactive          Start enhanced interactive terminal session
  reset <count>        Undo commits with safety checks
  config               Show configuration
  setup                Interactive setup guide
  debug                Run system diagnostics
  help                 Display this help information

INTERACTIVE FEATURES:
  Enhanced Session     Persistent command history and markdown AI responses
  Multi-Command Support Rock-solid execution of unlimited commands in sequence
  Arrow Key Navigation Browse command history with ↑↓ keys
  Git Syntax Highlight Enhanced display for Git commands
  Session Persistence  Command history saved across restarts
  Ctrl+C              Exit from anywhere
```

### Commands

#### `auto-git commit` (or `auto-git c`)
Generates an AI commit message for current changes and commits/pushes them.

```bash
# With npx
npx @sbeeredd04/auto-git commit                 # Commit and push current changes
npx @sbeeredd04/auto-git commit --no-push       # Commit but don't push
npx @sbeeredd04/auto-git commit --verbose       # Enable detailed logging

# With global installation
auto-git commit                 # Commit and push current changes
auto-git commit --no-push       # Commit but don't push
auto-git commit --verbose       # Enable detailed logging
auto-git commit --dry-run       # Preview what would be committed (coming soon)
```

#### `auto-git watch`
Starts file watching mode with **interactive controls** - automatically commits changes when files are modified **recursively throughout the entire repository**.

```bash
# With npx
npx @sbeeredd04/auto-git watch                    # Watch ALL files recursively (default)
npx @sbeeredd04/auto-git watch --paths src lib    # Watch specific directories only
npx @sbeeredd04/auto-git watch --no-push          # Watch and commit but don't push
npx @sbeeredd04/auto-git watch --verbose          # Enable detailed logging output

# With global installation
auto-git watch                    # Watch ALL files recursively (default)
auto-git watch --paths src lib    # Watch specific directories only
auto-git watch --no-push          # Watch and commit but don't push
auto-git watch --verbose          # Enable detailed logging output
```

#### `auto-git reset`
Undo last commits with built-in safety checks and enhanced error handling.

```bash
# Reset last commit (mixed mode - keeps changes unstaged)
auto-git reset 1

# Reset last 2 commits with soft reset (keeps changes staged)
auto-git reset 2 --soft

# Hard reset with safety confirmation (WARNING: destroys changes)
auto-git reset 1 --hard
```

**Enhanced Error Handling:**
- Invalid input shows helpful examples
- Hard reset requires confirmation
- Clear next steps after successful reset
- Troubleshooting guidance on failure

#### `auto-git config`
Shows current configuration and setup status with styled output, including new interactive features and **intelligent navigation**.

```bash
# With npx
npx @sbeeredd04/auto-git config

# With global installation
auto-git config
```

**Enhanced Features:**
- Shows interactive features status
- Provides setup guidance for missing API key
- Clear next steps based on current state
- Troubleshooting links

#### `auto-git setup`
Interactive setup guide with step-by-step instructions and **example configuration**.

```bash
# With npx
npx @sbeeredd04/auto-git setup

# With global installation
auto-git setup
```

**New in v2.0:**
- Example configuration file
- Interactive features explanation
- Verification commands
- Clear next steps

#### `auto-git debug`
Run system diagnostics with **intelligent recommendations**.

```bash
# With npx
npx @sbeeredd04/auto-git debug

# With global installation
auto-git debug
```

**Enhanced Features:**
- Smart recommendations based on system state
- Clear action items
- Status-based guidance
- Troubleshooting help

### Enhanced Interactive Session

The new interactive session features:

- **Persistent Command History**: Commands saved across sessions with arrow key navigation
- **Markdown-Formatted AI Responses**: Rich formatting for AI suggestions with syntax highlighting
- **Git Syntax Highlighting**: Enhanced display for Git commands with color coding
- **Session Persistence**: Command history automatically saved and restored
- **Ctrl+C Exit**: Exit from anywhere

### Watch Mode

Auto-Git v3.8.1 supports simple watch mode with just Ctrl+C to exit.

### Configuration

Auto-Git supports multiple configuration methods (in order of priority):

1. **Environment Variables**
   ```bash
   export GEMINI_API_KEY="your-key"
   export AUTO_GIT_WATCH_PATHS="**/*,src/**,lib/**"  # Glob patterns
   export AUTO_GIT_DEBOUNCE_MS="30000"
   export AUTO_GIT_INTERACTIVE_ON_ERROR="true"       # Enable interactive error recovery
   export AUTO_GIT_ENABLE_SUGGESTIONS="true"         # Enable AI error suggestions
   ```

2. **User Config File** (`~/.auto-gitrc.json`)
   ```json
   {
     "apiKey": "your-gemini-api-key",
     "watchPaths": ["**/*"],
     "debounceMs": 30000,
     "interactiveOnError": true,
     "enableSuggestions": true,
     "hotkeys": {
       "pause": "ctrl+shift+p",
       "resume": "ctrl+shift+r",
       "enterRepl": "ctrl+shift+1",
       "pauseAlt": "1",
       "resumeAlt": "2",
       "enterReplAlt": "3"
     },
     "watchOptions": {
       "ignored": ["node_modules/**", "*.log"],
       "depth": null
     }
   }
   ```

3. **`.env` File** (in your project)
   ```bash
   GEMINI_API_KEY=your-key
   AUTO_GIT_INTERACTIVE_ON_ERROR=true
   AUTO_GIT_ENABLE_SUGGESTIONS=true
   ```

### Recursive File Watching

By default, Auto-Git now watches **ALL files recursively** in your repository:

- **Monitors all directories and subdirectories**
- **Watches all file types** (code, docs, configs, etc.)
- **Intelligent filtering** - ignores `.git`, `node_modules`, logs, temp files
- **Customizable patterns** - use glob patterns for specific needs
- **Performance optimized** - efficient recursive watching

**Default behavior:**
- Watches: `**/*` (all files recursively)
- Ignores: `.git/`, `node_modules/`, `*.log`, `*.tmp`, build outputs

**Custom patterns:**
```bash
# Watch only JavaScript and TypeScript files recursively
export AUTO_GIT_WATCH_PATHS="**/*.js,**/*.ts,**/*.json"

# Watch specific directories
auto-git watch --paths src docs tests
```

## Advanced Usage

### Verbose Mode
Enable detailed logging for troubleshooting:
```bash
auto-git watch --verbose
auto-git commit --verbose
```

### Interactive Error Recovery
```bash
# Configure in ~/.auto-gitrc.json
{
  "interactiveOnError": true,
  "enableSuggestions": true,
  "hotkeys": {
    "pause": "ctrl+shift+p",
    "resume": "ctrl+shift+r", 
    "enterRepl": "ctrl+shift+1",
    "pauseAlt": "1",
    "resumeAlt": "2",
    "enterReplAlt": "3"
  }
}
```

### Enhanced Git Command Support in REPL
```bash
# Start interactive mode
auto-git watch
# Press Ctrl+Shift+1 to enter REPL

# Run any git command with AI error handling
auto-git> git log --graph --oneline
auto-git> git rebase -i HEAD~3
auto-git> git cherry-pick abc123
auto-git> git bisect start

# Auto-detected git subcommands
auto-git> log --graph --oneline     # Runs: git log --graph --oneline
auto-git> rebase -i HEAD~3          # Runs: git rebase -i HEAD~3
auto-git> cherry-pick abc123        # Runs: git cherry-pick abc123

# When commands fail, get AI help automatically
auto-git> push origin feature
# ✗ Error: fatal: The current branch has no upstream branch
# 🤖 AI suggests: git push --set-upstream origin feature
# 🎓 Explains: "This sets up tracking between local and remote branch"
```

### Recursive Watch Patterns
```bash
# Default: Watch all files recursively
auto-git watch

# Watch specific file types across all directories
export AUTO_GIT_WATCH_PATHS="**/*.js,**/*.ts,**/*.md,**/*.json"
auto-git watch

# Watch specific directories and their subdirectories
auto-git watch --paths src tests docs

# Watch with custom ignore patterns in config file
```

### Advanced Configuration
Create `~/.auto-gitrc.json` for sophisticated setups:

```json
{
  "apiKey": "your-gemini-api-key",
  "watchPaths": ["**/*"],
  "debounceMs": 30000,
  "interactiveOnError": true,
  "enableSuggestions": true,
  "hotkeys": {
    "pause": "ctrl+shift+p",
    "resume": "ctrl+shift+r",
    "enterRepl": "ctrl+shift+1",
    "pauseAlt": "1",
    "resumeAlt": "2",
    "enterReplAlt": "3"
  },
  "watchOptions": {
    "ignored": [
      "node_modules/**",
      "dist/**", 
      "build/**",
      "coverage/**",
      "*.log",
      "*.tmp",
      "package-lock.json"
    ],
    "depth": null,
    "followSymlinks": false,
    "persistent": true
  }
}
```

### Environment-Specific Config
```bash
# Development - watch source files only with interactive features
export GEMINI_API_KEY="dev-key"
export AUTO_GIT_WATCH_PATHS="src/**,tests/**,docs/**"
export AUTO_GIT_INTERACTIVE_ON_ERROR="true"
auto-git watch --verbose

# Production - commit manually with all files
export GEMINI_API_KEY="prod-key" 
export AUTO_GIT_INTERACTIVE_ON_ERROR="false"
auto-git commit --no-push
```

### Performance Optimization
For large repositories, optimize watching:

```json
{
  "watchPaths": ["src/**", "lib/**", "*.md"],
  "debounceMs": 60000,
  "watchOptions": {
    "ignored": ["node_modules/**", "*.log", "dist/**"]
  }
}
```

## Professional Logging & UX

Auto-Git v2.0 features a completely redesigned user experience:

### Styled Interface
- **Beautiful Help System**: Organized, colorful help with clear sections
- **Styled Boxes**: Important information displayed in attractive boxes
- **Color Coding**: Different colors for success, error, warning, and info messages
- **Professional Output**: Clean, minimal design without clutter

### Intelligent Navigation
- **Context-Aware Guidance**: Different help based on current state
- **Clear Next Steps**: Always know what to do next
- **Actionable Errors**: Every error includes specific solutions
- **Smart Recommendations**: System suggests the best course of action

### Enhanced Error Messages
- **Structured Error Display**: Clear error boxes with context
- **Multiple Solution Options**: Different ways to resolve issues
- **Example Commands**: Copy-paste ready solutions
- **Troubleshooting Links**: Direct links to relevant commands

**Example Professional Output:**
```
┌─────────────────────────────────┐
│  REPOSITORY STATUS              │
│                                 │
│  Repository    ✓ Valid Git repo │
│  Branch        main             │
│  Remote        ✓ Configured     │
│  API Key       ✓ Set            │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  INTERACTIVE FEATURES (v2.0)   │
│                                 │
│  Error Recovery    ✓ Enabled    │
│  AI Suggestions    ✓ Enabled    │
│  Hotkeys          ctrl+p/r/i    │
└─────────────────────────────────┘

NEXT STEPS:
  auto-git watch                    # Start watching files
  auto-git commit                   # Make one-time commit
```

## How It Works

1. **Recursive File Detection**: Monitors file changes using `chokidar` with deep recursive watching of all repository files
2. **Smart Filtering**: Automatically ignores common non-source files (node_modules, .git, logs, temp files)
3. **Change Analysis**: Runs `git diff` to understand what changed across all monitored files
4. **AI Processing**: Sends comprehensive change analysis to Gemini AI for intelligent commit message generation
5. **Git Operations**: Automatically runs `git add .`, `git commit`, and `git push`
6. **Error Recovery**: On failure, analyzes errors with AI and provides interactive recovery options
7. **User Guidance**: Provides intelligent navigation and next steps based on current state

### Generated Commit Messages

Auto-Git generates conventional commit messages following best practices:

- `feat(auth): add user login validation`
- `fix(api): resolve null pointer exception` 
- `docs(readme): update installation steps`
- `refactor(utils): simplify date formatting`

## Security & Privacy

- **No secrets in repos**: API keys are never committed to your repository
- **User-specific config**: Each user manages their own API key
- **Local processing**: Only diffs are sent to Gemini API
- **Error sanitization**: Sensitive information is stripped from error messages before AI analysis
- **Optional pushing**: Can commit locally without pushing

## Development

### Project Structure
```
auto-git/
├── bin/auto-git.js      # CLI entrypoint with styled help
├── lib/
│   ├── config.js        # Configuration management
│   ├── gemini.js        # Gemini API integration
│   ├── git.js           # Git operations
│   ├── watcher.js       # File watching logic
│   ├── repl.js          # Interactive REPL
│   └── errorHandler.js  # Error recovery system
├── utils/
│   └── logger.js        # Centralized logging utility
├── package.json
└── README.md
```

### Testing Locally
```bash
# Install dependencies
npm install

# Link for local testing
npm link

# Test commands with verbose output
auto-git config
auto-git debug
auto-git commit --verbose

# Test interactive features
auto-git watch --verbose
# Press Ctrl+Shift+1 to enter REPL
# Press Ctrl+Shift+P to pause, Ctrl+Shift+R to resume

# Test styled help system
auto-git --help
auto-git setup
```

## Troubleshooting

### v3.6.0 Specific Issues (NEW)

**🚀 "Application gets stuck after interactive mode"**
- **FIXED in v3.6.0**: This issue is completely resolved
- Ctrl+C now force exits from anywhere
- Terminal state is properly restored after REPL
- Arrow keys work perfectly after returning from interactive mode

**🧠 "Typing 'git' shows as 'ggiitt'"**
- **FIXED in v3.6.0**: Smart input deduplication automatically handles this
- Duplicate characters are automatically removed
- Examples: "ggiitt" → "git", "ssttaattuuss" → "status"
- Works in real-time as you type

**🎯 "Ctrl+C doesn't work in navigation menu"**
- **FIXED in v3.6.0**: Bulletproof Ctrl+C handling everywhere
- Navigation menu: Ctrl+C immediately exits
- Interactive REPL: Ctrl+C force exits entire application
- File watcher: Ctrl+C cleanly shuts down
- No more stuck states or unresponsive terminals

**⚡ "Terminal becomes unresponsive"**
- **FIXED in v3.6.0**: Robust stdin management
- Proper cleanup and restoration of terminal state
- Enhanced compatibility across different terminal emulators
- Force exit option always available with Ctrl+C

### Common Issues

**"Not a git repository"**
- Ensure you're running the command inside a Git repository
- Run `git init` if needed
- **Enhanced guidance**: Auto-Git now provides clear setup steps

**"GEMINI_API_KEY not found"**
- Set your API key: `export GEMINI_API_KEY="your-key"`
- Or create `~/.auto-gitrc.json` with your key
- **Intelligent setup**: Use `auto-git setup` for guided configuration

**"Failed to push"**
- Ensure you have a remote configured: `git remote -v`
- Set up upstream: `git push --set-upstream origin main`
- **Smart diagnostics**: Run `auto-git debug` for recommendations

**Too many commits**
- Increase debounce time in config
- Use `--no-push` to commit locally only
- **Reset functionality**: Use `auto-git reset` to undo commits

**Interactive features not working**
- Ensure your terminal supports raw mode
- Check hotkey configuration in `~/.auto-gitrc.json`
- Try running with `--verbose` for debugging

### Enhanced Debug Information
```bash
# Get detailed system information with recommendations
auto-git debug

# Enable verbose logging
auto-git watch --verbose
auto-git commit --verbose

# Test interactive features (v3.6.0 - now bulletproof)
auto-git watch
# Press Ctrl+P to test navigation menu
# Select "Interactive mode" to test REPL
# Press Ctrl+C anywhere to force exit

# Get styled help
auto-git --help
auto-git setup
```

### Error Recovery
When Git errors occur:
1. Auto-Git will automatically analyze the error
2. AI suggestions will be displayed
3. Interactive REPL will open for manual resolution
4. Use `retry` command to attempt the operation again
5. Clear next steps provided for every scenario
6. **NEW in v3.6.0**: Force exit with Ctrl+C if needed

## FAQ

### General Questions

**Q: What is Auto-Git?**
A: Auto-Git is an AI-powered CLI tool that automatically generates meaningful commit messages using Google's Gemini AI and commits your changes. Version 3.8.1 adds enhanced interactive terminal session, persistent command history, markdown-formatted AI suggestions, and rock-solid multi-command support.

**Q: Do I need to install anything?**
A: No! You can use `npx @sbeeredd04/auto-git` without installation, or install globally with `npm install -g @sbeeredd04/auto-git`.

**Q: What's new in v3.8.1?**
A: v3.8.1 introduces:
- 🔧 **Fixed Multi-Command Support**: Interactive session now reliably continues after each command execution
- ⚡ **Improved Command Processing**: Resolved async input handler issues that caused session termination
- 🛡️ **Enhanced Terminal State Management**: Proper raw mode handling prevents input conflicts
- 🔄 **Seamless Command Flow**: Execute unlimited commands in sequence without interruption
- 📚 **Persistent Command History**: Commands saved across sessions with arrow key navigation (enhanced)
- 🎨 **Markdown-Formatted AI Responses**: Rich formatting for AI suggestions with syntax highlighting (enhanced)
- ⌨️ **Arrow Key Navigation**: Use ↑↓ to browse through command history (enhanced)
- 🎯 **Git Syntax Highlighting**: Enhanced display for Git commands with color coding (enhanced)
- 💾 **Session Persistence**: Command history automatically saved and restored (enhanced)
- 🎮 **Enhanced User Experience**: Improved prompts, better error handling, and cleaner interface (enhanced)

**Q: How do I force exit if something goes wrong?**
A: Press Ctrl+C anywhere - navigation menu, REPL, or file watcher. It will immediately exit the entire application with proper cleanup.

**Q: Why does my typing get duplicated?**
A: This was fixed in v3.6.0! The application now automatically removes duplicate characters as you type. "ggiitt ssttaattuuss" becomes "git status" automatically.