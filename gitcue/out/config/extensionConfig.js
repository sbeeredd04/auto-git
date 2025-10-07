"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGitConfig = exports.getDashboardConfig = exports.getTheme = exports.getDisplayName = exports.getVersion = exports.getExtensionConfig = exports.EXTENSION_CONFIG = void 0;
exports.EXTENSION_CONFIG = {
    version: '0.3.10',
    displayName: 'GitCue',
    description: 'GitCue — your Git helper extension for VS Code. Automate commits with AI-crafted messages, manage pushes and resets in-editor, and keep your workflow smooth and effortless.',
    publisher: 'sbeeredd04',
    repository: 'https://github.com/sbeeredd04/auto-git',
    icon: {
        main: 'icon.png',
        svg: 'media/gitcue-icon.svg'
    },
    theme: {
        primaryColor: '#36D1DC',
        secondaryColor: '#5B86E5',
        accentColor: '#149CEA',
        successColor: '#4CAF50',
        warningColor: '#FF9800',
        errorColor: '#F44336'
    },
    dashboard: {
        refreshInterval: 5000,
        maxActivityItems: 10,
        defaultCards: ['status', 'statistics', 'actions', 'activity']
    },
    git: {
        defaultBranch: 'main',
        watchPatterns: ['**/*'],
        ignorePatterns: [
            '**/node_modules/**',
            '**/.git/**',
            '**/.DS_Store',
            '**/*.log',
            '**/*.tmp',
            '**/*.temp',
            '**/dist/**',
            '**/build/**'
        ]
    }
};
const getExtensionConfig = () => {
    return exports.EXTENSION_CONFIG;
};
exports.getExtensionConfig = getExtensionConfig;
const getVersion = () => {
    return exports.EXTENSION_CONFIG.version;
};
exports.getVersion = getVersion;
const getDisplayName = () => {
    return exports.EXTENSION_CONFIG.displayName;
};
exports.getDisplayName = getDisplayName;
const getTheme = () => {
    return exports.EXTENSION_CONFIG.theme;
};
exports.getTheme = getTheme;
const getDashboardConfig = () => {
    return exports.EXTENSION_CONFIG.dashboard;
};
exports.getDashboardConfig = getDashboardConfig;
const getGitConfig = () => {
    return exports.EXTENSION_CONFIG.git;
};
exports.getGitConfig = getGitConfig;
//# sourceMappingURL=extensionConfig.js.map