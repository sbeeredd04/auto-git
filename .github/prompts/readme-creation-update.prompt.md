# README Creation and Update Prompt

## Context

README files are the first point of contact for users and contributors. The Auto-Commit repository contains multiple README files:

- Root `/README.md`: Main documentation for Auto-Git CLI (2573 lines, comprehensive)
- `/gitcue/README.md`: GitCue VS Code Extension documentation
- Various module READMEs: `/lib/`, `/gitcue/src/services/`, `/gitcue/src/utils/`, etc.

READMEs must be clear, comprehensive, and well-structured with proper Markdown formatting, no emojis, and focus on technical accuracy.

## Objective

Create and maintain high-quality README files that effectively communicate project features, usage, architecture, and contribution guidelines to users and developers.

## README Structure

### Main Repository README

**Essential Sections (in order):**

1. **Title and Description**
2. **Badges** (version, license, build status)
3. **Features**
4. **Architecture Overview**
5. **Installation**
6. **Quick Start**
7. **Usage**
8. **Configuration**
9. **Commands Reference**
10. **API Documentation**
11. **Contributing**
12. **License**
13. **Support**

### Module/Service README

**Essential Sections:**

1. **Module Name and Purpose**
2. **Exports**
3. **Usage Examples**
4. **API Reference**
5. **Dependencies**
6. **Related Modules**

## Requirements

### Main README Template

```markdown
# Auto-Commit

**Intelligent Git automation powered by Google Gemini AI**

A comprehensive solution for automated, AI-powered Git commits with two components:
- **Auto-Git CLI**: Command-line tool for intelligent commit automation
- **GitCue Extension**: VS Code extension for seamless integration

Version: 4.0.0
License: MIT
Node.js: >= 18.0.0

## Features

### Auto-Git CLI

**Intelligent Commit Mode:**
- AI-powered analysis of code changes
- Automatic commit when significant changes detected
- Configurable thresholds (any, medium, major)
- Activity settling to avoid premature commits
- Cancellation on new changes during analysis

**Periodic Commit Mode:**
- Time-based automatic commits
- Configurable intervals
- Consistent commit patterns

**AI-Powered Commit Messages:**
- Google Gemini 2.0 Flash integration
- Conventional commit format
- Context-aware descriptions
- Structured analysis using function calling

**File Watching:**
- Real-time file system monitoring
- Configurable watch patterns
- Ignore patterns for node_modules, .git, etc.
- Debouncing to prevent duplicate commits
- Diff hash optimization (80% API call reduction)

**Rate Limiting:**
- 15 calls per minute default
- Sliding window algorithm
- Configurable limits
- Automatic throttling

**Interactive Features:**
- REPL mode with command suggestions
- Error recovery workflows
- Keyboard controls (Ctrl+P pause, Ctrl+X cancel)
- Verbose logging option

### GitCue Extension

**VS Code Integration:**
- Sidebar with commit history
- Interactive terminal
- Webview dashboard
- Status bar indicators

**AI Commit Features:**
- Preview before commit
- Buffered commits
- Direct AI commit
- Manual commit with assistance

**Session Management:**
- Persistent session history
- Activity logging
- Statistics tracking
- Export capabilities

## Architecture

[Detailed architecture diagram with Mermaid]

### Components

**CLI Components:**
- `lib/gemini.js`: AI integration
- `lib/watcher.js`: File watching
- `lib/git.js`: Git operations
- `lib/config.js`: Configuration management
- `lib/rateLimiter.js`: API rate limiting
- `lib/repl.js`: Interactive mode

**Extension Components:**
- `src/extension.ts`: Extension controller
- `src/services/commitService.ts`: Commit operations
- `src/services/fileWatcherService.ts`: File watching
- `src/services/dashboardService.ts`: Dashboard management
- `src/services/activityLogger.ts`: Activity tracking
- `src/terminal/`: Interactive terminal implementation

## Installation

### Auto-Git CLI

**NPM (Global):**
```bash
npm install -g auto-git-commit
```

**From Source:**
```bash
git clone https://github.com/yourusername/auto-commit.git
cd auto-commit
npm install
npm link
```

**Verify Installation:**
```bash
auto-git --version
```

### GitCue Extension

**VS Code Marketplace:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "GitCue"
4. Click Install

**From VSIX:**
```bash
code --install-extension gitcue-0.4.0.vsix
```

## Quick Start

### CLI Quick Start

**1. Set API Key:**
```bash
export GEMINI_API_KEY="your-api-key-here"
```

**2. Initialize in Repository:**
```bash
cd your-git-repo
auto-git init
```

**3. Start Watching:**
```bash
# Intelligent mode (recommended)
auto-git watch --mode intelligent

