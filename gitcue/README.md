# GitCue - VS Code Extension

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 🤖 **GitCue** — Your intelligent Git companion for VS Code. Automate commits with AI-crafted messages, manage pushes and resets in-editor, and keep your workflow smooth and effortless.

GitCue brings the power of [Auto-Git CLI](https://www.npmjs.com/package/@sbeeredd04/auto-git) directly into VS Code with a beautiful, intuitive interface.

## ✨ Features

### 🧠 AI-Powered Commits
- **Smart Commit Messages**: Generate conventional commit messages using Google's Gemini AI
- **Commit Preview**: Review and edit AI-generated messages before committing
- **Intelligent Analysis**: AI analyzes your changes and suggests appropriate commit types

### 👁️ Auto-Watch Mode
- **File Watching**: Automatically detect file changes and trigger commits
- **Intelligent Mode**: AI decides when changes are significant enough to commit
- **Periodic Mode**: Traditional time-based commits
- **Debounced Processing**: Configurable delay to batch related changes

### 🎛️ Intuitive Controls
- **Status Bar Integration**: One-click toggle for watching mode
- **Command Palette**: Access all features via `Ctrl+Shift+P`
- **Keyboard Shortcuts**: Quick access with customizable hotkeys
- **Context Menus**: Right-click integration in editor and SCM views

### 📊 Dashboard & Monitoring
- **Real-time Status**: Monitor watching state, commit mode, and configuration
- **Output Channel**: Detailed logging for debugging and monitoring
- **Tree View**: Quick status overview in the SCM panel

### ⚙️ Flexible Configuration
- **VS Code Settings**: Configure everything through VS Code's settings UI
- **Environment Variables**: Support for existing Auto-Git configurations
- **Per-workspace Settings**: Different configurations for different projects

## 🚀 Quick Start

### 1. Install the Extension

**Option A: VS Code Marketplace**
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "GitCue"
4. Click Install

**Option B: Command Line**
```bash
code --install-extension sbeeredd04.gitcue
```

### 2. Configure Your API Key

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Open VS Code Settings (`Ctrl+,`)
3. Search for "GitCue"
4. Set your API key in `GitCue: Gemini Api Key`

### 3. Start Using GitCue

- **Manual Commit**: `Ctrl+Alt+C` (or `Cmd+Alt+C` on Mac)
- **Toggle Auto-Watch**: `Ctrl+Alt+W` (or `Cmd+Alt+W` on Mac)
- **Open Dashboard**: Command Palette → "GitCue: Open Dashboard"

## 📋 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `GitCue: AI Commit` | `Ctrl+Alt+C` | Generate AI commit message and preview |
| `GitCue: Toggle Auto-Watch` | `Ctrl+Alt+W` | Start/stop automatic file watching |
| `GitCue: Open Dashboard` | - | Open the GitCue status dashboard |
| `GitCue: Reset Commits` | - | Interactive commit reset with safety checks |
| `GitCue: Configure Settings` | - | Open GitCue settings |
| `GitCue: Show Status` | - | Show detailed status in output channel |

## ⚙️ Configuration

### Basic Settings

```json
{
  "gitcue.geminiApiKey": "your-api-key-here",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.enableNotifications": true,
  "gitcue.autoWatch": false
}
```

### Advanced Settings

```json
{
  "gitcue.watchPaths": [
    "src/**",
    "lib/**",
    "*.js",
    "*.ts",
    "*.jsx",
    "*.tsx",
    "*.py"
  ],
  "gitcue.debounceMs": 30000,
  "gitcue.bufferTimeSeconds": 30,
  "gitcue.maxCallsPerMinute": 15
}
```

### Setting Descriptions

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `geminiApiKey` | string | "" | Your Gemini API key for AI-powered commits |
| `commitMode` | enum | "intelligent" | Commit mode: "periodic" or "intelligent" |
| `autoPush` | boolean | true | Automatically push commits to remote |
| `watchPaths` | array | ["src/**", "lib/**", ...] | File patterns to watch |
| `debounceMs` | number | 30000 | Delay before processing file changes |
| `bufferTimeSeconds` | number | 30 | Time to cancel commits in intelligent mode |
| `maxCallsPerMinute` | number | 15 | API rate limiting |
| `enableNotifications` | boolean | true | Show VS Code notifications |
| `autoWatch` | boolean | false | Start watching when VS Code opens |

## 🎯 Usage Examples

### Manual Commit Workflow

1. Make changes to your files
2. Press `Ctrl+Alt+C` or use Command Palette → "GitCue: AI Commit"
3. Review the AI-generated commit message
4. Edit if needed or commit directly
5. Choose whether to push to remote

### Auto-Watch Workflow

1. Press `Ctrl+Alt+W` to start watching
2. Make changes to your files
3. GitCue automatically detects changes after the debounce period
4. In intelligent mode, AI decides if changes warrant a commit
5. Review and approve commits through the preview interface

### Dashboard Monitoring

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "GitCue: Open Dashboard"
3. Monitor real-time status, configuration, and watch patterns
4. Quick access to all GitCue features

## 🔧 Troubleshooting

### Common Issues

**"Gemini API key not configured"**
- Go to VS Code Settings → Search "GitCue" → Set your API key
- Or use Command Palette → "GitCue: Configure Settings"

**"No workspace folder found"**
- Open a folder in VS Code (`File → Open Folder`)
- Ensure the folder contains a Git repository (`git init` if needed)

**Auto-watch not working**
- Check that you have a valid API key configured
- Verify watch patterns in settings match your file structure
- Check the Output panel (View → Output → GitCue) for detailed logs

**Commit preview not showing**
- Ensure you have uncommitted changes (`git status`)
- Check that your workspace is a valid Git repository
- Verify API key is working by checking the output logs

### Debug Information

1. Open Output panel: `View → Output`
2. Select "GitCue" from the dropdown
3. Enable verbose logging in settings
4. Use "GitCue: Show Status" command for configuration overview

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/sbeeredd04/auto-git.git
cd auto-git/gitcue

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

### Testing

```bash
# Run tests
npm test

# Debug in VS Code
# Press F5 to launch Extension Development Host
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit using GitCue! (`git commit -m "feat: add amazing feature"`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[Auto-Git CLI](https://www.npmjs.com/package/@sbeeredd04/auto-git)** - The core CLI tool that powers this extension
- **[Google Gemini AI](https://ai.google.dev/)** - The AI model used for generating commit messages

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sbeeredd04/auto-git/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sbeeredd04/auto-git/discussions)
- **VS Code Marketplace**: [GitCue Extension](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)

---

**Made with ❤️ by [sbeeredd04](https://github.com/sbeeredd04)**

*GitCue - Making Git automation intelligent, efficient, and user-friendly in VS Code.*
