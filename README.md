# Auto-Git 🤖 v2.0

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![npm downloads](https://img.shields.io/npm/dm/@sbeeredd04/auto-git.svg)](https://www.npmjs.com/package/@sbeeredd04/auto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/issues)
[![GitHub Release](https://img.shields.io/github/release/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/releases)

> AI-powered automatic Git commits with Gemini-generated commit messages - now with interactive controls and error-driven AI suggestions

Auto-Git is a cross-platform CLI tool that watches your files and automatically generates meaningful commit messages using Google's Gemini AI, then commits and pushes your changes. **Version 2.0** introduces interactive controls, error recovery, and AI-powered troubleshooting.

## ✨ Features

### Core Features
- **AI-Generated Commit Messages**: Uses Google Gemini to create conventional, meaningful commit messages
- **File Watching**: Automatically detect changes and commit them recursively
- **One-Shot Commits**: Manual commit generation for current changes
- **Professional Logging**: Clean, colorized output with styled boxes and minimal visual clutter
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Configurable**: Environment variables and user config support
- **Smart Debouncing**: Prevents spam commits during rapid file changes
- **Zero Config**: Works out of the box with just an API key

### 🆕 New in v2.0: Interactive Controls & Error Recovery
- **⌨️ Keyboard Shortcuts**: Pause/resume watching with hotkeys
- **🔧 Interactive REPL**: On-demand command interface for manual control
- **🤖 Error-Driven AI Suggestions**: AI analyzes Git errors and suggests solutions
- **🔄 Built-in Reset Commands**: Undo commits with safety checks
- **⚡ Smart Error Recovery**: Automatic retry with user guidance
- **🎛️ Real-time Control**: Pause, resume, and interact without stopping the watcher

## 🚀 Quick Start

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

## 📖 Usage

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

#### 🆕 `auto-git reset`
Undo last commits with built-in safety checks.

```bash
# Reset last commit (mixed mode - keeps changes unstaged)
auto-git reset 1

# Reset last 2 commits with soft reset (keeps changes staged)
auto-git reset 2 --soft

# Hard reset (WARNING: destroys changes)
auto-git reset 1 --hard
```

#### `auto-git config`
Shows current configuration and setup status with styled output, including new interactive features.

```bash
# With npx
npx @sbeeredd04/auto-git config

# With global installation
auto-git config
```

#### `auto-git setup`
Interactive setup guide with step-by-step instructions.

```bash
# With npx
npx @sbeeredd04/auto-git setup

# With global installation
auto-git setup
```

#### `auto-git debug`
Run system diagnostics to troubleshoot issues.

```bash
# With npx
npx @sbeeredd04/auto-git debug

# With global installation
auto-git debug
```

### 🆕 Interactive Controls & Keyboard Shortcuts

#### Watcher Keyboard Shortcuts

| Key               | Action                                |
|-------------------|---------------------------------------|
| **Ctrl+P**        | Pause file watching                   |
| **Ctrl+R**        | Resume file watching                  |
| **Ctrl+I**        | Enter interactive REPL (on-demand)   |
| **Ctrl+C**        | Stop and exit                         |

#### Interactive REPL Commands

When errors occur or when you press **Ctrl+I**, Auto-Git enters an interactive mode:

```bash
auto-git> help                    # Show available commands
auto-git> retry                   # Retry the last failed operation
auto-git> reset --hard HEAD~1     # Reset commits with git reset
auto-git> status                  # Show git status
auto-git> diff                    # Show current git diff
auto-git> commit                  # Manual commit with AI message
auto-git> exit                    # Exit REPL and continue
```

### 🤖 Error-Driven AI Suggestions

When a Git error occurs, Auto-Git will:

1. **Sanitize and analyze** the error message
2. **Send to Gemini AI** for intelligent troubleshooting
3. **Display actionable suggestions** with step-by-step solutions
4. **Drop into interactive REPL** for immediate resolution

**Example Error Recovery Flow:**

```text
[file saved] 
  ↓
auto-git detects change → attempt commit
  ↓
[ERROR: merge conflict detected]
  ↓
🤖 AI Suggestion: "Resolve conflicts manually, then run: git add . && git commit"
  ↓
auto-git> status                  # Check current state
auto-git> reset --mixed HEAD~1    # Undo problematic commit
auto-git> retry                   # Try the operation again
  ↓
✅ commit & push succeed
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
       "pause": "ctrl+p",
       "resume": "ctrl+r",
       "enterRepl": "ctrl+i"
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

### **Recursive File Watching**

By default, Auto-Git now watches **ALL files recursively** in your repository:

- ✅ **Monitors all directories and subdirectories**
- ✅ **Watches all file types** (code, docs, configs, etc.)
- ✅ **Intelligent filtering** - ignores `.git`, `node_modules`, logs, temp files
- ✅ **Customizable patterns** - use glob patterns for specific needs
- ✅ **Performance optimized** - efficient recursive watching

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

## 🎨 Professional Logging

Auto-Git now features a professional logging system with:

- **Styled Boxes**: Important information displayed in colorful boxes
- **Minimal Emojis**: Clean, professional output without clutter
- **Color Coding**: Different colors for success, error, warning, and info messages
- **Spinners**: Loading indicators for long operations
- **Structured Output**: Clear sections and organized information display
- **Verbose Mode**: Detailed debugging information when needed

**Example Output:**
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
```

## 🔧 Installation Options

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

## 🎯 How It Works

1. **Recursive File Detection**: Monitors file changes using `chokidar` with deep recursive watching of all repository files
2. **Smart Filtering**: Automatically ignores common non-source files (node_modules, .git, logs, temp files)
3. **Change Analysis**: Runs `git diff` to understand what changed across all monitored files
4. **AI Processing**: Sends comprehensive change analysis to Gemini AI for intelligent commit message generation
5. **Git Operations**: Automatically runs `git add .`, `git commit`, and `git push`
6. **🆕 Error Recovery**: On failure, analyzes errors with AI and provides interactive recovery options

### Generated Commit Messages

Auto-Git generates conventional commit messages following best practices:

- ✅ `feat(auth): add user login validation`
- ✅ `fix(api): resolve null pointer exception` 
- ✅ `docs(readme): update installation steps`
- ✅ `refactor(utils): simplify date formatting`

## 🛡️ Security & Privacy

- ✅ **No secrets in repos**: API keys are never committed to your repository
- ✅ **User-specific config**: Each user manages their own API key
- ✅ **Local processing**: Only diffs are sent to Gemini API
- ✅ **🆕 Error sanitization**: Sensitive information is stripped from error messages before AI analysis
- ✅ **Optional pushing**: Can commit locally without pushing

## 🎛️ Advanced Usage

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
    "pause": "ctrl+p",
    "resume": "ctrl+r", 
    "enterRepl": "ctrl+i"
  }
}
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
    "pause": "ctrl+p",
    "resume": "ctrl+r",
    "enterRepl": "ctrl+i"
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

## 🚨 Important Notes

- Ensure you're in a Git repository before running
- Configure your Git user name and email: `git config --global user.name "Your Name"`
- Test in a non-critical repository first
- Review generated commits periodically to ensure quality
- Use `--verbose` flag for detailed operation logs
- **🆕 Interactive mode**: Use keyboard shortcuts for real-time control
- **🆕 Error recovery**: Let AI help you resolve Git issues automatically

## 🛠️ Development

### Project Structure
```
auto-git/
├── bin/auto-git.js      # CLI entrypoint
├── lib/
│   ├── config.js        # Configuration management
│   ├── gemini.js        # Gemini API integration
│   ├── git.js           # Git operations
│   ├── watcher.js       # File watching logic
│   ├── repl.js          # 🆕 Interactive REPL
│   └── errorHandler.js  # 🆕 Error recovery system
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
# Press Ctrl+I to enter REPL
# Press Ctrl+P to pause, Ctrl+R to resume
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**"Not a git repository"**
- Ensure you're running the command inside a Git repository
- Run `git init` if needed

**"GEMINI_API_KEY not found"**
- Set your API key: `export GEMINI_API_KEY="your-key"`
- Or create `~/.auto-gitrc.json` with your key

**"Failed to push"**
- Ensure you have a remote configured: `git remote -v`
- Set up upstream: `git push --set-upstream origin main`

**Too many commits**
- Increase debounce time in config
- Use `--no-push` to commit locally only

**🆕 Interactive features not working**
- Ensure your terminal supports raw mode
- Check hotkey configuration in `~/.auto-gitrc.json`
- Try running with `--verbose` for debugging

### Debug Information
```bash
# Get detailed system information
auto-git debug

# Enable verbose logging
auto-git watch --verbose
auto-git commit --verbose

# Test interactive features
auto-git watch
# Press Ctrl+I to test REPL
```

### 🆕 Error Recovery
When Git errors occur:
1. Auto-Git will automatically analyze the error
2. AI suggestions will be displayed
3. Interactive REPL will open for manual resolution
4. Use `retry` command to attempt the operation again

## 🎉 Examples

### Basic Workflow
```bash
# 1. Set up API key
export GEMINI_API_KEY="your-key"

# 2. Start coding...
echo "console.log('Hello World');" > app.js

# 3. Auto commit with professional output
auto-git commit
# → Shows: [SUCCESS] Committed and Pushed
#          feat(app): add hello world console output

# 4. Or start watching with interactive controls
auto-git watch
# → Shows configuration in styled boxes
# → Use Ctrl+P/R to pause/resume
# → Use Ctrl+I for interactive mode
# → Automatically commits future changes
```

### 🆕 Interactive Error Recovery
```bash
# Start watching
auto-git watch

# Make changes that cause a merge conflict
# Auto-Git detects the error and shows:

┌─────────────────────────────────┐
│  ERROR DETECTED                 │
│                                 │
│  merge conflict in src/app.js   │
└─────────────────────────────────┘

🤖 AI Suggestion: "Resolve conflicts manually in src/app.js, then run: git add . && git commit"

auto-git> status                  # Check what files have conflicts
auto-git> reset --mixed HEAD~1    # Undo the problematic commit
auto-git> retry                   # Try the operation again
```

### Team Usage
Each team member sets their own API key, no shared secrets needed:

```bash
# Alice
export GEMINI_API_KEY="alice-key"
export AUTO_GIT_INTERACTIVE_ON_ERROR="true"
auto-git watch --verbose

# Bob  
export GEMINI_API_KEY="bob-key"
export AUTO_GIT_ENABLE_SUGGESTIONS="true"
auto-git commit --verbose
```

---

**Happy coding with Auto-Git v2.0! 🚀**