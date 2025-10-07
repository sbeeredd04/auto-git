# Changelog

All notable changes to the GitCue extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-01-XX

### 🧠 Intelligent Commit System

#### Smart Activity Tracking
- **Activity Monitoring**: Tracks development activity and waits for it to settle before analyzing changes
- **Prevents Interruptions**: No commits during active development
- **Last Commit Tracking**: Enforces minimum intervals between commits
- **Diff Hashing**: Avoids duplicate AI API calls for unchanged content

#### AI-Enhanced Analysis
- **Multi-Dimensional Analysis**: 
  - Significance: LOW, MEDIUM, or HIGH impact assessment
  - Completeness: incomplete (WIP), partial (functional but missing tests/docs), or complete
  - Change Type: feature, bugfix, refactor, docs, style, test, chore, performance, security
  - Risk Level: low, medium, or high (breaking changes, architecture modifications)

#### Configurable Thresholds
- **any**: Commits all meaningful changes
- **medium**: Commits features, bug fixes, meaningful refactoring (default)
- **major**: Only commits significant features and major changes

#### Time-Based Controls
- **Activity Settle Time** (default: 5 minutes): Waits for file changes to stop before analyzing
- **Minimum Time Between Commits** (default: 30 minutes): Prevents too-frequent commits
- **Configurable Buffer Time** (default: 30 seconds): Grace period to cancel commits

#### Auto-Cancellation
- **Cancel on New Changes**: Automatically cancels pending commits when new file changes detected during buffer
- **Manual Cancellation**: Via notification, keyboard shortcut (Ctrl+Alt+X), or webview
- **Smart Buffer Management**: Enhanced notifications showing change details

### 📋 Configuration Presets

#### Balanced (Default)
- Medium threshold, 30-minute intervals, completeness required
- Best for most development workflows

#### Conservative (Production)
- Major changes only, 1-hour intervals
- Best for production applications and stable branches

#### Frequent (Experimental)
- Any meaningful change, 10-minute intervals
- Best for experimental projects and documentation work

### 📚 Documentation

#### New Guides
- **INTELLIGENT_COMMIT_GUIDE.md**: Complete user guide (10KB)
  - Configuration presets and detailed explanations
  - Troubleshooting guide and best practices
  - API reference and CLI comparison
  - System flow diagrams

- **TESTING_GUIDE_INTELLIGENT_COMMIT.md**: Testing guide (9KB)
  - 10 comprehensive test scenarios
  - Verification checklist for all features
  - Performance validation criteria
  - Success criteria and next steps

- **settings.example.json**: Example configuration (3KB)
  - All three presets with detailed comments
  - Timing values in human-readable format
  - Quick reference for threshold options

#### Updated Documentation
- **README.md**: Updated with intelligent commit highlights and guide links
- Inline code documentation throughout implementation

### 🔧 Technical Implementation

#### Core Changes
- **Configuration System** (`interfaces.ts`, `config.ts`):
  - Added `IntelligentCommitConfig` interface with 6 configurable settings
  - Integrated into main `GitCueConfig` with appropriate defaults
  - Added `getIntelligentCommitConfig()` helper method

- **File Watcher Service** (`fileWatcherService.ts`):
  - Activity tracking: `lastCommitTime`, `activityCount`, `recentActivity`
  - Implemented `handleIntelligentModeActivity()` with proper debouncing
  - Minimum time between commits enforcement
  - Cancel-on-new-changes during buffer period

- **Commit Service** (`commitService.ts`):
  - `commitWithIntelligentAnalysis()` method for threshold-based commits
  - `analyzeChangesWithIntelligentCriteria()` for enhanced AI analysis
  - Enhanced buffer notification with analysis details
  - Improved user feedback with meaningful messages

- **AI Integration** (`ai.ts`):
  - Extended `CommitDecision` interface with completeness, changeType, riskLevel
  - `makeCommitDecisionWithAI()` accepts threshold and completeness parameters
  - Threshold checking logic with proper significance mapping
  - Enhanced AI prompts with detailed analysis criteria

- **Configuration Schema** (`package.json`):
  - 6 new VS Code settings for intelligent commit control
  - Clear descriptions for each setting
  - Defaults matching proven CLI behavior

### 🛠️ Quality & Testing
- Build Status: ✅ Successful
- TypeScript compilation passes
- Tests updated with intelligent commit configuration
- No breaking changes to existing functionality

### 🔄 Migration Notes
- **Backward Compatible**: Existing configurations continue to work
- **Automatic Benefits**: Users on "intelligent" mode get new features with defaults
- **Easy Customization**: VS Code Settings UI or example configuration file
- **Opt-out Available**: Can switch to "periodic" mode if needed

### 📈 Statistics
- 11 files modified
- 1,154+ lines added
- Comprehensive documentation and testing guides

## [4.0.0] - 2024-12-19

### 🎨 Enhanced Interactive Sidebar
- **Enhanced Dashboard Provider**: Redesigned with actionable buttons and better space utilization
- **Smart Status Cards**: Real-time GitCue status, file changes, and repository information
- **One-Click Actions**: Direct commit, terminal access, and configuration from sidebar
- **Professional UI**: Modern interface with proper icons, tooltips, and organized sections
- **Better Space Utilization**: Interactive elements instead of plain text dropdowns