# Periodic mode
auto-git watch --mode periodic --interval 5
```

**4. Make Changes:**
```bash
# Edit files
echo "console.log('hello');" > test.js

# Auto-Git will automatically commit when appropriate
```

### Extension Quick Start

**1. Configure API Key:**
```json
{
  "gitcue.geminiApiKey": "your-api-key-here"
}
```

**2. Open GitCue Sidebar:**
- Click GitCue icon in Activity Bar
- View commit history and stats

**3. Use Commands:**
- `Ctrl+Shift+P` → "GitCue: Start AI Commit"
- Make changes to files
- Preview and approve commit

## Usage

### CLI Commands

**watch**
```bash
auto-git watch [options]

Options:
  --mode <mode>           Commit mode: intelligent or periodic (default: periodic)
  --interval <minutes>    Commit interval in minutes for periodic mode (default: 5)
  --paths <patterns>      File patterns to watch (default: "**/*")
  --no-push              Disable automatic push
  --verbose              Enable verbose logging

Examples:
  auto-git watch --mode intelligent --verbose
  auto-git watch --mode periodic --interval 10 --no-push
  auto-git watch --paths "src/**/*.js,src/**/*.ts"
```

**commit**
```bash
auto-git commit [options]

Options:
  --message <msg>        Custom commit message
  --no-push             Skip push after commit
  --preview             Show preview before committing

Examples:
  auto-git commit
  auto-git commit --message "feat: add new feature"
  auto-git commit --preview
```

**status**
```bash
auto-git status

Displays:
- Current configuration
- API usage statistics
- Recent commit history
- Repository status
```

**interactive**
```bash
auto-git interactive

Starts REPL mode with commands:
- commit: Create AI commit
- status: Show status
- config: Show configuration
- help: Show commands
- exit: Quit
```

### Extension Commands

**Available Commands:**
- `GitCue: Start AI Commit` - Begin AI-powered commit
- `GitCue: Commit with Preview` - Preview before commit
- `GitCue: Commit with Buffer` - Buffer and commit
- `GitCue: Start File Watcher` - Start watching files
- `GitCue: Stop File Watcher` - Stop watching
- `GitCue: Show Dashboard` - Open dashboard
- `GitCue: Open Interactive Terminal` - Launch terminal
- `GitCue: Export Session` - Export activity log
- `GitCue: Clear History` - Clear commit history

## Configuration

### CLI Configuration File

**Location:** `~/.auto-gitrc.json`

**Example:**
```json
{
  "apiKey": "your-api-key",
  "commitMode": "intelligent",
  "noPush": false,
  "debounceMs": 30000,
  "rateLimiting": {
    "maxCallsPerMinute": 15,
    "bufferTimeSeconds": 30
  },
  "intelligentCommit": {
    "commitThreshold": "medium",
    "activitySettleTime": 120000,
    "minTimeBetweenCommits": 300000,
    "cancelOnNewChanges": true
  },
  "watchOptions": {
    "ignored": [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**"
    ]
  }
}
```

### Extension Configuration

**Settings:**
```json
{
  "gitcue.geminiApiKey": "your-api-key",
  "gitcue.commitMode": "intelligent",
  "gitcue.autoPush": true,
  "gitcue.debounceMs": 30000,
  "gitcue.maxCallsPerMinute": 15,
  "gitcue.enableNotifications": true,
  "gitcue.terminalVerbose": false
}
```

## API Reference

[Detailed API documentation for all modules]

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)

## Support

- Issues: https://github.com/yourusername/auto-commit/issues
- Discussions: https://github.com/yourusername/auto-commit/discussions
- Documentation: https://github.com/yourusername/auto-commit/wiki
```

### Module README Template

