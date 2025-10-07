# GitCue - AI-Powered Git Assistant for VS Code

AI-powered Git automation with intelligent commits, interactive terminal, and seamless VS Code integration.

## Features

### Core Capabilities
- **AI Commit Messages** - Automatically generated commit messages using Google Gemini
- **Auto-Watch Mode** - Monitor file changes and commit intelligently
- **Interactive Terminal** - AI-enhanced shell with error analysis
- **Smart Dashboard** - Real-time status, activity tracking, and controls
- **Intelligent Commits** - AI-driven decisions based on code significance

### Enhanced UI
- Interactive sidebar with one-click actions
- Real-time activity feed with detailed commit logs
- Smart status cards showing file changes and repository info
- Professional interface with modern design

## Quick Start

1. **Install Extension**
   - Search "GitCue" in VS Code extensions
   - Or install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)

2. **Configure API Key**
   - Get key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Open Settings (`Cmd/Ctrl+,`)
   - Search "GitCue API Key" and enter your key

3. **Start Using**
   - `Cmd/Ctrl+Shift+P` → "GitCue: AI Commit"
   - `Cmd/Ctrl+Alt+T` → "GitCue: Open AI Terminal"
   - `Cmd/Ctrl+Alt+W` → "GitCue: Toggle Auto-Watch"

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| **GitCue: AI Commit** | `Ctrl+Alt+C` / `Cmd+Alt+C` | Generate AI commit message |
| **GitCue: Open AI Terminal** | `Ctrl+Alt+T` / `Cmd+Alt+T` | Launch interactive terminal |
| **GitCue: Toggle Auto-Watch** | `Ctrl+Alt+W` / `Cmd+Alt+W` | Start/stop file watching |
| **GitCue: Dashboard** | `Ctrl+Shift+P` → "GitCue: Dashboard" | Open control panel |
| **GitCue: Cancel Commit** | `Ctrl+Alt+X` / `Cmd+Alt+X` | Cancel pending commit |

## Configuration

### Commit Modes
- **Periodic** - Time-based commits (default)
- **Intelligent** - AI-driven decisions based on significance

### Key Settings
- `gitcue.geminiApiKey` - Your Gemini API key
- `gitcue.commitMode` - Commit mode (periodic/intelligent)
- `gitcue.autoPush` - Auto-push to remote (true/false)
- `gitcue.bufferTimeSeconds` - Commit buffer time (default: 30s)

Access settings: `Preferences > Settings > GitCue`

## Terminal Features

Built-in commands in interactive terminal:
- `ai` - Enter AI chat mode
- `history` - Show command history
- `config` - Display GitCue configuration
- `help` - Show available commands
- `clear` - Clear terminal screen

Terminal automatically analyzes failed commands with AI suggestions.

## Activity Logs

Click on commit entries in the activity feed to view:
- Commit reason (AI decision, manual, buffer timeout)
- AI analysis details (significance, completeness, change type)
- Configuration snapshot
- Changed files list
- Diff summary

## Documentation

- [Installation Guide](../docs/installation.md)
- [Interactive Sidebar Guide](../docs/features/interactive-sidebar.md)
- [Intelligent Commits](../docs/features/intelligent-commits.md)
- [Testing Guide](../docs/guides/testing.md)
- [Full Documentation](../docs/)

## Requirements

- VS Code >= 1.96.0
- Git installed and configured
- Google Gemini API key

## Links

- [Main Repository](https://github.com/sbeeredd04/auto-git)
- [CLI Package](https://www.npmjs.com/package/@sbeeredd04/auto-git)
- [Issue Tracker](https://github.com/sbeeredd04/auto-git/issues)
- [Changelog](../docs/CHANGELOG_GITCUE.md)

## License

MIT License - see [LICENSE](../LICENSE)
