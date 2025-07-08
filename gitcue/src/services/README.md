# 🔧 Services Directory

The Services directory contains the core business logic of GitCue, implementing the main functionality as modular, reusable services. Each service has a specific responsibility and follows the singleton pattern for global state management.

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Service Layer Architecture"
        subgraph "Core Services"
            CS[CommitService<br/>AI-Powered Commits]
            FWS[FileWatcherService<br/>File Monitoring]
            AL[ActivityLogger<br/>State Management]
        end
        
        subgraph "UI Services"
            DS[DashboardService<br/>Webview Management]
            SP[StatusProvider<br/>Tree View]
        end
        
        subgraph "External Integrations"
            AI[AI Utils]
            GIT[Git CLI]
            VSCODE[VS Code API]
            FS[File System]
        end
    end
    
    CS --> AI
    CS --> GIT
    CS --> AL
    
    FWS --> CS
    FWS --> FS
    FWS --> AL
    
    DS --> AL
    DS --> VSCODE
    
    SP --> AL
    SP --> VSCODE
    
    AL --> DS
    AL --> SP
    
    style CS fill:#f3e5f5
    style FWS fill:#e8f5e8
    style AL fill:#fff3e0
    style DS fill:#e3f2fd
```

## 📋 Service Overview

| Service | Purpose | Key Features |
|---------|---------|--------------|
| **CommitService** | AI-powered commit generation and execution | Intelligent analysis, message generation, buffer notifications |
| **FileWatcherService** | File system monitoring and change detection | Debounced watching, Git diff analysis, intelligent filtering |
| **ActivityLogger** | Centralized state and activity tracking | Real-time logging, state management, dashboard updates |
| **DashboardService** | Webview UI management | Dashboard panels, commit previews, buffer notifications |
| **StatusProvider** | VS Code tree view integration | Status display, configuration overview, quick actions |

---

## 🤖 CommitService

**Purpose**: Manages AI-powered commit generation, analysis, and execution with intelligent decision-making capabilities.

### 🔄 Service Architecture

```mermaid
sequenceDiagram
    participant FS as FileWatcherService
    participant CS as CommitService
    participant AI as AI Utils
    participant Gemini as Gemini AI
    participant Git as Git CLI
    participant User as User Interface
    
    FS->>CS: Request commit analysis
    CS->>AI: Analyze git diff
    AI->>Gemini: Send analysis request
    Gemini-->>AI: Return commit decision
    AI-->>CS: Decision + reasoning
    
    alt Should Commit
        CS->>User: Show buffer notification
        User->>CS: Confirm/Cancel
        alt Confirmed
            CS->>Git: Execute commit
            Git-->>CS: Commit result
            CS->>FS: Update activity log
        end
    else Skip Commit
        CS->>FS: Log skip reason
    end
```

### 🎯 Key Features

#### **Intelligent Commit Analysis**
```typescript
// AI-driven commit decision making
async analyzeChangesWithAI(workspacePath: string): Promise<{
  shouldCommit: boolean;
  reason: string;
  significance: string;
}> {
  // Analyzes git diff using Gemini AI
  // Returns structured decision with reasoning
}
```

#### **Commit Message Generation**
```typescript
// Generate contextual commit messages
async generateCommitMessage(workspacePath: string, config: GitCueConfig): Promise<string> {
  // Uses AI to create meaningful commit messages
  // Follows conventional commit standards
}
```

#### **Buffer Notification System**
- **30-second buffer** for user review and cancellation
- **Real-time countdown** with cancel options
- **Webview integration** for rich UI experience

### 🔧 Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `commitWithPreview()` | Generate commit with user preview | `workspacePath`, `config` |
| `commitWithBuffer()` | Execute commit with buffer period | `workspacePath`, `config` |
| `analyzeChangesWithAI()` | AI analysis of git changes | `workspacePath` |
| `generateCommitMessage()` | Generate AI commit message | `workspacePath`, `config` |
| `cancelBufferedCommit()` | Cancel pending commit | None |

---

## 👁️ FileWatcherService

**Purpose**: Monitors file system changes and orchestrates intelligent commit decisions based on detected modifications.

### 🔄 File Watching Flow

```mermaid
flowchart TD
    A[File System Change] --> B[File Filter Check]
    B --> C{Should Monitor?}
    C -->|No| D[Ignore Change]
    C -->|Yes| E[Debounce Timer]
    
    E --> F[Generate Git Diff]
    F --> G[Create Diff Hash]
    G --> H{Hash Changed?}
    
    H -->|No| I[Skip - No Real Changes]
    H -->|Yes| J{Commit Mode?}
    
    J -->|Intelligent| K[AI Analysis]
    J -->|Periodic| L[Generate Message]
    
    K --> M{Should Commit?}
    M -->|Yes| N[Trigger Commit Service]
    M -->|No| O[Log Skip Reason]
    
    L --> N
    N --> P[Update Activity Log]
    O --> P
    I --> Q[Continue Monitoring]
    P --> Q
    
    style A fill:#e3f2fd
    style K fill:#f3e5f5
    style N fill:#e8f5e8
