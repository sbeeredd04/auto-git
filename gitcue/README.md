# 🎯 GitCue - AI-Powered Git Assistant for VS Code

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg?style=for-the-badge)](https://marketplace.visualstudio.com/items?itemName=sbeeredd04.gitcue)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visual-studio-code)](https://code.visualstudio.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered%20by%20Gemini-FF6B6B?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **Your intelligent Git companion with enhanced interactive sidebar, AI-crafted commit messages, smart repository management, and seamless VS Code integration for effortless version control.**

GitCue transforms your Git workflow with an enhanced interactive sidebar featuring actionable buttons, real-time status cards, and one-click actions. It intelligently analyzes code changes, generates meaningful commit messages using Google's Gemini AI, and provides a professional UI with improved space utilization and modern design.

---

## 🚀 What's New in v4.0.0

### 🎨 Enhanced Interactive Sidebar
- **Smart Status Cards**: Real-time GitCue status, file changes, and repository overview
- **One-Click Actions**: Direct commit, terminal access, and settings from sidebar
- **Professional UI**: Modern interface with proper icons and organized sections
- **Better Space Utilization**: Actionable buttons and interactive elements instead of plain text
- **Enhanced Activity Feed**: Improved activity tracking with visual indicators

### 🔧 Improved User Experience
- **Intuitive Navigation**: Quick access to all GitCue features
- **Visual Feedback**: Clear status indicators and tooltips
- **Responsive Design**: Better organization with collapsible sections
- **Interactive Elements**: Clickable items for immediate actions

### 📊 Smart Repository Management
- **Repository Info Card**: Branch details, commit counts, and change status
- **Configuration Panel**: Easy access to all settings with inline actions
- **Activity Summary**: Enhanced tracking with categorized activities

---

## 🏗️ Architecture Overview

GitCue follows a modular, service-oriented architecture designed for scalability, maintainability, and intelligent automation. The extension consists of interconnected services that work together to provide seamless Git automation.

### 🔧 High-Level System Architecture

```mermaid
graph TB
    subgraph "VS Code Extension Host"
        subgraph "GitCue Extension Core"
            EXT[Extension.ts<br/>Main Controller]
            
            subgraph "Service Layer"
                CS[CommitService<br/>AI Commit Logic]
                FWS[FileWatcherService<br/>Change Detection]
                DS[DashboardService<br/>UI Management]
                AL[ActivityLogger<br/>State Tracking]
                SP[StatusProvider<br/>Tree View]
            end
            
            subgraph "Terminal System"
                IPT[InteractivePty<br/>Terminal Interface]
                MR[MarkdownRenderer<br/>Output Formatting]
            end
            
            subgraph "Utility Layer"
                AI[AI Utils<br/>Gemini Integration]
                CFG[Config Manager<br/>Settings]
                LOG[Logger<br/>Diagnostics]
            end
        end
        
        subgraph "VS Code APIs"
            VSCODE[VS Code Extension API]
            WEBVIEW[Webview API]
            TERMINAL[Terminal API]
            WORKSPACE[Workspace API]
        end
        
        subgraph "External Services"
            GEMINI[Google Gemini AI]
            GIT[Git CLI]
            FS[File System]
        end
    end
    
    EXT --> CS
    EXT --> FWS
    EXT --> DS
    EXT --> AL
    EXT --> SP
    EXT --> IPT
    
    CS --> AI
    FWS --> AI
    DS --> WEBVIEW
    IPT --> MR
    IPT --> GIT
    
    AI --> GEMINI
    FWS --> FS
    CS --> GIT
    
    EXT --> VSCODE
    DS --> VSCODE
    SP --> VSCODE
    IPT --> TERMINAL
    
    style EXT fill:#e1f5fe
    style CS fill:#f3e5f5
    style AI fill:#fff3e0
    style GEMINI fill:#ffebee
```

### 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Extension
    participant FileWatcher
    participant CommitService
    participant AI
    participant Gemini
    participant Git
    participant Dashboard
    
    User->>Extension: Activate GitCue
    Extension->>FileWatcher: Start watching files
    Extension->>Dashboard: Initialize dashboard
    
    loop File Monitoring
        FileWatcher->>FileWatcher: Detect file changes
        FileWatcher->>Git: Get diff content
        Git-->>FileWatcher: Return diff
        
        alt Intelligent Mode
            FileWatcher->>CommitService: Request commit analysis
            CommitService->>AI: Analyze changes
            AI->>Gemini: Send analysis request
            Gemini-->>AI: Return commit decision
            AI-->>CommitService: Decision result
            
            alt Should Commit
                CommitService->>User: Show buffer notification
                User->>CommitService: Confirm/Cancel
                alt Confirmed
                    CommitService->>Git: Execute commit
                    Git-->>CommitService: Commit result
                end
            end
        else Periodic Mode
            FileWatcher->>CommitService: Generate commit message
            CommitService->>AI: Request message
            AI->>Gemini: Generate message
            Gemini-->>AI: Return message
            CommitService->>Git: Auto-commit
        end
        
        CommitService->>Dashboard: Update status
        Dashboard->>User: Display updates
    end
```

### 🧩 Component Interaction Diagram

```mermaid
graph LR
    subgraph "User Interface Layer"
        CMD[Commands]
        DASH[Dashboard]
        TERM[Terminal]
        STATUS[Status Bar]
    end
    
    subgraph "Business Logic Layer"
        FW[File Watcher]
        CS[Commit Service]
        AL[Activity Logger]
    end
    
    subgraph "Integration Layer"
        AI[AI Service]
        GIT[Git Service]
        CFG[Config Service]
    end
    
    subgraph "External APIs"
        GEMINI[Gemini AI]
        GITCLI[Git CLI]
        VSCODE[VS Code API]
    end
    
    CMD --> CS
    CMD --> FW
    CMD --> TERM
    
    DASH --> AL
    DASH --> CFG
    
    TERM --> AI
    TERM --> GIT
    
    FW --> CS
    FW --> AL
    
    CS --> AI
    CS --> GIT
    CS --> AL
    
    AI --> GEMINI
    GIT --> GITCLI
    
    AL --> DASH
    STATUS --> AL
    
    style CMD fill:#e3f2fd
    style AI fill:#f3e5f5
    style GEMINI fill:#ffebee
```

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

## 🚀 Core Features

### 🤖 **AI-Powered Commit Messages**

```mermaid
flowchart TD
    A[File Changes Detected] --> B[Generate Git Diff]
    B --> C{Commit Mode?}
    
    C -->|Intelligent| D[AI Analysis]
    C -->|Periodic| E[Generate Message]
    
    D --> F{Should Commit?}
    F -->|Yes| G[Generate Message]
    F -->|No| H[Continue Watching]
    
    G --> I[Show Buffer Notification]
    E --> I
    
    I --> J{User Confirms?}
    J -->|Yes| K[Execute Commit]
    J -->|No| L[Cancel Commit]
    
    K --> M{Auto Push Enabled?}
    M -->|Yes| N[Push to Remote]
    M -->|No| O[Local Commit Only]
    
    N --> P[Update Activity Log]
    O --> P
    L --> H
    H --> Q[Continue Monitoring]
    P --> Q
    
    style A fill:#e3f2fd
    style D fill:#f3e5f5
    style K fill:#e8f5e8
    style I fill:#fff3e0
```

**Features**:
- Intelligent analysis of your code changes using Google Gemini AI
- Customizable commit modes (periodic/intelligent)
- Preview and edit capabilities before committing
- Configurable buffer time to cancel unwanted commits
- Automatic push capabilities with remote validation

### 🖥️ **AI-Enhanced Interactive Terminal**

```mermaid
graph TB
    subgraph "Terminal Interface"
        INPUT[User Input]
        PROMPT[Command Prompt]
        OUTPUT[Formatted Output]
    end
    
    subgraph "Command Processing"
        PARSER[Command Parser]
        BUILTIN[Built-in Commands]
        SHELL[Shell Commands]
        AI_CHAT[AI Chat Mode]
    end
    
    subgraph "AI Integration"
        ERROR_ANALYSIS[Error Analysis]
        SUGGESTIONS[Suggestions]
        CHAT[Interactive Chat]
    end
    
    subgraph "Output Rendering"
        MARKDOWN[Markdown Renderer]
        SYNTAX[Syntax Highlighting]
        FORMATTING[Clean Formatting]
    end
    
    INPUT --> PARSER
    PARSER --> BUILTIN
    PARSER --> SHELL
    PARSER --> AI_CHAT
    
    SHELL --> ERROR_ANALYSIS
    ERROR_ANALYSIS --> SUGGESTIONS
    AI_CHAT --> CHAT
    
    BUILTIN --> MARKDOWN
    SUGGESTIONS --> MARKDOWN
    CHAT --> MARKDOWN
    
    MARKDOWN --> SYNTAX
    SYNTAX --> FORMATTING
    FORMATTING --> OUTPUT
    
    OUTPUT --> PROMPT
    
    style INPUT fill:#e3f2fd
    style ERROR_ANALYSIS fill:#f3e5f5
    style MARKDOWN fill:#e8f5e8
```

**Enhanced Features in v0.3.8**:
- **Full Terminal Navigation**: Use `cd`, `pwd`, and other shell commands seamlessly
- **Cross-Platform Support**: Works flawlessly on Windows, macOS, and Linux
- **Professional Markdown Rendering**: Clean, styled output with proper formatting
- **Visual Separators**: Clear borders and status indicators for better readability
- **Git Syntax Highlighting**: Enhanced display for Git commands and output

**Core Terminal Features**:
- Execute any command with real-time output capture
- Persistent command history across VS Code sessions
- Arrow key navigation (↑↓) through command history
- Smart error analysis with AI-powered suggestions
- Built-in commands: `history`, `clear`, `config`, `ai`, `help`, `exit`, `cd`, `pwd`

### 👁️ **Smart File Watching**

```mermaid
graph TD
    subgraph "File System Events"
        CREATE[File Created]
        MODIFY[File Modified]
        DELETE[File Deleted]
    end
    
    subgraph "Event Processing"
        FILTER[File Filter]
        DEBOUNCE[Debounce Timer]
        HASH[Diff Hash Check]
    end
    
    subgraph "Change Analysis"
        DIFF[Generate Diff]
        ANALYZE[AI Analysis]
        DECISION[Commit Decision]
    end
    
    subgraph "User Interaction"
        BUFFER[Buffer Notification]
        CONFIRM[User Confirmation]
        EXECUTE[Execute Commit]
    end
    
    CREATE --> FILTER
    MODIFY --> FILTER
    DELETE --> FILTER
    
    FILTER --> DEBOUNCE
    DEBOUNCE --> HASH
    HASH --> DIFF
    
    DIFF --> ANALYZE
    ANALYZE --> DECISION
    
    DECISION --> BUFFER
    BUFFER --> CONFIRM
    CONFIRM --> EXECUTE
    
    style CREATE fill:#e3f2fd
    style ANALYZE fill:#f3e5f5
    style EXECUTE fill:#e8f5e8
```

**Features**:
- Configurable watch patterns and intelligent ignore rules
- Debounced commits to prevent spam from rapid file changes
- Buffer notifications with cancellation options
- Support for both intelligent and periodic commit modes
- Real-time activity tracking and logging

### 📊 **Intuitive Dashboard**

```mermaid
graph LR
    subgraph "Dashboard Components"
        STATUS[Status Overview]
        CONFIG[Configuration Panel]
        ACTIVITY[Activity History]
        CONTROLS[Quick Controls]
    end
    
    subgraph "Data Sources"
        AL[Activity Logger]
        CFG[Config Manager]
        FWS[File Watcher Service]
        CS[Commit Service]
    end
    
    subgraph "User Actions"
        TOGGLE[Toggle Watching]
        SETTINGS[Open Settings]
        TERMINAL[Open Terminal]
        COMMIT[Manual Commit]
    end
    
    AL --> STATUS
    AL --> ACTIVITY
    CFG --> CONFIG
    FWS --> STATUS
    CS --> STATUS
    
    CONTROLS --> TOGGLE
    CONTROLS --> SETTINGS
    CONTROLS --> TERMINAL
    CONTROLS --> COMMIT
    
    style STATUS fill:#e3f2fd
    style ACTIVITY fill:#f3e5f5
    style CONTROLS fill:#e8f5e8
```

**Features**:
- Real-time status monitoring with live updates
- Comprehensive configuration management interface
- Activity history with detailed logging
- Quick access to all GitCue features and commands
- System health indicators and diagnostics

---

## 🎮 Quick Start Guide

### 1. **Installation**
```bash
# From VS Code Marketplace
ext install sbeeredd04.gitcue

# Or install from VSIX file
code --install-extension gitcue-0.3.8.vsix
```

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

#### **AI Terminal** (`Ctrl+Alt+T` / `Cmd+Alt+T`)
```bash
# Open AI-powered terminal
gitcue> git status
gitcue> ai  # Enter AI chat mode
ai-chat> explain git rebase vs merge
ai-chat> exit  # Exit chat mode
gitcue> exit  # Exit terminal
```

#### **Dashboard** (`Ctrl+Shift+P` → "GitCue: Open Dashboard")
Access the centralized control panel for comprehensive GitCue management.

---

## 📋 Commands & Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| **GitCue: AI Commit** | `Ctrl+Alt+C` / `Cmd+Alt+C` | Generate and preview AI commit |
| **GitCue: Open AI Terminal** | `Ctrl+Alt+T` / `Cmd+Alt+T` | Launch interactive AI terminal |
| **GitCue: Toggle Auto-Watch** | `Ctrl+Alt+W` / `Cmd+Alt+W` | Start/stop file watching |
| **GitCue: Open Dashboard** | `Ctrl+Shift+P` → "GitCue: Dashboard" | Open GitCue control panel |
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
| `cd <path>` | Change directory |
| `pwd` | Print current directory |

---

## ⚙️ Configuration

### **Core Settings**
```json
{
  "gitcue.geminiApiKey": "your-api-key-here",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.enableNotifications": true,
  "gitcue.autoWatch": false
}
```

### **File Watching Configuration**
```json
{
  "gitcue.watchPaths": ["src/**", "*.js", "*.ts", "*.py"],
  "gitcue.debounceMs": 30000,
  "gitcue.bufferTimeSeconds": 30
}
```

### **AI & Rate Limiting**
```json
{
  "gitcue.maxCallsPerMinute": 15,
  "gitcue.interactiveOnError": true,
  "gitcue.enableSuggestions": true
}
```

### **Interactive Terminal**
```json
{
  "gitcue.sessionPersistence": true,
  "gitcue.maxHistorySize": 100,
  "gitcue.terminalVerbose": false
}
```

---

## 🏗️ Source Code Architecture

The GitCue extension is organized into several key directories, each serving a specific purpose in the overall architecture:

### 📁 Source Directory Structure

```
src/
├── 📄 extension.ts           # Main extension entry point and controller
├── 📁 services/             # Core business logic services
│   ├── activityLogger.ts    # Activity tracking and state management
│   ├── commitService.ts     # AI-powered commit logic
│   ├── dashboardService.ts  # Webview dashboard management
│   ├── fileWatcherService.ts # File system monitoring
│   ├── index.ts            # Service exports
│   └── statusProvider.ts   # VS Code tree view provider
├── 📁 terminal/            # Interactive terminal implementation
│   └── interactivePty.ts  # Pseudoterminal with AI capabilities
├── 📁 test/               # Test files and test utilities
│   └── extension.test.ts  # Extension test suite
├── 📁 types/              # TypeScript type definitions
│   ├── index.ts          # Type exports
│   └── interfaces.ts     # Core interfaces and types
└── 📁 utils/              # Utility functions and helpers
    ├── ai.ts             # AI integration and rate limiting
    ├── config.ts         # Configuration management
    ├── logger.ts         # Logging and output utilities
    └── markdown.ts       # Markdown rendering utilities
```

### 🔗 Service Dependencies

```mermaid
graph TD
    subgraph "Extension Core"
        EXT[extension.ts]
    end
    
    subgraph "Services"
        AL[ActivityLogger]
        CS[CommitService]
        DS[DashboardService]
        FWS[FileWatcherService]
        SP[StatusProvider]
    end
    
    subgraph "Terminal"
        IPT[InteractivePty]
    end
    
    subgraph "Utils"
        AI[AI Utils]
        CFG[Config]
        LOG[Logger]
        MD[Markdown]
    end
    
    EXT --> AL
    EXT --> CS
    EXT --> DS
    EXT --> FWS
    EXT --> SP
    EXT --> IPT
    
    CS --> AI
    CS --> AL
    CS --> LOG
    
    FWS --> CS
    FWS --> AL
    FWS --> AI
    
    DS --> AL
    DS --> CFG
    
    IPT --> AI
    IPT --> MD
    IPT --> LOG
    
    SP --> CFG
    SP --> AL
    
    style EXT fill:#e1f5fe
    style CS fill:#f3e5f5
    style AI fill:#fff3e0
    style AL fill:#e8f5e8
```

For detailed documentation of each directory and its components, see the individual README files:

- [📁 Services](src/services/README.md) - Core business logic and service implementations
- [📁 Terminal](src/terminal/README.md) - Interactive terminal and pseudoterminal implementation
- [📁 Types](src/types/README.md) - TypeScript interfaces and type definitions
- [📁 Utils](src/utils/README.md) - Utility functions and helper modules
- [📁 Test](src/test/README.md) - Test files and testing utilities

---

## 🐛 Troubleshooting

### **Common Issues**

#### API Key Problems
```bash
# Check if API key is set
code --list-extensions | grep gitcue
# Open settings and verify gitcue.geminiApiKey

# Test API connection
# Open GitCue terminal and run: test-ai
```

#### File Watching Issues
```bash
# Check watch patterns in settings
# Verify file permissions
# Restart VS Code if needed
```

#### Terminal Issues
```bash
# Ensure workspace is open
# Check VS Code output panel for errors
# Restart extension if needed
```

### **Debug Mode**
Enable verbose logging by setting `gitcue.terminalVerbose` to `true` in VS Code settings.

---

## 🤝 Contributing

We welcome contributions to GitCue! Here's how you can help:

### **Development Setup**
```bash
# Clone the repository
git clone https://github.com/sbeeredd04/Auto-Commit.git
cd Auto-Commit/gitcue

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension for testing
npm run package
```

### **Architecture Guidelines**
- Follow the service-oriented architecture pattern
- Maintain separation of concerns between modules
- Use proper TypeScript types and interfaces
- Write comprehensive tests for new features
- Update documentation when adding new functionality

### **Pull Request Process**
1. Fork the repository
2. Create a feature branch
3. Make your changes with proper documentation
4. Test thoroughly
5. Submit a pull request with detailed description

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini AI** - For powering our intelligent features
- **VS Code Team** - For the excellent extension API
- **Open Source Community** - For inspiration and contributions

---

<div align="center">

**Made with ❤️ for Developers**

![GitCue Logo](icon.png)

**GitCue v0.3.8** - Your AI-Powered Git Assistant

[⭐ Star on GitHub](https://github.com/sbeeredd04/Auto-Commit) | [🐛 Report Issues](https://github.com/sbeeredd04/Auto-Commit/issues) | [💬 Discussions](https://github.com/sbeeredd04/Auto-Commit/discussions)

**Happy Coding! 🚀**

</div>
