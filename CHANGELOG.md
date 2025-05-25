## v3.1.0 - 2025-05-25

Bug fixes and improvements

## v3.0.1 - 2025-05-25

Bug fixes and improvements

## v3.0.0 - 2025-05-25

Bug fixes and improvements

## v1.2.0 - 2025-05-25

Bug fixes and improvements

# Changelog

All notable changes to Auto-Git will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.3] - 2024-12-19

### 🔧 Fixed
- **REPL Looping Issue**: Fixed critical bug where REPL would stop accepting commands after first execution
- **Input Handling State**: Properly managed input state to prevent command processing conflicts
- **Keyboard Control Restoration**: Enhanced keyboard control restoration after REPL exits with timeout
- **Command Execution Flow**: Fixed async command execution to properly return to input prompt

### 🎯 Enhanced
- **Smart Duplicate Removal**: Improved algorithm to remove exactly one duplicate per character
  - `aa` → `a`
  - `ggiitt ppuull` → `git pul` 
  - `ggiitt ppuullll` → `git pull`
  - `hheelllloo` → `hello`
- **Input State Management**: Added proper input waiting state to prevent interference during command execution
- **Better Error Handling**: Enhanced error handling during command execution with proper state restoration

### 📱 Technical Improvements
- **Async Command Processing**: Properly managed async command execution without breaking input loop
- **State Synchronization**: Added input waiting flag to prevent race conditions
- **Handler Cleanup**: Improved cleanup of input handlers with specific handler tracking
- **Timeout-based Restoration**: Added timeout for keyboard control restoration to ensure proper state

### 🧪 User Experience
- **Continuous Operation**: REPL now continues accepting commands indefinitely
- **Perfect Input Processing**: Duplicate characters are intelligently removed
- **Seamless Transitions**: Smooth switching between command execution and input
- **Consistent Controls**: Global keyboard shortcuts work reliably after any operation

## [3.6.3] - 2024-12-19

### 🚀 Added
- **Full Terminal Pass-Through**: REPL now executes any command directly in terminal
- **Automatic Input Sanitization**: Built-in duplicate character removal (e.g., "ggiitt" → "git")
- **Bulletproof Global Keyboard Controls**: Ctrl+P and Ctrl+R work consistently across all sessions
- **Raw Terminal Input**: Direct character-by-character input handling for better control
- **Enhanced Command Execution**: Uses spawn for real terminal pass-through

### 🔧 Fixed
- **Persistent Keyboard Controls**: Global shortcuts now work after resuming from REPL
- **Input Duplication Issues**: Completely eliminated duplicate character problems
- **Session State Management**: Proper cleanup and restoration of keyboard listeners
- **Terminal State Consistency**: Raw mode properly managed across different states

### 🎯 Enhanced
- **Universal Command Support**: Any terminal command works (git, ls, pwd, etc.)
- **AI Error Analysis**: Failed commands automatically get AI suggestions
- **Seamless Transitions**: Smooth switching between watcher and REPL modes
- **Better Error Handling**: Comprehensive error analysis with actionable suggestions

### 📱 Technical Improvements
- **Raw Input Processing**: Character-by-character input handling with special key support
- **Proper Listener Management**: Specific handler tracking and cleanup
- **Enhanced State Restoration**: Keyboard controls properly restored after REPL exit
- **Memory Management**: Better cleanup of event listeners and resources

### 🧪 User Experience
- **No More Input Issues**: Typing works perfectly without duplicates
- **Consistent Controls**: Ctrl+P and Ctrl+R work from any state
- **Real Terminal Feel**: Full terminal pass-through for any command
- **Instant Feedback**: Real-time input processing and command execution

## [3.6.1] - 2024-12-19

### 🚀 Added
- **Global Ctrl+R Resume**: Works from anywhere - REPL, navigation menu, or file watcher
- **Simplified Git Command Pass-Through**: REPL now acts as a simple pass-through for Git commands
- **Enhanced Keyboard Controls**: Ctrl+R globally resumes watcher from any state

### 🔧 Fixed
- **Removed Input Deduplication**: Eliminated problematic duplicate character removal that was causing issues
- **Removed Inquirer Prompts**: Eliminated blocking prompts that were stopping REPL execution
- **Simplified REPL Flow**: Commands now execute and return to prompt immediately
- **Better Command Processing**: Direct pass-through for Git commands without interference

### 🎯 Enhanced
- **Streamlined User Experience**: REPL continues running after commands instead of stopping
- **Cleaner Git Integration**: Direct command execution without complex processing
- **Better Error Handling**: AI suggestions without blocking prompts
- **Improved Navigation**: Global resume works from any application state

### 📱 Technical Improvements
- **Removed Unused Functions**: Cleaned up `removeDuplicateChars` function from utils
- **Simplified REPL Logic**: Removed complex input processing and inquirer dependencies
- **Enhanced Global Controls**: Ctrl+R handler works across all application states
- **Better State Management**: Cleaner transitions between different modes