```

### 🎯 Key Features

#### **Smart File Filtering**
```typescript
private shouldIgnoreFile(fileName: string, filePath: string): boolean {
  // Filters out Git internal files, node_modules, build artifacts
  // Configurable ignore patterns
  // Smart Git file detection (index.lock, etc.)
}
```

#### **Debounced Change Detection**
- **Configurable debounce timing** (default: 30 seconds)
- **Change aggregation** to prevent spam commits
- **Diff hash comparison** to detect real changes

#### **Intelligent Git Integration**
```typescript
private createDiffHash(diffText: string): string | null {
  // Creates hash of git diff content
  // Prevents redundant AI calls for unchanged content
  // Optimizes API usage and rate limiting
}
```

### 🔧 Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `startWatching()` | Begin file system monitoring | None |
| `stopWatching()` | Stop file system monitoring | None |
| `handleFileChange()` | Process detected file changes | `uri`, `changeTracker`, `lastDiffHash` |
| `shouldIgnoreFile()` | Check if file should be ignored | `fileName`, `filePath` |
| `createDiffHash()` | Generate hash of git diff | `diffText` |

---

## 📊 ActivityLogger

**Purpose**: Centralized state management and activity tracking system that maintains real-time status and coordinates between services.

### 🔄 State Management Architecture

```mermaid
graph LR
    subgraph "State Sources"
        FWS[FileWatcherService]
        CS[CommitService]
        USER[User Actions]
        SYSTEM[System Events]
    end
    
    subgraph "ActivityLogger Core"
        STATE[Watch Status]
        HISTORY[Activity History]
        CALLBACKS[Update Callbacks]
    end
    
    subgraph "State Consumers"
        DASH[Dashboard]
        STATUS[Status Bar]
        TREE[Tree View]
        WEBVIEW[Webviews]
    end
    
    FWS --> STATE
    CS --> STATE
    USER --> STATE
    SYSTEM --> STATE
    
    STATE --> HISTORY
    HISTORY --> CALLBACKS
    CALLBACKS --> DASH
    CALLBACKS --> STATUS
    CALLBACKS --> TREE
    CALLBACKS --> WEBVIEW
    
    style STATE fill:#fff3e0
    style HISTORY fill:#e8f5e8
    style CALLBACKS fill:#f3e5f5
```

### 🎯 Key Features

#### **Real-Time State Tracking**
```typescript
interface WatchStatus {
  isWatching: boolean;
  filesChanged: number;
  lastChange: string;
  lastCommit: string;
  pendingCommit: boolean;
  aiAnalysisInProgress: boolean;
  activityHistory: ActivityLogEntry[];
  changedFiles: Set<string>;
}
```

#### **Activity History Management**
```typescript
interface ActivityLogEntry {
  timestamp: string;
  type: 'file_change' | 'ai_analysis' | 'commit' | 'error' | 'watch_start' | 'watch_stop';
  message: string;
  details?: string;
}
```

#### **Observer Pattern Implementation**
```typescript
setUpdateCallback(callback: () => void): void {
  // Registers callbacks for real-time UI updates
  // Notifies all subscribers when state changes
}
```

### 🔧 Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `updateWatchStatus()` | Update current watch state | `updates: Partial<WatchStatus>` |
| `logActivity()` | Log new activity entry | `type`, `message`, `details?` |
| `setFileChanged()` | Record file change event | `fileName`, `filePath` |
| `setCommitCompleted()` | Record successful commit | `message`, `shouldPush` |
| `setPendingCommit()` | Update pending commit status | `pending: boolean` |
| `setAiAnalysisInProgress()` | Update AI analysis status | `inProgress: boolean` |

---

## 🖥️ DashboardService

**Purpose**: Manages webview panels for dashboard, commit previews, and buffer notifications with rich HTML interfaces.

### 🔄 Webview Architecture

```mermaid
graph TB
    subgraph "Webview Types"
        DASH[Dashboard Panel]
        PREVIEW[Commit Preview]
        BUFFER[Buffer Notification]
    end
    
    subgraph "Data Sources"
        AL[ActivityLogger]
        CFG[Config Manager]
        CS[CommitService]
    end
    
    subgraph "UI Components"
        HTML[HTML Generation]
        CSS[Styling]
        JS[JavaScript Logic]
        EVENTS[Event Handling]
    end
    
    AL --> DASH
    CFG --> DASH
    CS --> PREVIEW
    CS --> BUFFER
    
    DASH --> HTML
    PREVIEW --> HTML
    BUFFER --> HTML
    
    HTML --> CSS
    CSS --> JS
    JS --> EVENTS
    
    style DASH fill:#e3f2fd
    style PREVIEW fill:#f3e5f5
    style BUFFER fill:#fff3e0
