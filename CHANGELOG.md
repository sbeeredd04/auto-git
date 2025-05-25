## v3.1.0 - 2025-05-25

Bug fixes and improvements

## v3.0.1 - 2025-05-25

Bug fixes and improvements

## v3.0.0 - 2025-05-25

Bug fixes and improvements

## v1.2.0 - 2025-05-25

Bug fixes and improvements

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-12-19

### 🎉 Major Release: Interactive Controls & Error Recovery

This is a major release that introduces interactive controls, error-driven AI suggestions, and comprehensive error recovery features.

### ✨ Added

#### Interactive Controls
- **Keyboard Shortcuts**: Added hotkeys for real-time control during watch mode
  - `Ctrl+P` - Pause file watching
  - `Ctrl+R` - Resume file watching  
  - `Ctrl+I` - Enter interactive REPL mode
  - `Ctrl+C` - Graceful shutdown
- **Interactive REPL**: New command-line interface for manual control and error recovery
  - `retry` - Retry failed operations
  - `reset` - Git reset with various modes
  - `status` - Show git status
  - `diff` - Show current diff
  - `commit` - Manual commit with AI message
  - `help` - Show available commands
  - `exit` - Exit REPL and continue

#### Error Recovery & AI Suggestions
- **Error-Driven AI Suggestions**: Automatic analysis of Git errors with AI-generated solutions
- **Smart Error Recovery**: Intelligent retry mechanisms with user guidance
- **Error Sanitization**: Removes sensitive information before sending errors to AI
- **Built-in Reset Command**: New `auto-git reset` command with safety checks
  - Supports `--hard`, `--soft`, and `--mixed` modes
  - Interactive confirmation for destructive operations
  - Validates input and provides clear feedback

#### Enhanced Configuration
- **Interactive Configuration**: New config options for interactive features
  - `interactiveOnError` - Enable/disable interactive error recovery
  - `enableSuggestions` - Enable/disable AI error suggestions
  - `hotkeys` - Customizable keyboard shortcuts
- **Environment Variables**: New environment variables for configuration
  - `AUTO_GIT_INTERACTIVE_ON_ERROR`
  - `AUTO_GIT_ENABLE_SUGGESTIONS`

### 🔧 Enhanced

#### File Watching
- **Pause/Resume Functionality**: Real-time control without stopping the watcher
- **REPL Integration**: Seamless transition between watching and interactive mode
- **Enhanced Error Handling**: All Git operations now wrapped with intelligent error recovery

#### CLI Interface
- **Updated Commands**: All commands now support the new interactive features
- **Enhanced Config Display**: Shows interactive features status and configuration
- **Improved Debug Output**: More comprehensive system diagnostics
- **Better Help Text**: Updated documentation for all new features

#### Logging & UX
- **Interactive Status Display**: Shows current state of interactive features
- **Enhanced Error Messages**: More informative error reporting with AI suggestions
- **Professional Output**: Improved styling for interactive elements

### 🛠️ Technical Improvements

#### New Modules
- **`lib/repl.js`**: Complete interactive REPL implementation
- **`lib/errorHandler.js`**: Intelligent error handling and recovery system
- **Enhanced `lib/gemini.js`**: Added error suggestion generation
- **Enhanced `lib/config.js`**: Extended configuration management

#### Dependencies
- **Added `inquirer`**: For interactive prompts and REPL
- **Added `keypress`**: For keyboard shortcut handling
- **Enhanced error handling**: Comprehensive Git operation wrapping

#### Architecture
- **Modular Design**: Clean separation of concerns for interactive features
- **Event-Driven**: Keyboard events and error handling integration
- **Extensible**: Easy to add new REPL commands and error patterns

### 📚 Documentation
- **Comprehensive README Update**: Detailed documentation for all new features
- **Interactive Examples**: Real-world usage scenarios and error recovery flows
- **Configuration Guide**: Complete guide for customizing interactive features
- **Troubleshooting**: Enhanced troubleshooting section with interactive features

### 🔄 Migration Guide

#### From v1.x to v2.0
- **Backward Compatible**: All existing functionality works unchanged
- **Optional Features**: Interactive features are enabled by default but can be disabled
- **Configuration**: Existing config files work without modification
- **New Defaults**: Interactive error recovery and AI suggestions enabled by default

#### Recommended Actions
1. Update to v2.0: `npm install -g @sbeeredd04/auto-git@latest`
2. Test interactive features: `auto-git watch` and try `Ctrl+I`
3. Configure hotkeys if desired in `~/.auto-gitrc.json`
4. Review new error recovery capabilities

### 🐛 Bug Fixes
- **Improved Error Handling**: More robust error catching and reporting
- **Keyboard Input**: Better handling of terminal raw mode
- **Process Management**: Cleaner shutdown and signal handling

### ⚡ Performance
- **Optimized Watching**: Better performance with interactive controls
- **Efficient Error Recovery**: Minimal overhead for error analysis
- **Smart Debouncing**: Improved file change detection with pause/resume

## [1.2.0] - 2024-12-15

### Added
- Enhanced recursive file watching with comprehensive glob pattern support
- Professional logging system with styled boxes and color coding
- Improved configuration management with user config file support
- Better error messages and user guidance
- Comprehensive ignore patterns for common non-source files

### Enhanced
- File watching now covers all directories recursively by default
- Improved commit message generation with better AI prompts
- Enhanced CLI with better help text and examples
- More robust error handling and user feedback

### Fixed
- File watching reliability improvements
- Better handling of edge cases in diff generation
- Improved cross-platform compatibility

## [1.1.0] - 2024-12-10

### Added
- Recursive file watching capability
- Enhanced logging with spinners and status indicators
- Better configuration validation
- Improved error messages

### Enhanced
- More reliable file change detection
- Better Git repository validation
- Enhanced commit message quality

## [1.0.0] - 2024-12-05

### Added
- Initial release of Auto-Git
- AI-powered commit message generation using Google Gemini
- File watching with automatic commits
- One-shot commit functionality
- Cross-platform support
- Environment variable configuration
- Professional logging system

### Features
- Watch mode for continuous monitoring
- Manual commit mode for one-time operations
- Configurable debouncing
- Smart file filtering
- Git repository validation
- Remote push support

### Configuration
- Environment variable support (`GEMINI_API_KEY`, `AUTO_GIT_WATCH_PATHS`, `AUTO_GIT_DEBOUNCE_MS`)
- User config file (`~/.auto-gitrc.json`)
- Project-level `.env` file support
- Intelligent ignore patterns for common files

### Dependencies
- commander: CLI framework
- chokidar: Cross-platform file watching
- dotenv: Environment variable loading
- execa: Process execution
- node-fetch: HTTP client for Gemini API

### Requirements
- Node.js >= 18.0.0
- Git installed and configured
- Google Gemini API key
- Active Git repository with optional remote

---

## How to Update This Changelog

When creating new releases:

1. Add a new version section at the top
2. Use semantic versioning (MAJOR.MINOR.PATCH)
3. Categorize changes as:
   - **Added** for new features
   - **Changed** for changes in existing functionality
   - **Deprecated** for soon-to-be removed features
   - **Removed** for now removed features
   - **Fixed** for any bug fixes
   - **Security** for vulnerability fixes 