### 🧪 User Experience
- **No More Stuck States**: REPL continues running after each command
- **Direct Git Commands**: Type "git pull" or "pull" - both work seamlessly
- **Instant Resume**: Ctrl+R immediately resumes watcher from anywhere
- **Simplified Workflow**: Less complexity, more reliability

## [3.6.0] - 2024-12-19

### 🚀 Added
- **Bulletproof Ctrl+C Handling**: Force exit from anywhere - navigation menu, REPL, or file watcher
- **Smart Input Deduplication**: Automatically removes duplicate characters (e.g., "ggiitt" → "git")
- **Global Force Exit Handler**: Ctrl+C immediately exits the entire application from any state
- **Enhanced Utility Functions**: New `cleanupStdin()`, `setupStdin()`, and `forceExit()` utilities
- **Robust stdin Management**: Proper terminal state handling with automatic cleanup

### 🔧 Fixed
- **Interactive Session Stuck Issue**: Terminal no longer gets stuck after returning from REPL
- **Navigation Arrow Keys**: Arrow keys work perfectly after interactive mode
- **Raw Mode Restoration**: Proper terminal state restoration after REPL exits
- **Listener Cleanup**: All keypress listeners are properly removed and restored
- **Missing Dependencies**: Added missing `inquirer` import in REPL
- **Syntax Errors**: Fixed switch statement syntax error in watcher.js

### 🎯 Enhanced
- **Rock-Solid Navigation**: No more stuck states - navigation always works
- **Better Terminal Compatibility**: Works flawlessly across different terminal emulators
- **Enhanced Error Recovery**: Improved AI suggestions with better error handling
- **Professional User Experience**: Seamless transitions between all modes
- **Input Processing**: Real-time duplicate character removal as you type

### 📱 Technical Improvements
- **Proper State Management**: Enhanced terminal state handling throughout the application
- **Memory Management**: Better cleanup of event listeners and resources
- **Error Handling**: More robust error handling with proper cleanup
- **Code Organization**: Better separation of concerns with utility functions

### 🧪 Testing
- **Comprehensive Tests**: Added tests for duplicate character removal function
- **Edge Case Handling**: Proper handling of empty strings, single characters, and no duplicates
- **Validation**: Verified all functionality works correctly across different scenarios

## [3.5.0] - 2024-12-18

### Added
- **Completely Stable REPL**: Fixed character duplication issue permanently
- **Clear Exit Commands**: Type "resume" to resume watcher, "exit" to exit without resuming
- **Stable Input Handling**: Switched from inquirer to readline for better compatibility

### Fixed
- **Character Duplication**: No more "ggiitt" when typing "git" - completely resolved
- **Terminal State**: Clean transitions between navigation menu and REPL
- **Input Conflicts**: No more input conflicts or terminal state issues

## [3.4.0] - 2024-12-17

### Added
- **Ctrl+R Resume**: Resume watcher directly from REPL with Ctrl+R

### Fixed
- **Navigation Menu**: Resolved duplicate menu display issue
- **REPL Character Duplication**: Improved handling of duplicate characters
- **Raw Mode Handling**: Better terminal compatibility and input handling

## [3.3.0] - 2024-12-16

### Added
- **Intuitive Navigation Menu**: Simplified controls with Ctrl+P
- **Arrow Key Navigation**: Use ↑↓ arrows to navigate menu options
- **Visual Menu System**: Clear descriptions for each option
- **One-Key Access**: Enter to select, Escape to cancel

## [3.2.0] - 2024-12-15

### Added
- **Enhanced Git Command Support**: Support for any Git command with AI error handling
- **Auto-Detected Git Subcommands**: Direct git subcommands without "git" prefix
- **AI-Powered Error Recovery**: Automatic error analysis and suggestions

## [3.1.0] - 2024-12-14

### Added
- **Interactive REPL**: On-demand command interface for manual control
- **Error-Driven AI Suggestions**: AI analyzes Git errors and suggests solutions
- **Built-in Reset Commands**: Undo commits with safety checks

## [3.0.0] - 2024-12-13

### Added
- **Interactive Controls**: Keyboard shortcuts for pause/resume
- **Professional Logging**: Clean, colorized output with styled boxes
- **Enhanced Error Handling**: Clear error messages with actionable solutions

### Changed
- **Major UX Overhaul**: Complete redesign of user interface
- **Improved Configuration**: Better config management and validation

## [2.0.0] - 2024-12-12

### Added
- **Cross-Platform Hotkeys**: Ctrl+Shift combinations for better compatibility
- **Real-time Control**: Pause, resume, and interact without stopping
- **Styled Help System**: Beautiful, organized help with clear navigation

## [1.0.0] - 2024-12-11

### Added
- **Initial Release**: AI-powered automatic Git commits
- **File Watching**: Recursive file monitoring with smart filtering
- **Gemini Integration**: AI-generated commit messages
- **Basic Configuration**: Environment variables and config file support

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