import * as vscode from 'vscode';

export interface IntelligentCommitConfig {
  commitThreshold: 'any' | 'medium' | 'major';
  minTimeBetweenCommits: number; // milliseconds
  activitySettleTime: number; // milliseconds
  requireCompleteness: boolean;
  bufferTimeSeconds: number;
  cancelOnNewChanges: boolean;
}

export interface GitCueExtensionConfig {
  // Core settings
  geminiApiKey: string;
  commitMode: 'periodic' | 'intelligent';
  autoPush: boolean;
  watchPaths: string[];
  debounceMs: number;
  bufferTimeSeconds: number;
  maxCallsPerMinute: number;
  enableNotifications: boolean;
  autoWatch: boolean;
  
  // Interactive terminal settings
  interactiveOnError: boolean;
  enableSuggestions: boolean;
  terminalVerbose: boolean;
  sessionPersistence: boolean;
  maxHistorySize: number;
  
  // Intelligent commit configuration
  intelligentCommit: IntelligentCommitConfig;
  
  // Watch configuration
  watchOptions: {
    ignored: string[];
    persistent: boolean;
    ignoreInitial: boolean;
    followSymlinks: boolean;
    depth?: number;
  };
}

/**
 * Configuration manager for GitCue VS Code extension
 */
export class ConfigManager {
  private static instance: ConfigManager;
  
  private constructor() {}
  
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get the complete configuration
   */
  getConfig(): GitCueExtensionConfig {
    const config = vscode.workspace.getConfiguration('gitcue');
    
    return {
      // Core settings from VS Code configuration
      geminiApiKey: config.get('geminiApiKey') || process.env.GEMINI_API_KEY || '',
      commitMode: config.get('commitMode') || 'intelligent',
      autoPush: config.get('autoPush') ?? true,
      watchPaths: config.get('watchPaths') || [
        '**/*'  // Watch all files by default
      ],
      debounceMs: config.get('debounceMs') || 30000,
      bufferTimeSeconds: config.get('bufferTimeSeconds') || 30,
      maxCallsPerMinute: config.get('maxCallsPerMinute') || 15,
      enableNotifications: config.get('enableNotifications') ?? true,
      autoWatch: config.get('autoWatch') ?? true, // Enable auto-watch by default
      
      // Interactive terminal settings (new)
      interactiveOnError: config.get('interactiveOnError') ?? true,
      enableSuggestions: config.get('enableSuggestions') ?? true,
      terminalVerbose: config.get('terminalVerbose') ?? false,
      sessionPersistence: config.get('sessionPersistence') ?? true,
      maxHistorySize: config.get('maxHistorySize') || 100,
      
      // Intelligent commit configuration
      intelligentCommit: {
        commitThreshold: config.get('intelligentCommit.commitThreshold') || 'medium',
        minTimeBetweenCommits: config.get('intelligentCommit.minTimeBetweenCommits') || 1800000, // 30 minutes
        activitySettleTime: config.get('intelligentCommit.activitySettleTime') || 300000, // 5 minutes
        requireCompleteness: config.get('intelligentCommit.requireCompleteness') ?? true,
        bufferTimeSeconds: config.get('intelligentCommit.bufferTimeSeconds') || config.get('bufferTimeSeconds') || 30,
        cancelOnNewChanges: config.get('intelligentCommit.cancelOnNewChanges') ?? true
      },
      
      // Watch options
      watchOptions: {
        ignored: config.get('watchIgnored') || [
          '**/node_modules/**',
          '**/.git/**',
          '**/.DS_Store',
          '**/*.log',
          '**/*.tmp',
          '**/*.temp',
          '**/*.swp',
          '**/*.swo',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/package-lock.json',
          '**/yarn.lock',
          '**/pnpm-lock.yaml',
          '**/.vscode/**',
          '**/.idea/**',
          '**/.*' // Ignore all dotfiles except specific ones
        ],
        persistent: true,
        ignoreInitial: true,
        followSymlinks: false,
        depth: undefined
      }
    };
  }

