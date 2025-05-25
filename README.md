# Auto-Git v3.5.0

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![npm downloads](https://img.shields.io/npm/dm/@sbeeredd04/auto-git.svg)](https://www.npmjs.com/package/@sbeeredd04/auto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/issues)
[![GitHub Release](https://img.shields.io/github/release/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/releases)

> AI-powered automatic Git commits with Gemini-generated commit messages - now with completely stable REPL and proper input handling

Auto-Git is a cross-platform CLI tool that watches your files and automatically generates meaningful commit messages using Google's Gemini AI, then commits and pushes your changes. **Version 3.5.0** completely fixes the REPL character duplication issue and provides a stable, reliable interactive experience.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Commands](#commands)
  - [Interactive Controls](#interactive-controls)
  - [Enhanced Git Command Support](#enhanced-git-command-support)
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
- **File Watching**: Automatically detect changes and commit them recursively
- **One-Shot Commits**: Manual commit generation for current changes
- **Professional Logging**: Clean, colorized output with styled boxes and minimal visual clutter
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Configurable**: Environment variables and user config support
- **Smart Debouncing**: Prevents spam commits during rapid file changes
- **Zero Config**: Works out of the box with just an API key

### New in v2.0: Interactive Controls & Enhanced UX
- **Keyboard Shortcuts**: Pause/resume watching with hotkeys
- **Interactive REPL**: On-demand command interface for manual control
- **Error-Driven AI Suggestions**: AI analyzes Git errors and suggests solutions
- **Built-in Reset Commands**: Undo commits with safety checks
- **Smart Error Recovery**: Automatic retry with user guidance
- **Real-time Control**: Pause, resume, and interact without stopping the watcher
- **Styled Help System**: Beautiful, organized help with clear navigation
- **Intelligent Navigation**: Context-aware guidance and next steps
- **Enhanced Error Handling**: Clear error messages with actionable solutions

### New in v3.3.0: Intuitive Navigation Menu
- **Simplified Controls**: Just Ctrl+P to pause and access all options
- **Arrow Key Navigation**: Use ↑↓ arrows to navigate menu options
- **Visual Menu System**: Clear descriptions for each option
- **One-Key Access**: Enter to select, Escape to cancel
- **Smart Workflow**: Seamless transitions between watching, interactive mode, and exit

### New in v3.4.0: Critical Bug Fixes
- **Fixed Navigation Menu**: Resolved duplicate menu display issue
- **Fixed REPL Character Duplication**: No more "ggiitt" when typing "git"
- **Added Ctrl+R Resume**: Resume watcher directly from REPL with Ctrl+R
- **Improved Raw Mode Handling**: Better terminal compatibility and input handling
- **Enhanced Error Recovery**: Cleaner transitions between modes

### New in v3.5.0: Completely Stable REPL
- **Fixed Character Duplication**: No more "ggiitt" when typing "git" - completely resolved
- **Stable Input Handling**: Switched from inquirer to readline for better terminal compatibility
- **Clear Exit Commands**: Type "resume" to resume watcher, "exit" to exit without resuming
- **Proper Terminal State**: Clean transitions between navigation menu and REPL
- **Reliable Experience**: No more input conflicts or terminal state issues

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

**Worst case scenario - you can use sudo:**
```bash
sudo npm install -g @sbeeredd04/auto-git@latest
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

**Watch mode (continuous with interactive controls):**
```bash
# With npx (no installation)
npx @sbeeredd04/auto-git watch

# With global installation
auto-git watch
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

Auto-Git v2.0 features a completely redesigned help system with beautiful styling and clear organization:

```bash
auto-git --help
```

**Example Output:**
```
┌───────────────────────────────────────────────────┐
│  Auto-Git v3.3.0                                  │
│  AI-powered Git automation with arrow key         │
│  navigation                                       │
└───────────────────────────────────────────────────┘

USAGE:
  auto-git [command] [options]

╭─────────────────────────────────────────────────╮
│  AVAILABLE COMMANDS                             │
│                                                 │
│  watch         Watch files and auto-commit     │
│  commit (c)    Generate AI commit              │
│  reset <count> Undo commits (NEW in v3.3.0)    │
│  config        Show configuration              │
│  setup         Interactive setup guide         │
│  debug         Run system diagnostics          │
│  help          Display this help               │
╰─────────────────────────────────────────────────╯

INTERACTIVE FEATURES (v3.3.0):
  Ctrl+P        Pause and show navigation menu
  ↑↓ Arrows     Navigate menu options when paused
  Enter         Select menu option
  Ctrl+C        Graceful shutdown

EXAMPLES:
  auto-git setup                    # First-time setup
  auto-git watch                    # Start watching
  auto-git commit --verbose         # One-time commit
  auto-git reset 2 --soft           # Undo 2 commits

QUICK START:
  1. Get API key: https://aistudio.google.com/app/apikey
  2. Set API key: export GEMINI_API_KEY="your-key"
  3. Run setup:   auto-git setup
  4. Start using: auto-git watch
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

### Enhanced Error Handling & Navigation

Auto-Git v2.0 provides intelligent error handling with clear guidance:

#### Missing API Key Error
When you try to use Auto-Git without setting up the API key:

```bash
auto-git watch
```

**Enhanced Error Output:**
```
╔═══════════════════════════════════╗
║  ERROR                            ║
║  Gemini API Key Required          ║
║  API key not found or configured  ║
╚═══════════════════════════════════╝

╭─────────────────────────────────────────────────╮
│  WARNING                                        │
│  QUICK SETUP REQUIRED                           │
│  Auto-Git needs a Gemini API key to function    │
╰─────────────────────────────────────────────────╯

OPTION 1 - Use Setup Guide (Recommended):
  auto-git setup

OPTION 2 - Manual Setup:
  1. Get API key: https://aistudio.google.com/app/apikey
  2. Set environment variable:
     export GEMINI_API_KEY="your-api-key-here"
  3. Or create config file:
     echo '{"apiKey": "your-key"}' > ~/.auto-gitrc.json

OPTION 3 - Test Configuration:
  auto-git config                   # Check current setup
  auto-git debug                    # Run diagnostics

After setup, retry: auto-git watch
```

#### Invalid Command Usage
Clear examples and guidance for incorrect usage:

```bash
auto-git reset abc
```

**Enhanced Error Output:**
```
╔══════════════════════════════════════╗
║  ERROR                               ║
║  Invalid count                       ║
║  Please provide a positive number    ║
╚══════════════════════════════════════╝

EXAMPLES:
  auto-git reset 1                  # Reset last commit (mixed)
  auto-git reset 2 --soft           # Reset 2 commits (soft)
  auto-git reset 1 --hard           # Reset 1 commit (hard)
```

### Interactive Controls

#### Keyboard Shortcuts

| Key               | Action                                |
|-------------------|---------------------------------------|
| **Ctrl+P**        | Pause and show navigation menu        |
| **↑↓ Arrows**     | Navigate menu options when paused     |
| **Enter**         | Select highlighted menu option        |
| **Escape**        | Cancel menu and resume watching       |
| **"resume"**      | Resume watcher from REPL (FIXED in v3.5.0) |
| **"exit"**        | Exit REPL without resuming (NEW in v3.5.0) |
| **Ctrl+C**        | Stop and exit                         |

#### Navigation Menu

When you press **Ctrl+P**, Auto-Git shows an intuitive navigation menu:

```
⏸  Watcher Paused
Use arrow keys to navigate, Enter to select

❯ ▶  Resume watching
  Continue monitoring files for changes

  🔧 Interactive mode
  Enter REPL for manual Git operations

  🛑 Stop and exit
  Shutdown Auto-Git completely

Controls: ↑↓ Navigate • Enter Select • Esc Cancel • Ctrl+C Exit
```

#### Menu Options

- **Resume watching**: Continue monitoring files for changes
- **Interactive mode**: Enter REPL for manual Git operations and AI assistance
- **Stop and exit**: Shutdown Auto-Git completely

#### Interactive REPL Commands

When errors occur or when you select **Interactive mode** from the navigation menu, Auto-Git enters an interactive mode:

```bash
auto-git> help                    # Show available commands
auto-git> retry                   # Retry the last failed operation
auto-git> reset --hard HEAD~1     # Reset commits with git reset
auto-git> status                  # Show git status
auto-git> diff                    # Show current git diff
auto-git> commit                  # Manual commit with AI message
auto-git> git <command>           # Execute any git command with AI error handling
auto-git> log --oneline           # Direct git subcommands (auto-detected)
auto-git> branch -a               # List all branches
auto-git> stash                   # Stash current changes
auto-git> exit                    # Exit REPL and continue
```

#### Cross-Platform Hotkey Design

Auto-Git v2.0 uses **cross-platform compatible hotkeys** that work reliably on both macOS and Windows:

**Primary Hotkeys (Ctrl+Shift combinations):**
- `Ctrl+Shift+P` - Pause file watching
- `Ctrl+Shift+R` - Resume file watching  
- `Ctrl+Shift+1` - Enter interactive REPL mode

**Alternative Number Keys (for better terminal compatibility):**
- Press `1` - Pause file watching
- Press `2` - Resume file watching
- Press `3` - Enter interactive REPL mode

**Why these combinations?**
- **Ctrl+Shift** combinations avoid conflicts with common terminal shortcuts
- **Number keys** work in terminals that don't support complex key combinations
- **Cross-platform** compatibility ensures consistent behavior on macOS and Windows
- **No conflicts** with Cmd+Shift+I (which opens dev tools) or other system shortcuts

### Enhanced Git Command Support

The REPL now supports **any Git command** with intelligent error handling:

**Direct Git Commands:**
```bash
auto-git> git log --oneline -10   # Show recent commits
auto-git> git branch -a           # List all branches  
auto-git> git stash push -m "WIP" # Stash with message
auto-git> git pull origin main    # Pull latest changes
auto-git> git rebase main         # Rebase current branch
```

**Auto-Detected Git Subcommands:**
```bash
auto-git> log --oneline           # Automatically runs: git log --oneline
auto-git> branch -a               # Automatically runs: git branch -a
auto-git> stash                   # Automatically runs: git stash
auto-git> pull origin main        # Automatically runs: git pull origin main
```

**AI-Powered Error Recovery:**
When any Git command fails, Auto-Git will:

1. **Analyze the error** with AI
2. **Provide step-by-step solutions**
3. **Explain what commands do** (optional)
4. **Offer to run suggested fixes**

**Example Error Recovery:**
```bash
auto-git> push origin feature-branch
✗ Git command failed: push origin feature-branch
  Error: fatal: The current branch has no upstream branch

┌─────────────────────────────────────────────────────────────┐
│  🤖 AI Suggestion                                           │
│  Intelligent troubleshooting assistance                    │
└─────────────────────────────────────────────────────────────┘

To push the current branch and set the remote as upstream, use:
  git push --set-upstream origin feature-branch

This will:
1. Push your local commits to the remote repository
2. Set up tracking between your local and remote branch
3. Allow future pushes with just 'git push'

🎓 Would you like me to explain what these suggested commands do? (y/N)

┌─────────────────────────────────────────────────────────────┐
│  🎓 Command Explanations                                    │
│  Understanding the suggested Git commands                   │
└─────────────────────────────────────────────────────────────┘

git push --set-upstream origin feature-branch
  → Uploads local commits and sets up tracking between local and remote branch

💡 Pro tip: You can run these commands directly in this REPL!

auto-git> git push --set-upstream origin feature-branch
✓ Git command completed: push --set-upstream origin feature-branch
```

#### Enhanced Interactive Experience

The REPL now features **beautiful, styled output** for all interactions:

**Styled Command Interface:**
```bash
┌─────────────────────────────────────────────────────────────┐
│  Interactive Mode                                           │
│  Auto-Git REPL activated - Enhanced with AI assistance     │
└─────────────────────────────────────────────────────────────┘

╭─────────────────────────────────────────────────╮
│  AVAILABLE COMMANDS                             │
│                                                 │
│  retry         Retry the last failed operation │
│  status        Show git status with colored    │
│  git <cmd>     Execute any git command         │
│  help          Show detailed help message      │
│  exit          Exit REPL and continue          │
╰─────────────────────────────────────────────────╯

💡 Pro Tips:
  • Run any git command directly (e.g., log, branch, stash)
  • Failed commands get automatic AI analysis
  • Ask for command explanations anytime

auto-git>
```

**Styled Git Status Output:**
```bash
auto-git> status
✓ Git status retrieved

Repository Status:
  M  src/app.js                     Modified
  A  new-feature.js                 Added
  D  old-file.js                    Deleted
  ?? untracked.txt                  Untracked
```

**Styled Error Messages:**
```bash
auto-git> invalid-command
┌─────────────────────────────────────────────────────────────┐
│  Git Command Error                                          │
│  Command not found: invalid-command                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  💡 Basic Troubleshooting                                   │
│  Common diagnostic commands                                 │
└─────────────────────────────────────────────────────────────┘

╭─────────────────────────────────────────────────╮
│  DIAGNOSTIC COMMANDS                            │
│                                                 │
│  git status        Check repository state       │
│  git log --oneline Check recent commits         │
│  git remote -v     Check remote configuration   │
│  git branch -a     Check available branches     │
╰─────────────────────────────────────────────────╯
```

**Styled AI Commit Messages:**
```bash
auto-git> commit
✓ Changes detected
🤖 Generating AI commit message...
✓ AI commit message generated

┌─────────────────────────────────────────────────────────────┐
│  🤖 AI-Generated Commit Message                             │
│  Proposed commit for your changes                          │
└─────────────────────────────────────────────────────────────┘

feat(auth): add user authentication with JWT tokens

✅ Proceed with this commit message? (Y/n)
```

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

# Test interactive features
auto-git watch
# Press Ctrl+Shift+1 to test REPL

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

## FAQ

### General Questions

**Q: What is Auto-Git?**
A: Auto-Git is an AI-powered CLI tool that automatically generates meaningful commit messages using Google's Gemini AI and commits your changes. Version 2.0 adds interactive controls, error recovery, and AI-powered troubleshooting.

**Q: Do I need to install anything?**
A: No! You can use `npx @sbeeredd04/auto-git` without installation, or install globally with `