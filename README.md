# Auto-Git 🤖

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![npm downloads](https://img.shields.io/npm/dm/@sbeeredd04/auto-git.svg)](https://www.npmjs.com/package/@sbeeredd04/auto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/issues)
[![GitHub Release](https://img.shields.io/github/release/sbeeredd04/auto-git.svg)](https://github.com/sbeeredd04/auto-git/releases)

> AI-powered automatic Git commits with Gemini-generated commit messages

Auto-Git is a cross-platform CLI tool that watches your files and automatically generates meaningful commit messages using Google's Gemini AI, then commits and pushes your changes.

## ✨ Features

- 🤖 **AI-Generated Commit Messages**: Uses Google Gemini to create conventional, meaningful commit messages
- 👀 **File Watching**: Automatically detect changes and commit them
- 🚀 **One-Shot Commits**: Manual commit generation for current changes
- 🔧 **Cross-Platform**: Works on Windows, macOS, and Linux
- ⚙️ **Configurable**: Environment variables and user config support
- 🎯 **Smart Debouncing**: Prevents spam commits during rapid file changes
- 📦 **Zero Config**: Works out of the box with just an API key

## 🚀 Quick Start

### 1. Install Auto-Git

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

### 3. Use Auto-Git

**One-time commit:**
```bash
auto-git commit
```

**Watch mode (continuous):**
```bash
auto-git watch
```

## 📖 Usage

### Commands

#### `auto-git commit` (or `auto-git c`)
Generates an AI commit message for current changes and commits/pushes them.

```bash
auto-git commit                 # Commit and push current changes
auto-git commit --no-push       # Commit but don't push
auto-git commit --dry-run       # Preview what would be committed (coming soon)
```

#### `auto-git watch`
Starts file watching mode - automatically commits changes when files are modified **recursively throughout the entire repository**.

```bash
auto-git watch                    # Watch ALL files recursively (default)
auto-git watch --paths src lib    # Watch specific directories only
auto-git watch --no-push          # Watch and commit but don't push
```

#### `auto-git config`
Shows current configuration and setup status.

```bash
auto-git config
```

#### `auto-git setup`
Interactive setup guide.

```bash
auto-git setup
```

### Configuration

Auto-Git supports multiple configuration methods (in order of priority):

1. **Environment Variables**
   ```bash
   export GEMINI_API_KEY="your-key"
   export AUTO_GIT_WATCH_PATHS="**/*,src/**,lib/**"  # Glob patterns
   export AUTO_GIT_DEBOUNCE_MS="30000"
   ```

2. **User Config File** (`~/.auto-gitrc.json`)
   ```json
   {
     "apiKey": "your-gemini-api-key",
     "watchPaths": ["**/*"],
     "debounceMs": 30000,
     "watchOptions": {
       "ignored": ["node_modules/**", "*.log"],
       "depth": null
     }
   }
   ```

3. **`.env` File** (in your project)
   ```bash
   GEMINI_API_KEY=your-key
   ```

### 🔍 **Recursive File Watching**

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
- ✅ **Optional pushing**: Can commit locally without pushing

## 🎛️ Advanced Usage

### Recursive Watch Patterns
```bash
# Default: Watch all files recursively
auto-git watch

# Watch specific file types across all directories
export AUTO_GIT_WATCH_PATHS="**/*.js,**/*.ts,**/*.md,**/*.json"
auto-git watch

# Watch specific directories and their subdirectories
auto-git watch --paths src tests docs

# Watch with custom ignore patterns
```

### Advanced Configuration
Create `~/.auto-gitrc.json` for sophisticated setups:

```json
{
  "apiKey": "your-gemini-api-key",
  "watchPaths": ["**/*"],
  "debounceMs": 30000,
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
# Development - watch source files only
export GEMINI_API_KEY="dev-key"
export AUTO_GIT_WATCH_PATHS="src/**,tests/**,docs/**"
auto-git watch

# Production - commit manually with all files
export GEMINI_API_KEY="prod-key" 
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

## 🛠️ Development

### Project Structure
```
auto-git/
├── bin/auto-git.js      # CLI entrypoint
├── lib/
│   ├── config.js        # Configuration management
│   ├── gemini.js        # Gemini API integration
│   ├── git.js           # Git operations
│   └── watcher.js       # File watching logic
├── package.json
└── README.md
```

### Testing Locally
```bash
# Install dependencies
npm install

# Link for local testing
npm link

# Test commands
auto-git config
auto-git commit
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

### Debug Mode
```bash
DEBUG=auto-git* auto-git watch
```

## 🎉 Examples

### Basic Workflow
```bash
# 1. Set up API key
export GEMINI_API_KEY="your-key"

# 2. Start coding...
echo "console.log('Hello World');" > app.js

# 3. Auto commit
auto-git commit
# → Generated: "feat(app): add hello world console output"

# 4. Or start watching
auto-git watch
# → Automatically commits future changes
```

### Team Usage
Each team member sets their own API key, no shared secrets needed:

```bash
# Alice
export GEMINI_API_KEY="alice-key"
auto-git watch

# Bob  
export GEMINI_API_KEY="bob-key"
auto-git commit
```

---

**Happy coding! 🚀**