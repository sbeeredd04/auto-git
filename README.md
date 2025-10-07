# Auto-Git

[![npm version](https://badge.fury.io/js/@sbeeredd04%2Fauto-git.svg)](https://badge.fury.io/js/@sbeeredd04%2Fauto-git)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

> AI-powered Git automation with intelligent commit decisions and seamless VS Code integration

Auto-Git automatically analyzes your code changes and generates meaningful commit messages using AI. Available as both a CLI tool and VS Code extension (GitCue).

## Features

- **Intelligent Commits** - AI analyzes code significance and decides when to commit
- **Auto-Watch Mode** - Monitors file changes and commits automatically
- **Interactive Terminal** - AI-powered shell with error analysis and suggestions
- **Smart Diff Optimization** - Reduces API calls by 80% with change tracking
- **VS Code Integration** - Full-featured extension with enhanced sidebar and dashboard
- **Flexible Configuration** - Customize commit behavior, timing, and push settings

## Quick Start

### CLI Installation

```bash
npm install -g @sbeeredd04/auto-git
```

### VS Code Extension

Search for "GitCue" in VS Code extensions marketplace or install from:
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)

## Usage

### CLI Commands

```bash
# Watch for changes and auto-commit
auto-git watch

# Single commit with AI message
auto-git commit

# Interactive terminal session
auto-git interactive

# Configure settings
auto-git config
```

### VS Code Extension

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Search for "GitCue"
3. Available commands:
   - `GitCue: AI Commit` - Generate AI commit message
   - `GitCue: Toggle Auto-Watch` - Start/stop file watching
   - `GitCue: Open AI Terminal` - Launch AI-powered terminal
   - `GitCue: Dashboard` - Open GitCue control panel

## Configuration

### API Key Setup

Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

**CLI:** Set via environment variable or config file
```bash
export GEMINI_API_KEY="your-api-key"
```

**VS Code:** Set in settings
1. Open Settings (`Cmd/Ctrl+,`)
2. Search "GitCue API Key"
3. Enter your API key

### Commit Modes

- **Periodic** - Time-based commits (default)
- **Intelligent** - AI-driven commit decisions based on code significance

Configure via VS Code settings or `example-config.json`

## Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration Reference](./docs/configuration.md)
- [Intelligent Commits](./docs/features/intelligent-commits.md)
- [Interactive Terminal](./docs/features/interactive-terminal.md)
- [VS Code Extension](./docs/features/vscode-integration.md)
- [System Design](./docs/advanced/system-design.md)
- [Full Documentation](./docs/)

## Architecture

Auto-Git uses a modular architecture:
- **File Watcher** - Monitors code changes using chokidar
- **Git Integration** - Native Git operations wrapper
- **AI Engine** - Google Gemini for commit analysis
- **Rate Limiter** - API protection (15 calls/minute)
- **Interactive Terminal** - Enhanced shell with AI assistance

## Requirements

- Node.js >= 18.0.0
- Git installed and configured
- Google Gemini API key

## Contributing

See [Contributing Guide](./docs/advanced/contributing.md)

## License

MIT License - see [LICENSE](./LICENSE) for details

## Links

- [NPM Package](https://www.npmjs.com/package/@sbeeredd04/auto-git)
- [GitHub Repository](https://github.com/sbeeredd04/auto-git)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)
- [Issue Tracker](https://github.com/sbeeredd04/auto-git/issues)
- [Changelog](./docs/CHANGELOG.md)

---

Made with AI assistance for developers who value automation
