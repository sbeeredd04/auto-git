# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-24

### Added
- Initial release of Auto-Git CLI tool
- AI-powered commit message generation using Google Gemini API
- File watching mode with smart debouncing (30 seconds)
- One-time commit command for manual usage
- Cross-platform support (Windows, macOS, Linux)
- Multiple configuration methods:
  - Environment variables
  - User config file (`~/.auto-gitrc.json`)
  - Project `.env` file
- Interactive setup guide (`auto-git setup`)
- Configuration viewer (`auto-git config`)
- Conventional commit message format
- Automatic Git operations (add, commit, push)
- Smart upstream branch handling
- Security-focused design (no secrets in repos)
- Comprehensive documentation and examples

### Features
- **CLI Commands:**
  - `auto-git commit` - Generate AI commit message and commit/push
  - `auto-git watch` - Continuous file watching mode
  - `auto-git config` - Show current configuration
  - `auto-git setup` - Interactive setup guide

- **Configuration Options:**
  - `GEMINI_API_KEY` - Google Gemini API key
  - `AUTO_GIT_WATCH_PATHS` - Custom watch paths
  - `AUTO_GIT_DEBOUNCE_MS` - Debounce timing

- **Dependencies:**
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