### 🔧 Improved User Experience
- **Intuitive Navigation**: Quick access to all GitCue features through sidebar
- **Visual Feedback**: Clear status indicators and enhanced tooltips
- **Responsive Design**: Better organization with collapsible sections
- **Interactive Elements**: Clickable items for immediate actions

### 📊 Smart Repository Management
- **Repository Info Card**: Branch details, commit counts, and change status with actions
- **Configuration Panel**: Easy access to all settings with inline configuration actions
- **Activity Summary**: Enhanced activity tracking with categorized activities and visual indicators

### 🚀 Activity Feed Enhancements
- **Enhanced Activity Provider**: Improved activity tracking with visual indicators and commands
- **Activity Summary**: Session overview with change counts, commits, and errors
- **Interactive Activities**: Clickable activity items with relevant actions
- **Better Formatting**: Enhanced message formatting with emojis and status indicators

### ⚙️ Settings Provider Improvements
- **Quick Setup Panel**: Essential configuration with visual status indicators
- **Advanced Settings**: Fine-tuned behavior controls with easy access
- **Management Tools**: Configuration management with export/import capabilities
- **Documentation Links**: Direct access to help and guides

### 🐛 Bug Fixes
- **Constructor Parameter Order**: Fixed parameter order issues in tree item constructors
- **Type Safety**: Improved TypeScript type safety for all tree providers
- **Command Registration**: Better error handling for command registration
- **View Registration**: Improved timing for view registration to prevent initialization errors

### 🎯 Technical Improvements
- **Code Organization**: Better separation of concerns in provider classes
- **Error Handling**: Enhanced error handling throughout the extension
- **Performance**: Optimized tree data provider refresh mechanisms
- **Maintainability**: Improved code structure for easier future enhancements

---

## [3.10.0] - 2024-12-15

### Added
- Intelligent commit mode with AI-driven decisions
- Function calling with structured AI analysis
- 30-second buffer for commit review
- Smart significance detection
- Enhanced view registration with timing fixes

### Fixed
- View registration timing issues
- Sidebar provider initialization problems
- Extension activation errors

### Changed
- Improved extension activation process
- Better error handling during startup
- Enhanced logging and debugging capabilities

---

## [3.9.0] - 2024-12-10

### Added
- Smart API optimization with diff hash tracking
- Rate limiting with sliding window protection
- Push control system for local development
- Enhanced interactive terminal session

### Fixed
- API redundancy issues
- Rate limiting edge cases
- Push control configuration

### Changed
- Improved API efficiency by 80%
- Better debug logging
- Enhanced configuration management

---

## [3.8.0] - 2024-12-05

### Added
- AI-powered terminal with chat capabilities
- Real-time error analysis
- Interactive command suggestions
- Enhanced activity logging

### Fixed
- Terminal rendering issues
- Chat response formatting
- Activity tracking accuracy

### Changed
- Improved terminal user experience
- Better AI integration
- Enhanced logging system

---

## [3.7.0] - 2024-11-30

### Added
- Basic sidebar providers
- Tree view for GitCue status
- Simple activity tracking
- Configuration management

### Fixed
- Initial view registration issues
- Basic provider functionality
- Extension packaging

### Changed
- Improved extension structure
- Better service organization
- Enhanced configuration system

---

## [3.6.0] - 2024-11-25

### Added
- Initial VS Code extension
- Basic commit automation
- Simple file watching
- Core AI integration

### Fixed
- Initial setup issues
- Basic functionality bugs
- Extension initialization

### Changed
- Established extension architecture
- Basic service implementation
- Initial UI components

---

## [Unreleased]

### Planned
- Enhanced AI terminal with persistent sessions
- Advanced commit templates
- Git workflow automation
- Team collaboration features
- Custom AI model support

---

## Version History

| Version | Release Date | Major Features |
|---------|--------------|----------------|
| 4.0.0   | 2024-12-19   | Enhanced Interactive Sidebar, Professional UI |
| 3.10.0  | 2024-12-15   | Intelligent Commit Mode, Function Calling |
| 3.9.0   | 2024-12-10   | Smart API Optimization, Push Control |
| 3.8.0   | 2024-12-05   | AI Terminal, Chat Capabilities |
| 3.7.0   | 2024-11-30   | Basic Sidebar Providers |
| 3.6.0   | 2024-11-25   | Initial VS Code Extension |

---

## Migration Guide

### From v3.x to v4.0.0

**New Features:**
- Enhanced interactive sidebar with better space utilization
- One-click actions throughout the interface
- Professional UI with modern design
- Smart status cards and repository management

**Breaking Changes:**
- None - fully backward compatible

**Recommended Actions:**
1. Update to v4.0.0 for enhanced user experience
2. Explore the new interactive sidebar features
3. Use one-click actions for faster workflow
4. Take advantage of the improved repository management

---

## Changelog Format

This changelog follows the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

## Semantic Versioning

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** version when you make incompatible API changes
- **MINOR** version when you add functionality in a backward compatible manner
- **PATCH** version when you make backward compatible bug fixes 