```

### 🎯 Key Features

#### **Dashboard Panel**
- **Real-time status monitoring** with live updates
- **Configuration management** interface
- **Activity history** with detailed logging
- **Quick action buttons** for common tasks

#### **Commit Preview**
- **AI-generated message preview** with edit capabilities
- **Git status display** showing staged/unstaged changes
- **One-click commit execution** with confirmation
- **Push options** and configuration

#### **Buffer Notification**
- **Countdown timer** with visual progress
- **Cancel functionality** with immediate feedback
- **Commit details** and reasoning display
- **Auto-dismiss** after timeout

### 🔧 Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `createDashboard()` | Create main dashboard panel | `onMessage` callback |
| `updateDashboards()` | Update all dashboard instances | `state: DashboardState` |
| `createCommitPreview()` | Create commit preview panel | `options`, `onMessage` |
| `createBufferNotification()` | Create buffer notification | `options` |

---

## 🌳 StatusProvider

**Purpose**: Implements VS Code tree view provider for GitCue status display in the sidebar with hierarchical information.

### 🔄 Tree View Structure

```mermaid
graph TD
    ROOT[GitCue Status] --> WATCH[Watching Status]
    ROOT --> CONFIG[Configuration]
    ROOT --> ACTIVITY[Recent Activity]
    
    WATCH --> ENABLED{Is Watching?}
    ENABLED -->|Yes| FILES[Files Changed: X]
    ENABLED -->|No| STOPPED[Stopped]
    
    CONFIG --> MODE[Commit Mode]
    CONFIG --> API[API Status]
    CONFIG --> PUSH[Auto Push]
    
    ACTIVITY --> LAST_CHANGE[Last Change]
    ACTIVITY --> LAST_COMMIT[Last Commit]
    ACTIVITY --> PENDING[Pending Commits]
    
    style ROOT fill:#e3f2fd
    style WATCH fill:#e8f5e8
    style CONFIG fill:#f3e5f5
    style ACTIVITY fill:#fff3e0
```

### 🎯 Key Features

#### **Hierarchical Status Display**
```typescript
getChildren(element?: GitCueStatusItem): Thenable<GitCueStatusItem[]> {
  // Builds tree structure based on current state
  // Shows watching status, configuration, and activity
}
```

#### **Real-Time Updates**
```typescript
refresh(): void {
  // Triggers tree view refresh
  // Updates all status indicators
  // Reflects current GitCue state
}
```

#### **Interactive Elements**
- **Click-to-action** tree items
- **Status indicators** with icons
- **Tooltip information** for detailed context
- **Dynamic content** based on current state

### 🔧 Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `refresh()` | Refresh entire tree view | None |
| `getTreeItem()` | Get tree item representation | `element: GitCueStatusItem` |
| `getChildren()` | Get child items for element | `element?: GitCueStatusItem` |
| `getConfig()` | Get current GitCue configuration | None |
| `getWatchingStatus()` | Get current watching state | None |

---

## 🔗 Service Interactions

### Cross-Service Communication Flow

```mermaid
sequenceDiagram
    participant User
    participant FWS as FileWatcherService
    participant CS as CommitService
    participant AL as ActivityLogger
    participant DS as DashboardService
    participant SP as StatusProvider
    
    User->>FWS: Start watching
    FWS->>AL: Update watch status
    AL->>DS: Notify status change
    AL->>SP: Notify status change
    
    loop File Monitoring
        FWS->>FWS: Detect changes
        FWS->>AL: Log file change
        FWS->>CS: Request commit analysis
        CS->>AL: Log AI analysis start
        CS->>CS: Generate commit decision
        CS->>AL: Log commit decision
        
        alt Should Commit
            CS->>DS: Show buffer notification
            CS->>AL: Log pending commit
            User->>CS: Confirm commit
            CS->>AL: Log commit completion
        end
        
        AL->>DS: Update dashboard
        AL->>SP: Update tree view
    end
