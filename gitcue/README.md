# GitCue - AI-Powered Git Automation for VS Code

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> 🤖 **GitCue** — Your intelligent Git companion for VS Code. Automate commits with AI-crafted messages, manage pushes and resets in-editor, and keep your workflow smooth and effortless.

GitCue brings the power of [Auto-Git CLI](https://www.npmjs.com/package/@sbeeredd04/auto-git) directly into VS Code with a beautiful, intuitive interface.

## ✨ Features

### 🤖 AI-Powered Commits
- **Smart Commit Messages**: Generate meaningful commit messages using Google's Gemini AI
- **Intelligent Mode**: AI decides when to commit based on code changes
- **Periodic Mode**: Time-based commits with customizable intervals

### ⏰ Buffer Period Protection
- **Commit Buffer**: 30-second cancellation window before commits are executed
- **Visual Countdown**: Beautiful timer interface with progress indicators
- **Quick Cancel**: Press 'c' or click to cancel pending commits
- **Seamless Resume**: Watch mode continues after cancellation

### 🎯 Modern Dashboard (v0.1.0)
- **Redesigned Interface**: Complete UI overhaul with clean, professional styling matching VS Code design language
- **Fixed Stability Issues**: Dashboard no longer disappears unexpectedly with improved error handling
- **Real-time Status**: Live monitoring of system status and configuration with optimized state management
- **Intuitive Controls**: Simplified checkbox-style toggle for watching mode and streamlined action buttons
- **Enhanced Visual Feedback**: Clear status indicators with color-coded badges and smooth animations
- **Responsive Design**: Works perfectly on all screen sizes with mobile-friendly layout

### 🔧 Smart Configuration
- **File Watching**: Customizable glob patterns for file monitoring
- **Rate Limiting**: Built-in API call limits to prevent overuse
- **Auto-Push**: Optional automatic pushing to remote repositories
- **Notifications**: Configurable status updates and alerts

## 🚀 Getting Started

### Prerequisites
- VS Code 1.96.0 or higher
- Git repository
- Gemini API key (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation
1. Install the extension from the VS Code marketplace
2. Open a Git repository in VS Code
3. Configure your Gemini API key in settings
4. Start using GitCue!

### Quick Setup
1. **Set API Key**: `Ctrl+Shift+P` → "GitCue: Configure Settings"
2. **Start Watching**: `Ctrl+Alt+W` or click the GitCue status bar item
3. **Open Dashboard**: Click the GitCue status bar or use `Ctrl+Shift+P` → "GitCue: Open Dashboard"

## 🎮 Usage

### Commands
- `Ctrl+Alt+C` - Manual AI commit
- `Ctrl+Alt+W` - Toggle file watching
- `Ctrl+Alt+X` - Cancel pending commit
- `Ctrl+Shift+P` → "GitCue" - Access all commands

### Dashboard Features
- **System Status**: Monitor watching mode, commit mode, and auto-push settings
- **API Configuration**: Check API key status, rate limits, and buffer time
- **Performance Metrics**: View debounce time, notifications, and auto-start settings
- **Watch Patterns**: See which file patterns are being monitored
- **Quick Actions**: Start/stop watching, manual commit, settings, and logs

### Buffer Period System
When GitCue is about to commit:
1. **Buffer Notification**: A countdown timer appears
2. **Cancellation Window**: 30 seconds (configurable) to cancel
3. **Visual Feedback**: Progress bar and timer show remaining time
4. **Quick Cancel**: Press 'c' key or click cancel button
5. **Auto-Resume**: Watching continues seamlessly after cancellation

## ⚙️ Configuration

### Settings
```json
{
  "gitcue.geminiApiKey": "your-api-key-here",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.bufferTimeSeconds": 30,
  "gitcue.debounceMs": 30000,
  "gitcue.maxCallsPerMinute": 15,
  "gitcue.enableNotifications": true,
  "gitcue.autoWatch": false,
  "gitcue.watchPaths": [
    "src/**",
    "lib/**",
    "*.js",
    "*.ts",
    "*.jsx",
    "*.tsx",
    "*.py"
  ]
}
```

### Commit Modes
- **Intelligent**: AI analyzes changes and decides when to commit
- **Periodic**: Time-based commits after file changes

### Watch Patterns
Configure which files to monitor using glob patterns:
- `src/**` - All files in src directory
- `*.js` - All JavaScript files
- `**/*.ts` - All TypeScript files recursively

## 🛡️ Safety Features

### Buffer Period Protection
- **Cancellation Window**: Always get time to review before commits
- **Visual Countdown**: Clear indication of remaining time
- **Multiple Cancel Methods**: Keyboard shortcut or button click
- **No Accidental Commits**: Built-in protection against unwanted commits

### Rate Limiting
- **API Protection**: Prevents excessive API calls
- **Configurable Limits**: Set your own rate limits
- **Smart Debouncing**: Waits for file changes to settle

### Error Handling
- **Graceful Fallbacks**: Continues working even if AI fails
- **Detailed Logging**: Comprehensive error reporting
- **Safe Defaults**: Sensible fallback commit messages

## 🎨 UI/UX Features

### Modern Dashboard
- **Clean Design**: Professional, minimalist interface
- **Smooth Animations**: Polished transitions and effects
- **Responsive Layout**: Works on all screen sizes
- **Dark Theme Support**: Follows VS Code theme

### Status Indicators
- **Real-time Updates**: Live status monitoring
- **Visual Feedback**: Clear indicators for all states
- **Color-coded Status**: Easy-to-understand status colors
- **Hover Effects**: Interactive elements with smooth transitions

## 🔧 Troubleshooting

### Common Issues
1. **API Key Not Working**: Verify your Gemini API key in settings
2. **No File Changes Detected**: Check your watch patterns configuration
3. **Commits Not Happening**: Ensure you're in a Git repository
4. **Buffer Not Showing**: Check if notifications are enabled

### Debug Mode
Enable detailed logging by opening the GitCue output channel:
`View` → `Output` → Select "GitCue" from dropdown

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Clone the repository
2. Run `npm install`
3. Open in VS Code
4. Press `F5` to launch extension development host

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent commit message generation
- VS Code team for the excellent extension API
- The open-source community for inspiration and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/sbeeredd04/auto-git/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sbeeredd04/auto-git/discussions)
- **Email**: [Support Email](mailto:support@gitcue.dev)

---

**Made with ❤️ by the GitCue team**

*GitCue - Making Git automation intelligent, efficient, and user-friendly in VS Code.*
