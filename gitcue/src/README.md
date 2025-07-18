# GitCue Source Code Structure

This document explains the reorganized and structured source code architecture for GitCue v0.3.8.

## 📁 Directory Structure

```
src/
├── extension.ts              # Main extension entry point (314 lines)
├── types/
│   ├── interfaces.ts         # Shared TypeScript interfaces (62 lines)
│   └── index.ts              # Type exports
├── services/
│   ├── statusProvider.ts     # VS Code tree view status provider (96 lines)
│   ├── activityLogger.ts     # Activity tracking and logging (127 lines)
│   ├── commitService.ts      # All commit-related functionality (356 lines)
│   ├── dashboardService.ts   # UI and HTML generation (436 lines)
│   ├── fileWatcherService.ts # File watching and change detection (283 lines)
│   └── index.ts              # Service exports
├── utils/
│   ├── ai.ts                 # AI integration utilities
│   ├── config.ts             # Configuration management
│   ├── logger.ts             # Logging utilities
│   └── markdown.ts           # Markdown rendering
└── terminal/
    └── interactivePty.ts     # Interactive terminal functionality
```

## 🚀 Restructuring Benefits

### Before Restructuring
- **Single file**: 2,751 lines of code
- **Poor maintainability**: All logic mixed together
- **Difficult testing**: Tightly coupled components
- **Hard to understand**: No clear separation of concerns

### After Restructuring
- **Main file**: 314 lines (88% reduction!)
- **5 focused services**: Each handling specific responsibilities
- **Clear interfaces**: Shared types in dedicated files
- **Better testability**: Singleton services with dependency injection
- **Improved maintainability**: Single responsibility principle

## 🏗️ Architecture Overview

### Main Extension (`extension.ts`)
- **Purpose**: Orchestrates services and handles VS Code integration
- **Responsibilities**:
  - Extension lifecycle (activate/deactivate)
  - Command registration
  - Service coordination
  - Status bar management

### Services Layer

#### ActivityLogger Service
- **Purpose**: Centralized activity tracking and state management
- **Features**:
  - Activity history with 50-entry limit
  - Watch status management
  - Real-time state updates
  - Callback-based notifications

#### CommitService
- **Purpose**: Handles all Git commit operations
- **Features**:
  - AI-powered commit message generation
  - Commit preview functionality
  - Buffer notifications with countdown
  - Retry logic with exponential backoff
  - Smart commit decision making

#### DashboardService
- **Purpose**: Manages all UI and webview functionality
- **Features**:
  - Dashboard HTML generation
  - Commit preview interface
  - Buffer notification UI
  - Message handling and state updates

#### FileWatcherService
- **Purpose**: File system monitoring and change detection
- **Features**:
  - Intelligent file filtering
  - Git-aware change tracking
  - Debounced change processing
  - Duplicate detection with diff hashing

#### StatusProvider Service
- **Purpose**: VS Code tree view integration
- **Features**:
  - Configuration status display
  - Real-time status updates
  - Icon and tooltip management

## 🔄 Service Communication

```
Extension
    ↓
┌─────────────────┐
│  ActivityLogger │ ←──── All services update activity
│   (Singleton)   │
└─────────────────┘
    ↓ (callbacks)
┌─────────────────┐
│  DashboardService│ ←──── Updates UI state
└─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│ FileWatcherService│ ←→ │  CommitService  │
└─────────────────┘    └─────────────────┘
    ↓                       ↓
┌─────────────────┐    ┌─────────────────┐
│ ActivityLogger  │    │ DashboardService│
└─────────────────┘    └─────────────────┘
```

## 🎯 Key Improvements

### 1. **Separation of Concerns**
Each service has a single, well-defined responsibility:
- ActivityLogger: State management
- CommitService: Git operations
- DashboardService: UI rendering
- FileWatcherService: File monitoring
- StatusProvider: VS Code integration

### 2. **Singleton Pattern**
Services use singleton pattern for:
- Consistent state management
- Memory efficiency
- Easy dependency injection

### 3. **Type Safety**
Shared interfaces ensure:
- Consistent data structures
- Better IntelliSense support
- Compile-time error checking

### 4. **Testability**
Each service can be tested independently:
- Mock dependencies easily
- Unit test specific functionality
- Integration test service interactions

### 5. **Maintainability**
- **Small files**: Each under 500 lines
- **Clear naming**: Self-documenting code
- **Focused modules**: Easy to understand and modify
- **Loose coupling**: Services interact through well-defined interfaces

## 📊 Performance Impact

### Bundle Analysis
- **Total modules**: 1,678 lines organized across 7 focused files
- **Main extension**: Reduced from 2,751 to 314 lines
- **Compilation**: Successful with webpack optimization
- **Memory**: More efficient with singleton services

### Runtime Benefits
- **Faster startup**: Reduced main file complexity
- **Better caching**: Service instances reused
- **Lower memory**: Shared state management
- **Improved reliability**: Better error isolation

## 🔧 Development Workflow

### Adding New Features
1. Identify the appropriate service
2. Add functionality to the relevant service
3. Update interfaces if needed
4. Test the specific service
5. Update main extension if needed

### Modifying Existing Features
1. Locate the specific service
2. Make focused changes
3. Update related interfaces
4. Test the modified service
5. Verify integration points

This restructured architecture provides a solid foundation for future development and maintenance of the GitCue extension. 