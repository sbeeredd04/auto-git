export interface ExtensionConfig {
	version: string;
	displayName: string;
	description: string;
	publisher: string;
	repository: string;
	icon: {
		main: string;
		svg: string;
	};
	theme: {
		primaryColor: string;
		secondaryColor: string;
		accentColor: string;
		successColor: string;
		warningColor: string;
		errorColor: string;
	};
	dashboard: {
		refreshInterval: number;
		maxActivityItems: number;
		defaultCards: string[];
	};
	git: {
		defaultBranch: string;
		watchPatterns: string[];
		ignorePatterns: string[];
	};
}

export const EXTENSION_CONFIG: ExtensionConfig = {
	version: '0.3.9',
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

export const getExtensionConfig = (): ExtensionConfig => {
	return EXTENSION_CONFIG;
};

export const getVersion = (): string => {
	return EXTENSION_CONFIG.version;
};

export const getDisplayName = (): string => {
	return EXTENSION_CONFIG.displayName;
};

export const getTheme = () => {
	return EXTENSION_CONFIG.theme;
};

export const getDashboardConfig = () => {
	return EXTENSION_CONFIG.dashboard;
};

export const getGitConfig = () => {
	return EXTENSION_CONFIG.git;
}; 