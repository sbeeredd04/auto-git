"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitService = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class GitService {
    static instance;
    workspaceRoot;
    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    static getInstance() {
        if (!GitService.instance) {
            GitService.instance = new GitService();
        }
        return GitService.instance;
    }
    async getRepositoryInfo() {
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
        }
        catch (error) {
            console.error('Error getting Git repository info:', error);
            return null;
        }
    }
    async getCurrentBranch() {
        try {
            const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
                cwd: this.workspaceRoot
            });
            return stdout.trim();
        }
        catch (error) {
            return 'main';
        }
    }
    async getStatus() {
        try {
            const { stdout } = await execAsync('git status --porcelain', {
                cwd: this.workspaceRoot
            });
            return stdout.trim();
        }
        catch (error) {
            return '';
        }
    }
    async getCommitCount() {
        try {
            const { stdout } = await execAsync('git rev-list --count HEAD', {
                cwd: this.workspaceRoot
            });
            return parseInt(stdout.trim(), 10);
        }
        catch (error) {
            return 0;
        }
    }
    async getRemoteUrl() {
        try {
            const { stdout } = await execAsync('git config --get remote.origin.url', {
                cwd: this.workspaceRoot
            });
            return stdout.trim();
        }
        catch (error) {
            return '';
        }
    }
    async getLastCommit() {
        try {
            const { stdout } = await execAsync('git log -1 --pretty=format:"%h %s"', {
                cwd: this.workspaceRoot
            });
            return stdout.trim();
        }
        catch (error) {
            return 'No commits';
        }
    }
    parseGitStatus(status) {
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
    async isGitRepository() {
        if (!this.workspaceRoot) {
            return false;
        }
        try {
            await execAsync('git rev-parse --git-dir', {
                cwd: this.workspaceRoot
            });
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getChangedFiles() {
        try {
            const { stdout } = await execAsync('git diff --name-only HEAD', {
                cwd: this.workspaceRoot
            });
            return stdout.trim().split('\n').filter(file => file.length > 0);
        }
        catch (error) {
            return [];
        }
    }
    async getStagedFiles() {
        try {
            const { stdout } = await execAsync('git diff --name-only --cached', {
                cwd: this.workspaceRoot
            });
            return stdout.trim().split('\n').filter(file => file.length > 0);
        }
        catch (error) {
            return [];
        }
    }
}
exports.GitService = GitService;
//# sourceMappingURL=gitService.js.map