```

### Shared State Management

```mermaid
graph LR
    subgraph "Shared State"
        WS[Watch Status]
        AH[Activity History]
        CS_STATE[Commit State]
        CONFIG[Configuration]
    end
    
    subgraph "Service Access Patterns"
        FWS[FileWatcher] -->|Updates| WS
        CS[CommitService] -->|Updates| CS_STATE
        AL[ActivityLogger] -->|Manages| AH
        DS[Dashboard] -->|Reads| WS
        DS -->|Reads| AH
        SP[StatusProvider] -->|Reads| CONFIG
        SP -->|Reads| WS
    end
    
    style WS fill:#e8f5e8
    style AH fill:#f3e5f5
    style CS_STATE fill:#fff3e0
    style CONFIG fill:#e3f2fd
```

---

## 🛠️ Development Guidelines

### **Service Design Principles**

1. **Single Responsibility**: Each service has one clear purpose
2. **Singleton Pattern**: Global state management with single instances
3. **Observer Pattern**: Event-driven updates and notifications
4. **Dependency Injection**: Services depend on abstractions, not concretions
5. **Error Isolation**: Each service handles its own errors gracefully

### **Adding New Services**

```typescript
export class NewService {
  private static instance: NewService;
  
  private constructor() {
    // Initialize service
  }
  
  static getInstance(): NewService {
    if (!NewService.instance) {
      NewService.instance = new NewService();
    }
    return NewService.instance;
  }
  
  // Service methods...
}
```

### **Service Communication Best Practices**

```typescript
// ✅ Good: Use ActivityLogger for state management
const activityLogger = ActivityLogger.getInstance();
activityLogger.logActivity('commit', 'Commit completed successfully');

// ✅ Good: Use callback pattern for UI updates
activityLogger.setUpdateCallback(() => {
  // Update UI elements
});

// ❌ Avoid: Direct service-to-service coupling
// Don't call CommitService directly from FileWatcherService
```

### **Error Handling Pattern**

```typescript
async serviceMethod(): Promise<ResultType> {
  try {
    // Service logic
    const result = await performOperation();
    this.activityLogger.logActivity('success', 'Operation completed');
    return result;
  } catch (error) {
    this.activityLogger.logActivity('error', 'Operation failed', error.message);
    throw error;
  }
}
```

---

## 🧪 Testing Services

### **Unit Testing Pattern**

```typescript
describe('CommitService', () => {
  let commitService: CommitService;
  
  beforeEach(() => {
    commitService = CommitService.getInstance();
  });
  
  it('should generate commit message with AI', async () => {
    const message = await commitService.generateCommitMessage('/path', config);
    expect(message).toBeDefined();
    expect(message.length).toBeGreaterThan(0);
  });
});
```

### **Integration Testing**

```typescript
describe('Service Integration', () => {
  it('should coordinate file watching and commits', async () => {
    const fileWatcher = FileWatcherService.getInstance();
    const activityLogger = ActivityLogger.getInstance();
    
    await fileWatcher.startWatching();
    // Simulate file change
    // Verify activity logging
    expect(activityLogger.getWatchStatus().isWatching).toBe(true);
  });
});
```

---

## 📚 API Reference

### **Common Interfaces**

```typescript
// Core configuration interface
interface GitCueConfig {
  geminiApiKey: string;
  commitMode: 'periodic' | 'intelligent';
  autoPush: boolean;
  watchPaths: string[];
  debounceMs: number;
  bufferTimeSeconds: number;
  maxCallsPerMinute: number;
  enableNotifications: boolean;
  autoWatch: boolean;
}

// Activity tracking interface
interface ActivityLogEntry {
  timestamp: string;
  type: 'file_change' | 'ai_analysis' | 'commit' | 'error' | 'watch_start' | 'watch_stop';
  message: string;
  details?: string;
}

// Watch status interface
interface WatchStatus {
  isWatching: boolean;
  filesChanged: number;
  lastChange: string;
  lastCommit: string;
  pendingCommit: boolean;
  aiAnalysisInProgress: boolean;
  activityHistory: ActivityLogEntry[];
  changedFiles: Set<string>;
}
```

### **Service Export**

```typescript
// src/services/index.ts
export { CommitService } from './commitService';
export { FileWatcherService } from './fileWatcherService';
export { ActivityLogger } from './activityLogger';
export { DashboardService } from './dashboardService';
export { GitCueStatusProvider } from './statusProvider';
```

---

The Services directory forms the backbone of GitCue's functionality, providing robust, scalable, and maintainable business logic that powers the extension's intelligent Git automation capabilities. 