# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-XX

### Added
- **Professional Logging System**: Complete overhaul of console output with styled boxes and minimal emojis
- **Centralized Logger**: New `utils/logger.js` with comprehensive logging utilities
- **Colorized Output**: Using `chalk` for beautiful color-coded console messages
- **Styled Boxes**: Using `boxen` for professional bordered information displays
- **Loading Spinners**: Using `ora` for progress indicators during long operations
- **Verbose Mode**: Added `--verbose` flag to all commands for detailed debugging
- **Debug Command**: New `auto-git debug` command for system diagnostics
- **Enhanced CLI**: Improved command descriptions and help text

### Changed
- **Reduced Visual Clutter**: Replaced excessive emojis with clean, professional symbols
- **Improved Error Messages**: Better structured error reporting with helpful guidance
- **Configuration Display**: Enhanced config command with styled tables and boxes
- **Setup Guide**: Professional boxed output for setup instructions
- **Watch Output**: Cleaner file change notifications and status updates

### Technical
- Added dependencies: `chalk@^5.3.0`, `boxen@^7.1.1`, `ora@^8.0.1`, `cli-spinners@^2.9.2`
- Centralized logging utilities in `utils/` directory
- Enhanced error handling and user feedback
- Improved code organization and maintainability

### Migration
- No breaking changes - all existing functionality preserved
- New verbose mode available with `--verbose` flag
- Enhanced visual output with same command syntax

## [1.0.0] - 2024-01-15

### Added
- Initial release of Auto-Git CLI tool
- AI-powered commit message generation using Google Gemini 2.0 Flash
- Recursive file watching with `chokidar`
- Cross-platform support (Windows, macOS, Linux)
- Multiple configuration methods (env vars, config file, .env)
- Smart debouncing to prevent spam commits
- Conventional commit message format
- Automatic git operations (add, commit, push)
- Intelligent upstream handling for new branches

### Features
- `auto-git commit` - One-time AI commit generation
- `auto-git watch` - Continuous file monitoring
- `auto-git config` - Configuration display
- `auto-git setup` - Interactive setup guide
- Support for custom watch paths and patterns
- Configurable debounce timing
- Optional push functionality (`--no-push`)

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