```markdown
# Module Name

**Purpose:** [One-line description]

Located in: `/path/to/module.js`

## Exports

### Functions

#### functionName

```javascript
functionName(param1, param2)
```

**Description:** [What it does]

**Parameters:**
- `param1` (Type): Description
- `param2` (Type): Description

**Returns:** Type - Description

**Throws:** Error conditions

**Example:**
```javascript
const result = functionName('value1', 'value2');
```

### Classes

#### ClassName

```javascript
new ClassName(options)
```

**Description:** [What it does]

**Constructor Parameters:**
- `options` (Object): Configuration options

**Methods:**
- `methodName()`: Description

**Example:**
```javascript
const instance = new ClassName({ option: value });
instance.methodName();
```

## Usage

[Detailed usage examples]

## Dependencies

- `dependency1`: Purpose
- `dependency2`: Purpose

## Related Modules

- `module1`: How they interact
- `module2`: How they interact

## Notes

[Important implementation details]
```

## Guidelines

### Writing Style

**Clear and Concise:**
```markdown
BAD:
This module is responsible for the handling of various different types of 
configuration-related tasks and operations that might be needed.

GOOD:
Manages configuration loading, validation, and updates.
```

**Technical Accuracy:**
```markdown
BAD:
Uses AI to make commits better.

GOOD:
Integrates Google Gemini 2.0 Flash API to generate conventional commit 
messages based on git diff analysis using structured function calling.
```

**Actionable Instructions:**
```markdown
BAD:
Set up the API key.

GOOD:
Set your Gemini API key:
export GEMINI_API_KEY="your-key-here"

Or add to ~/.auto-gitrc.json:
{
  "apiKey": "your-key-here"
}
```

### Formatting Standards

**Code Blocks:**
```markdown
Use language-specific syntax highlighting:

```bash
npm install auto-git-commit
```

```javascript
const config = getConfig();
```

```json
{
  "setting": "value"
}
```
```

**Lists:**
```markdown
Unordered lists for non-sequential items:
- Feature 1
- Feature 2
- Feature 3

Ordered lists for sequential steps:
1. First step
2. Second step
3. Third step
```

**Tables:**
```markdown
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| apiKey | string | "" | Gemini API key |
| mode | string | "periodic" | Commit mode |
```

**Links:**
```markdown
Reference other docs:
See [Configuration Guide](docs/config.md) for details.

External links:
Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
```

## Output Format

### README Update

When updating README, provide:

```markdown
## README Update

### Files Modified
- `/README.md`: Main documentation
- `/gitcue/README.md`: Extension documentation

### Changes Made

#### Added
- New section: "Performance Optimization"
- Command reference for `auto-git analyze`
- Configuration example for intelligent mode

#### Updated
- Installation instructions with new requirements
- Feature list with diff hash optimization
- Architecture diagram with new components

#### Removed
- Deprecated commands section
- Old configuration format

### Validation
- [x] All links work
- [x] Code examples tested
- [x] Formatting is correct
- [x] No emojis used
- [x] Technical accuracy verified
- [x] Consistent with other docs
```

## Best Practices

### README Maintenance

1. **Keep Updated**: Update README with code changes
2. **Test Examples**: Ensure all code examples work
3. **Check Links**: Verify all links are valid
4. **Version Info**: Keep version numbers current
5. **Accurate Badges**: Update status badges
6. **Clear Navigation**: Use table of contents for long READMEs
7. **Visual Aids**: Include diagrams where helpful (Mermaid)
8. **Accessibility**: Use proper heading hierarchy

### Common Mistakes

**Avoid:**
- Emojis (strictly prohibited)
- Vague descriptions
- Outdated information
- Broken links
- Untested code examples
- Missing configuration details
- Unclear prerequisites
- No troubleshooting section

## Validation

### README Quality Checklist

- [ ] Title and description clear
- [ ] Features accurately listed
- [ ] Installation steps complete
- [ ] Usage examples work
- [ ] Configuration documented
- [ ] All commands listed
- [ ] API reference complete
- [ ] Contributing guide linked
- [ ] License specified
- [ ] Support channels listed
- [ ] No emojis present
- [ ] All links work
- [ ] Code examples tested
- [ ] Formatting consistent
- [ ] Table of contents present (if long)
- [ ] Screenshots/diagrams helpful

## Notes

- Main README should be comprehensive but scannable
- Module READMEs should be concise and focused
- Use Mermaid diagrams for architecture visualization
- Keep examples simple but realistic
- Update CHANGELOG when updating README
- Cross-reference related documentation
- Maintain consistency across all READMEs