  /**
   * Get watch patterns optimized for comprehensive monitoring
   */
  getOptimizedWatchPatterns(): string[] {
    return [
      '**/*.{js,ts,jsx,tsx,py,java,cpp,c,h,cs,php,rb,go,rs,swift,kt}', // Code files
      '**/*.{json,yaml,yml,xml,toml,ini,cfg}', // Config files
      '**/*.{md,txt,rst}', // Documentation
      '**/*.{css,scss,sass,less}', // Styles
      '**/*.{html,htm,vue,svelte}', // Templates
      '**/package.json',
      '**/requirements.txt',
      '**/Cargo.toml',
      '**/go.mod',
      '**/pom.xml',
      '**/build.gradle'
    ];
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (!config.geminiApiKey) {
      errors.push('Gemini API key is not configured. Please set it in GitCue settings or as GEMINI_API_KEY environment variable.');
    }

    if (config.debounceMs < 1000) {
      errors.push('Debounce time should be at least 1000ms (1 second).');
    }

    if (config.bufferTimeSeconds < 5) {
      errors.push('Buffer time should be at least 5 seconds.');
    }

    if (config.maxCallsPerMinute < 1 || config.maxCallsPerMinute > 60) {
      errors.push('Max calls per minute should be between 1 and 60.');
    }

    if (config.maxHistorySize < 10 || config.maxHistorySize > 1000) {
      errors.push('Max history size should be between 10 and 1000.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get watch patterns for file watching
   */
  getWatchPatterns(): string[] {
    const config = this.getConfig();
    return config.watchPaths.length > 0 ? config.watchPaths : this.getOptimizedWatchPatterns();
  }

  /**
   * Get watch options for chokidar
   */
  getWatchOptions() {
    const config = this.getConfig();
    return config.watchOptions;
  }

  /**
   * Get interactive configuration
   */
  getInteractiveConfig() {
    const config = this.getConfig();
    return {
      interactiveOnError: config.interactiveOnError,
      enableSuggestions: config.enableSuggestions,
      terminalVerbose: config.terminalVerbose,
      sessionPersistence: config.sessionPersistence,
      maxHistorySize: config.maxHistorySize
    };
  }

  /**
   * Get commit configuration
   */
  getCommitConfig() {
    const config = this.getConfig();
    return {
      commitMode: config.commitMode,
      autoPush: config.autoPush,
      bufferTimeSeconds: config.bufferTimeSeconds,
      maxCallsPerMinute: config.maxCallsPerMinute
    };
  }

  /**
   * Get intelligent commit configuration
   */
  getIntelligentCommitConfig(): IntelligentCommitConfig {
    const config = this.getConfig();
    return config.intelligentCommit;
  }

  /**
   * Update a configuration value
   */
  async updateConfig(key: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
    const config = vscode.workspace.getConfiguration('gitcue');
    await config.update(key, value, target);
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    const config = vscode.workspace.getConfiguration('gitcue');
    const keys = [
      'geminiApiKey',
      'commitMode',
      'autoPush',
      'watchPaths',
      'debounceMs',
      'bufferTimeSeconds',
      'maxCallsPerMinute',
      'enableNotifications',
      'autoWatch',
      'interactiveOnError',
      'enableSuggestions',
      'terminalVerbose',
      'sessionPersistence',
      'maxHistorySize',
      'watchIgnored'
    ];

    for (const key of keys) {
      await config.update(key, undefined, vscode.ConfigurationTarget.Workspace);
    }
  }

  /**
   * Get configuration for display
   */
  getConfigForDisplay(): Record<string, any> {
    const config = this.getConfig();
    return {
      'API Key': config.geminiApiKey ? '✓ Configured' : '✗ Not Set',
      'Commit Mode': config.commitMode,
      'Auto Push': config.autoPush,
      'Watch Paths': config.watchPaths.length + ' patterns',
      'Debounce Time': config.debounceMs + 'ms',
      'Buffer Time': config.bufferTimeSeconds + 's',
      'Rate Limit': config.maxCallsPerMinute + ' calls/min',
      'Notifications': config.enableNotifications,
      'Auto Watch': config.autoWatch,
      'Interactive on Error': config.interactiveOnError,
      'AI Suggestions': config.enableSuggestions,
      'Terminal Verbose': config.terminalVerbose,
      'Session Persistence': config.sessionPersistence,
      'Max History': config.maxHistorySize + ' commands'
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
export default configManager; 