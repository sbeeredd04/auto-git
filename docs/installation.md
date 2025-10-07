# Installation Guide

This guide will help you install Auto-Git CLI and/or the GitCue VS Code extension.

## Prerequisites

- Node.js >= 18.0.0
- Git installed and configured
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## CLI Installation

### Using npm (Recommended)

```bash
npm install -g @sbeeredd04/auto-git
```

### Using yarn

```bash
yarn global add @sbeeredd04/auto-git
```

### Verify Installation

```bash
auto-git --version
```

## VS Code Extension Installation

### Method 1: VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Cmd/Ctrl+Shift+X`)
3. Search for "GitCue"
4. Click "Install"

### Method 2: Command Line

```bash
code --install-extension sbeeredd04.gitcue
```

### Method 3: Manual Installation

1. Download the `.vsix` file from [releases](https://github.com/sbeeredd04/auto-git/releases)
2. In VS Code: Extensions → `...` menu → Install from VSIX

## Configuration

### Set Up API Key

#### CLI

Option 1: Environment Variable
```bash
export GEMINI_API_KEY="your-api-key-here"
```

Option 2: Configuration File
```bash
auto-git config
# Follow prompts to enter API key
```

#### VS Code Extension

1. Open Settings (`Cmd/Ctrl+,`)
2. Search for "GitCue API Key"
3. Enter your Gemini API key

### Verify Configuration

#### CLI
```bash
auto-git config
```

#### VS Code
Open Command Palette (`Cmd/Ctrl+Shift+P`) → "GitCue: Dashboard"

## Next Steps

- [Quick Start Guide](./quickstart.md)
- [Configuration Reference](./configuration.md)
- [Intelligent Commits](./features/intelligent-commits.md)
