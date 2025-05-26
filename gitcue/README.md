# 🎯 GitCue - AI-Powered Git Assistant for VS Code

**Version 0.3.3** | Your intelligent Git companion that automates commits with AI-crafted messages, provides an AI-powered interactive terminal with chat capabilities, and keeps your workflow smooth and effortless.

![GitCue Banner](https://img.shields.io/badge/GitCue-v0.3.3-blue?style=for-the-badge&logo=git)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visual-studio-code)
![AI Powered](https://img.shields.io/badge/AI-Powered-FF6B6B?style=for-the-badge&logo=openai)

---

## ✨ What's New in v0.3.3

### 🖥️ **Full Terminal Functionality**
- **Directory Navigation**: Use `cd` to change directories, and `pwd` to print the current directory
- **Cross-Platform Shell**: Works on both Windows (cmd.exe) and Unix (bash)
- **Clean Output**: Properly aligned and formatted command output
- **Consistent Prompt**: Improved prompt and session management
- **AI Chat Exit**: Type `exit`, `quit`, `q`, or press Ctrl+C to leave AI chat mode

### 🚀 **Enhanced Features**
- **Improved Error Analysis**: Better AI suggestions with styled markdown responses
- **Interactive Chat Interface**: Ask AI questions and get formatted answers
- **Session History**: Persistent command history across sessions
- **Arrow Key Navigation**: Browse history with ↑↓ keys

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

#### **AI Terminal** (`Ctrl+Alt+T` / `Cmd+Alt+T`) *(Enhanced!)*
```bash
# Open AI-powered terminal
gitcue> git status
🔄 Executing: git status

────────────────────────────────────────────────────────────
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
        modified:   package.json
        modified:   src/extension.ts
────────────────────────────────────────────────────────────
✅ Command completed successfully

gitcue> cd test
🔄 Changed directory to: /path/to/your/workspace/test

gitcue> pwd
🔄 Current directory: /path/to/your/workspace/test

gitcue> ai
🤖 Entering AI Chat Mode
Type your questions and get AI-powered answers. Use Ctrl+C or type 'exit' to leave chat mode.
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
| **GitCue: Open Dashboard** | - | Open GitCue control panel |
| **GitCue: Cancel Commit** | `Ctrl+Alt+X` / `Cmd+Alt+X` | Cancel pending commit |

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

### **Enhanced Error Recovery** *(Improved in v0.3.3)*
- Contextual analysis of Git errors with styled output
- Step-by-step resolution guides with formatted code blocks
- Alternative command suggestions
- Interactive troubleshooting through AI chat
- Prevention tips for future issues

### **Professional Terminal Output** *(New in v0.3.3)*
- Clean command execution with visual separators
- ANSI color support for better readability
- Git syntax highlighting
- Formatted markdown responses
- Status indicators (✅ success, ❌ error)

### **Session Management**
- Persistent command history across VS Code restarts
- Configurable history size (10-1000 commands)
- Smart deduplication of repeated commands
- Arrow key navigation through history

---

## 🧪 Testing & Development

### **Testing GitCue v0.3.3**

1. **Basic Terminal Test**:
   ```bash
   # Open terminal (Ctrl+Alt+T)
   gitcue> help
   gitcue> config
   gitcue> git status
   gitcue> cd test
   gitcue> pwd
   ```

2. **AI Chat Test**:
   ```bash
   gitcue> ai
   ai-chat> what is git stash?
   # Use Ctrl+C or type 'exit' to exit chat mode
   ```

3. **Error Analysis Test**:
   ```bash
   gitcue> git push origin nonexistent-branch
   # Should trigger AI error analysis
   ```

4. **History & Navigation**:
   ```bash
   # Run several commands
   gitcue> history
   # Use ↑↓ arrows to navigate
   ```

### **Common Testing Scenarios**
- ✅ Terminal opens without errors
- ✅ Commands execute with clean formatting
- ✅ AI chat mode works correctly
- ✅ Error analysis provides helpful suggestions
- ✅ Markdown rendering is properly styled
- ✅ History navigation functions
- ✅ Configuration display is accurate

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

### **v0.3.3** (December 19, 2024) - Full Terminal Functionality Release
- **🎉 Major Features**:
  - Full terminal navigation (`cd`, `pwd`, etc.)
  - Cross-platform shell support
  - Clean output formatting and alignment
  - Enhanced AI chat exit and prompt
  - Improved markdown rendering
  - Professional visual design with ANSI colors
  - Directory feedback and error handling

- **🛠️ Improvements**:
  - Better error analysis with formatted suggestions
  - Git command syntax highlighting
  - Clean command execution display
  - Improved user experience

### **v0.3.2** - Enhanced Terminal Navigation
- Directory navigation and shell improvements
- Output formatting fixes

### **v0.3.1** - AI Chat Exit and Output Fixes
- AI chat exit commands and output formatting

### **v0.3.0** - Terminal Enhancement Release
- Interactive AI chat mode (`ai` command)
- Fixed terminal output formatting with clean borders
- Enhanced markdown rendering with styled responses
- Professional visual design with ANSI colors

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

**GitCue v0.3.3** - Your AI-Powered Git Assistant

[⭐ Star on GitHub](https://github.com/sbeeredd04/Auto-Commit) | [🐛 Report Issues](https://github.com/sbeeredd04/Auto-Commit/issues) | [💬 Discussions](https://github.com/sbeeredd04/Auto-Commit/discussions) | [📦 VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)

**Happy Coding! 🚀**

</div>
