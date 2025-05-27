# 🎯 GitCue - AI-Powered Git Assistant for VS Code

**Version 0.3.8** | Your intelligent Git companion that automates commits with AI-crafted messages, provides an AI-powered interactive terminal with chat capabilities, and keeps your workflow smooth and effortless.

![GitCue Banner](https://img.shields.io/badge/GitCue-v0.3.8-blue?style=for-the-badge&logo=git)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visual-studio-code)
![AI Powered](https://img.shields.io/badge/AI-Powered-FF6B6B?style=for-the-badge&logo=openai)

---

## ✨ What's New in v0.3.8

### 🎨 **Enhanced Terminal Experience**
- **Professional Markdown Rendering**: Clean, styled output with proper formatting for headers, code blocks, and lists
- **Concise AI Responses**: Dramatically reduced AI response length (93% reduction) for faster, more focused suggestions
- **Git Internal File Filtering**: Smart filtering to ignore Git internal files like `index.lock`, preventing duplicate notifications
- **Command Palette Integration**: Access GitCue commands via Ctrl+Shift+P (Command Palette)

### 🤖 **Improved AI Intelligence**
- **Ultra-Concise Error Analysis**: AI responses now under 200 words, focusing on actionable solutions
- **Enhanced Commit Message Generation**: Better AI-powered commit messages with proper staging
- **Smart File Change Detection**: Accurate file counting without Git noise
- **Professional Output Formatting**: Clean terminal display with visual separators and status indicators

### 🚀 **New Features**
- **Dashboard Commands**: "GitCue: Open AI Terminal" and "GitCue: Dashboard" now available in Command Palette
- **Activity History Tracking**: Real-time monitoring of file changes, commits, and AI analysis
- **Enhanced Error Recovery**: Better error handling with retry logic and user-friendly messages
- **Cross-Platform Compatibility**: Improved shell support for Windows and Unix systems

---

## 🚀 Key Features

### 🤖 **AI-Powered Commit Messages**
Generate contextual, meaningful commit messages using Google Gemini AI that understand your code changes and follow best practices.

**Features**:
- Intelligent analysis of your code changes
- Customizable commit modes (periodic/intelligent)
- Preview and edit before committing
- Buffer time to cancel unwanted commits
- Auto-push capabilities

### 🖥️ **AI-Enhanced Interactive Terminal** *(Enhanced in v0.3.3)*
A professional terminal experience with AI-powered error analysis and interactive chat capabilities.

**New in v0.3.3**:
- **Full Terminal Navigation**: Use `cd`, `pwd`, and other shell commands
- **Cross-Platform Support**: Works on Windows and Unix
- **Clean Output Formatting**: Properly formatted command output
- **Styled Markdown**: AI responses with headers, code blocks, and formatting
- **Visual Separators**: Clear borders and status indicators
- **Git Syntax Highlighting**: Enhanced display for Git commands

**Terminal Features**:
- Execute any command with real-time output
- Persistent command history across sessions
- Arrow key navigation (↑↓) through history
- Smart error analysis with AI suggestions
- Built-in commands: `history`, `clear`, `config`, `ai`, `help`, `exit`, `cd`, `pwd`

### 👁️ **Smart File Watching**
Automatically detect file changes and create intelligent commits based on your workflow patterns.

**Features**:
- Configurable watch patterns and ignore rules
- Debounced commits to prevent spam
- Buffer notifications with cancel options
- Intelligent vs periodic commit modes

### 📊 **Intuitive Dashboard**
Monitor your GitCue status and access all features from a beautiful, responsive interface.

**Features**:
- Real-time status monitoring
- Configuration management
- Quick access to all GitCue features
- System health indicators

---

## 🎮 Quick Start Guide

### 1. **Installation**
1. **From VS Code Marketplace**: Search for "GitCue" and install
2. **From VSIX**: Download `gitcue-0.3.3.vsix` and install locally

### 2. **Setup API Key**
1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
3. Search for "GitCue" and set your API key in `gitcue.geminiApiKey`

### 3. **Start Using GitCue**

#### **AI Commit** (`Ctrl+Alt+C` / `Cmd+Alt+C`)
```bash
# Make changes to your code
# Press Ctrl+Alt+C (or Cmd+Alt+C on Mac)
# Review the AI-generated commit message
# Commit with one click!
```

#### **AI Terminal** (`Ctrl+Alt+T` / `Cmd+Alt+T`) *(Enhanced in v0.3.8!)*
```bash
# Open AI-powered terminal with professional markdown rendering
gitcue> git status
🔄 Executing: git status

On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
        modified:   package.json
        modified:   src/extension.ts

gitcue> git push origin nonexistent-branch
🔄 Executing: git push origin nonexistent-branch
❌ Command failed (exit code 1)

🔄 Analyzing error with AI...
🔍 Analysis Complete:
─────────────────────────────────────────────────────────────────────────────────
## What went wrong
The branch 'nonexistent-branch' doesn't exist on the remote repository.

## Most likely fix
```bash
git checkout -b nonexistent-branch
git push -u origin nonexistent-branch
```

## Alternative solutions
- Check existing branches: `git branch -r`
- Push to main instead: `git push origin main`
─────────────────────────────────────────────────────────────────────────────────
💡 You can run the suggested commands directly in this terminal!

gitcue> ai
🤖 Entering AI Chat Mode
ai-chat> explain git rebase vs merge
🤖 AI Response:
## Git Rebase vs Merge

**Rebase**: Replays commits on top of another branch, creating linear history
**Merge**: Combines branches with a merge commit, preserving branch structure

Use rebase for clean history, merge for preserving context.
```

#### **Dashboard** (`Ctrl+Shift+P` → "GitCue: Open Dashboard")
Access the centralized control panel to:
- Monitor file watching status
- View system configuration
- Access all GitCue features
- Manage settings

---

## 📋 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| **GitCue: AI Commit** | `Ctrl+Alt+C` / `Cmd+Alt+C` | Generate and preview AI commit |
| **GitCue: Open AI Terminal** | `Ctrl+Alt+T` / `Cmd+Alt+T` | Launch interactive AI terminal |
| **GitCue: Toggle Auto-Watch** | `Ctrl+Alt+W` / `Cmd+Alt+W` | Start/stop file watching |
| **GitCue: Open Dashboard** | `Ctrl+Shift+P` → "GitCue: Dashboard" | Open GitCue control panel |
| **GitCue: Cancel Commit** | `Ctrl+Alt+X` / `Cmd+Alt+X` | Cancel pending commit |
| **GitCue: Open AI-Powered Shell** | `Ctrl+Shift+P` → "GitCue: Open AI-Powered Shell" | Alternative terminal access |

### **Terminal Built-in Commands**
| Command | Description |
|---------|-------------|
| `ai` | Enter interactive AI chat mode |
| `history` | Show command history with syntax highlighting |
| `config` | Display GitCue configuration |
| `help` | Show comprehensive help |
| `clear` | Clear terminal screen |
| `exit` | Exit interactive session or AI chat mode |
| `cd` | Change directory |
| `pwd` | Print current directory |

---

## ⚙️ Configuration

### **Core Settings**
```json
{
  "gitcue.geminiApiKey": "your-api-key-here",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.enableNotifications": true
}
```

### **Interactive Terminal** *(Enhanced in v0.3.3)*
```json
{
  "gitcue.enableSuggestions": true,
  "gitcue.sessionPersistence": true,
  "gitcue.maxHistorySize": 100,
  "gitcue.terminalVerbose": false
}
```

### **File Watching**
```json
{
  "gitcue.watchPaths": ["src/**", "*.js", "*.ts", "*.py"],
  "gitcue.watchIgnored": ["node_modules/**", ".git/**", "dist/**"],
  "gitcue.debounceMs": 30000,
  "gitcue.bufferTimeSeconds": 30
}
```

### **AI & Rate Limiting**
```json
{
  "gitcue.maxCallsPerMinute": 15,
  "gitcue.interactiveOnError": true
}
```

---

## 🎯 Use Cases

### **For Individual Developers**
- ✅ Generate meaningful commit messages automatically
- ✅ Get AI help when Git commands fail
- ✅ Learn Git through interactive AI conversations
- ✅ Maintain consistent commit history
- ✅ Debug Git issues with AI assistance

### **For Teams**
- ✅ Standardize commit message formats
- ✅ Reduce time spent on Git troubleshooting
- ✅ Share AI-powered Git knowledge
- ✅ Improve code review efficiency
- ✅ Onboard new developers faster

### **For Learning & Development**
- ✅ Understand Git commands through AI explanations
- ✅ Learn from contextual error suggestions
- ✅ Ask questions in AI chat mode
- ✅ Build better Git habits
- ✅ Explore advanced Git features safely

---

## 🔧 Advanced Features

### **AI Chat Interface** *(New in v0.3.3)*
Interactive AI conversations directly in the terminal:

```bash
gitcue> ai
🤖 Entering AI Chat Mode

ai-chat> explain git rebase vs merge
🤖 AI Response:
## Git Rebase vs Merge

**Git Merge**:
- Creates a new commit that combines changes
- Preserves branch history
- Non-destructive operation

**Git Rebase**:
- Rewrites commit history
- Creates a linear history
- More dangerous but cleaner

### When to use each:
- Use **merge** for: feature branches, public commits
- Use **rebase** for: cleaning up local history, linear workflow
```

### **Enhanced Error Recovery** *(Improved in v0.3.8)*
- **Ultra-concise AI analysis**: Responses reduced by 93% for faster reading
- **Professional markdown rendering**: Clean headers, code blocks, and formatting
- **Smart Git file filtering**: Ignores internal Git files to prevent noise
- **Retry logic**: Automatic retry for transient errors with exponential backoff
- **Interactive troubleshooting**: Direct command execution from AI suggestions

### **Professional Terminal Output** *(Enhanced in v0.3.8)*
- **Clean markdown rendering**: Proper formatting with visual separators
- **Concise AI responses**: Under 200 words, focused on actionable solutions
- **Git syntax highlighting**: Enhanced display for Git commands
- **Activity tracking**: Real-time monitoring of file changes and commits
- **Status indicators**: Clear success/error feedback with visual cues

### **Session Management**
- Persistent command history across VS Code restarts
- Configurable history size (10-1000 commands)
- Smart deduplication of repeated commands
- Arrow key navigation through history

---

## 🚀 Key Improvements in v0.3.8

### **Performance & User Experience**
- **93% Reduction in AI Response Length**: From 733 words to 53 words average for faster reading
- **Professional Markdown Rendering**: Clean headers, code blocks, lists, and formatting
- **Smart Git File Filtering**: Eliminates noise from internal Git files like `index.lock`
- **Command Palette Integration**: Access all GitCue features via `Ctrl+Shift+P`

### **Enhanced AI Intelligence**
- **Ultra-Concise Error Analysis**: Focused responses under 200 words with actionable solutions
- **Better Commit Message Generation**: Improved AI analysis with proper file staging
- **Enhanced Error Recovery**: Retry logic with exponential backoff for transient errors
- **Real-Time Activity Tracking**: Monitor file changes, commits, and AI analysis in dashboard

### **Technical Improvements**
- **New Markdown Renderer**: Dedicated `MarkdownRenderer` class for clean terminal output
- **Cross-Platform Shell Support**: Improved compatibility for Windows and Unix systems
- **Professional Terminal Design**: Visual separators, status indicators, and clean formatting
- **Enhanced File Watching**: Accurate change detection without Git internal file noise

---

## 🧪 Testing & Development

### **Testing GitCue v0.3.8**

1. **Enhanced Terminal Test**:
   ```bash
   # Open terminal (Ctrl+Alt+T or Command Palette)
   gitcue> help
   gitcue> config
   gitcue> git status
   gitcue> test-ai  # Test AI connection
   ```

2. **Markdown Rendering Test**:
   ```bash
   gitcue> git push origin nonexistent-branch
   # Should show clean, formatted AI analysis with headers and code blocks
   ```

3. **AI Chat Test**:
   ```bash
   gitcue> ai
   ai-chat> explain git rebase vs merge
   # Should get concise, well-formatted response under 200 words
   ai-chat> exit  # or Ctrl+C to exit
   ```

4. **Command Palette Test**:
   ```bash
   # Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
   # Type "GitCue" to see all available commands
   # Try "GitCue: Open AI Terminal" and "GitCue: Dashboard"
   ```

5. **File Change Detection Test**:
   ```bash
   # Make changes to files and observe clean activity logging
   # Should not see Git internal files like index.lock in logs
   ```

### **Common Testing Scenarios**
- ✅ Terminal opens without errors and shows v0.3.8 branding
- ✅ Commands execute with clean, professional formatting
- ✅ AI responses are concise (under 200 words) and well-formatted
- ✅ Error analysis shows clean markdown with headers and code blocks
- ✅ File change detection ignores Git internal files
- ✅ Command Palette integration works (Ctrl+Shift+P)
- ✅ Dashboard shows real-time activity history
- ✅ AI chat provides focused, actionable responses

---

## 🐛 Troubleshooting

### **AI Features Not Working**
1. ✅ **Check API Key**: Ensure `gitcue.geminiApiKey` is set correctly
2. ✅ **Verify Internet**: AI features require internet connection
3. ✅ **Rate Limiting**: Check if you've exceeded `gitcue.maxCallsPerMinute`
4. ✅ **VS Code Output**: Check Output panel > GitCue for error details

### **Terminal Issues**
1. ✅ **Workspace Required**: Ensure a folder/workspace is open
2. ✅ **Extension Enabled**: Verify GitCue is enabled in Extensions panel
3. ✅ **Permissions**: Check file system permissions
4. ✅ **Restart**: Try restarting VS Code

### **Formatting Problems**
1. ✅ **Terminal Support**: Ensure your terminal supports ANSI colors
2. ✅ **VS Code Version**: Update to latest VS Code version
3. ✅ **Font Settings**: Use a monospace font in terminal

### **Chat Mode Issues**
1. ✅ **Exit Chat**: Use Ctrl+C or type 'exit' to exit AI chat mode
2. ✅ **API Key**: Ensure Gemini API key is configured
3. ✅ **Network**: Check internet connection
4. ✅ **Rate Limits**: Wait if you've exceeded API limits

---

## 📚 Version History

### **v0.3.8** (December 19, 2024) - Professional Enhancement Release
- **🎉 Major Features**:
  - **Professional markdown rendering**: Clean, styled output with proper formatting
  - **Ultra-concise AI responses**: 93% reduction in response length for faster reading
  - **Smart Git file filtering**: Ignores internal Git files to prevent notification noise
  - **Command Palette integration**: Access GitCue commands via Ctrl+Shift+P
  - **Enhanced commit message generation**: Better AI analysis with proper file staging
  - **Activity history tracking**: Real-time monitoring in dashboard

- **🛠️ Improvements**:
  - **Markdown renderer utility**: New `MarkdownRenderer` class for clean terminal output
  - **Concise AI prompts**: Focused responses under 200 words with actionable solutions
  - **Enhanced error handling**: Retry logic and better user feedback
  - **Professional terminal design**: Visual separators and status indicators
  - **Cross-platform compatibility**: Improved shell support for Windows and Unix

### **v0.3.7** - AI Response Optimization
- Dramatically reduced AI response verbosity
- Enhanced commit message generation with staging

### **v0.3.6** - File Filtering Enhancement
- Git internal file filtering implementation
- Activity history improvements

### **v0.3.5** - Markdown Rendering
- Professional markdown rendering system
- Clean terminal output formatting

### **v0.3.4** - Command Integration
- Command Palette accessibility
- Enhanced dashboard functionality

### **v0.3.3** - Full Terminal Functionality Release
- Full terminal navigation (`cd`, `pwd`, etc.)
- Cross-platform shell support
- Clean output formatting and alignment
- Enhanced AI chat exit and prompt

### **v0.3.2** - Enhanced Terminal Navigation
- Directory navigation and shell improvements
- Output formatting fixes

### **v0.3.1** - AI Chat Exit and Output Fixes
- AI chat exit commands and output formatting

### **v0.3.0** - Terminal Enhancement Release
- Interactive AI chat mode (`ai` command)
- Fixed terminal output formatting with clean borders
- Enhanced markdown rendering with styled responses

---

## 🤝 Contributing

We welcome contributions to make GitCue even better!

### **Ways to Contribute**
- 🐛 **Report Bugs**: Found an issue? Let us know!
- 💡 **Suggest Features**: Have ideas for improvements?
- 📝 **Improve Documentation**: Help make our docs better
- 🔧 **Submit Code**: Pull requests are welcome

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/sbeeredd04/Auto-Commit.git
cd Auto-Commit/gitcue

# Install dependencies
npm install

# Compile the extension
npm run compile

# Package for testing
npm run package
```

### **Repository Links**
- **GitHub**: [https://github.com/sbeeredd04/Auto-Commit](https://github.com/sbeeredd04/Auto-Commit)
- **Issues**: [Report Bugs & Request Features](https://github.com/sbeeredd04/Auto-Commit/issues)
- **Discussions**: [Community Discussions](https://github.com/sbeeredd04/Auto-Commit/discussions)

---

## 📄 License

This project is licensed under the **MIT License**.

### MIT License Summary
- ✅ Use, copy, modify, merge, publish, distribute
- ✅ Sublicense and sell copies
- ✅ Private and commercial use
- ❗ Include copyright notice and license text
- ❗ No warranty provided

See the [LICENSE](LICENSE) file for complete details.

---

## 🙏 Acknowledgments

### **Powered By**
- **Google Gemini AI** - For intelligent commit messages and chat capabilities
- **VS Code Extension API** - For seamless editor integration
- **Open Source Community** - For inspiration, feedback, and contributions

### **Special Thanks**
- Contributors who help improve GitCue
- Users who provide valuable feedback
- The VS Code team for excellent tooling
- The Git community for best practices

---

## 🌟 Support GitCue

If GitCue helps improve your development workflow, consider:

- ⭐ **Star the Repository** on GitHub
- 📝 **Write a Review** on VS Code Marketplace
- 🐛 **Report Issues** to help us improve
- 💬 **Share with Others** who might benefit
- 🤝 **Contribute** to the project

---

<div align="center">

**Made with ❤️ for Developers**

![GitCue Logo](icon.png)

**GitCue v0.3.8** - Your AI-Powered Git Assistant

[⭐ Star on GitHub](https://github.com/sbeeredd04/Auto-Commit) | [🐛 Report Issues](https://github.com/sbeeredd04/Auto-Commit/issues) | [💬 Discussions](https://github.com/sbeeredd04/Auto-Commit/discussions) | [📦 VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)

**Happy Coding! 🚀**

</div>
