import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitRepositoryInfo {
	branch: string;
	status: string;
	commits: number;
	remoteUrl: string;
	lastCommit: string;
	uncommittedChanges: number;
	stagedChanges: number;
}

export class GitService {
	private static instance: GitService;
	private workspaceRoot: string | undefined;

	private constructor() {
		this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	}

	static getInstance(): GitService {
		if (!GitService.instance) {
			GitService.instance = new GitService();
		}
		return GitService.instance;
	}

	async getRepositoryInfo(): Promise<GitRepositoryInfo | null> {
		if (!this.workspaceRoot) {
			return null;
		}

		try {
			const [branch, status, commits, remoteUrl, lastCommit] = await Promise.all([
				this.getCurrentBranch(),
				this.getStatus(),
				this.getCommitCount(),
				this.getRemoteUrl(),
				this.getLastCommit()
			]);

			const statusInfo = this.parseGitStatus(status);

			return {
				branch,
				status,
				commits,
				remoteUrl,
				lastCommit,
				uncommittedChanges: statusInfo.uncommitted,
				stagedChanges: statusInfo.staged
			};
		} catch (error) {
			console.error('Error getting Git repository info:', error);
			return null;
		}
	}

	private async getCurrentBranch(): Promise<string> {
		try {
			const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
				cwd: this.workspaceRoot
			});
			return stdout.trim();
		} catch (error) {
			return 'main';
		}
	}

	private async getStatus(): Promise<string> {
		try {
			const { stdout } = await execAsync('git status --porcelain', {
				cwd: this.workspaceRoot
			});
			return stdout.trim();
		} catch (error) {
			return '';
		}
	}

	private async getCommitCount(): Promise<number> {
		try {
			const { stdout } = await execAsync('git rev-list --count HEAD', {
				cwd: this.workspaceRoot
			});
			return parseInt(stdout.trim(), 10);
		} catch (error) {
			return 0;
		}
	}

	private async getRemoteUrl(): Promise<string> {
		try {
			const { stdout } = await execAsync('git config --get remote.origin.url', {
				cwd: this.workspaceRoot
			});
			return stdout.trim();
		} catch (error) {
			return '';
		}
	}

	private async getLastCommit(): Promise<string> {
		try {
			const { stdout } = await execAsync('git log -1 --pretty=format:"%h %s"', {
				cwd: this.workspaceRoot
			});
			return stdout.trim();
		} catch (error) {
			return 'No commits';
		}
	}

	private parseGitStatus(status: string): { uncommitted: number; staged: number } {
		const lines = status.split('\n').filter(line => line.trim());
		let uncommitted = 0;
		let staged = 0;

		for (const line of lines) {
			if (line.length >= 2) {
				const stagedChar = line[0];
				const workingChar = line[1];

				if (stagedChar !== ' ' && stagedChar !== '?') {
					staged++;
				}
				if (workingChar !== ' ' && workingChar !== '?') {
					uncommitted++;
				}
			}
		}

		return { uncommitted, staged };
	}

	async isGitRepository(): Promise<boolean> {
		if (!this.workspaceRoot) {
			return false;
		}

		try {
			await execAsync('git rev-parse --git-dir', {
				cwd: this.workspaceRoot
			});
			return true;
		} catch (error) {
			return false;
		}
	}

	async getChangedFiles(): Promise<string[]> {
		try {
			const { stdout } = await execAsync('git diff --name-only HEAD', {
				cwd: this.workspaceRoot
			});
			return stdout.trim().split('\n').filter(file => file.length > 0);
		} catch (error) {
			return [];
		}
	}

	async getStagedFiles(): Promise<string[]> {
		try {
			const { stdout } = await execAsync('git diff --name-only --cached', {
				cwd: this.workspaceRoot
			});
			return stdout.trim().split('\n').filter(file => file.length > 0);
		} catch (error) {
			return [];
		}
	}
} 