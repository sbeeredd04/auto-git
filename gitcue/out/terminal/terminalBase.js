"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalBase = void 0;
const child_process_1 = require("child_process");
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Base terminal management class that handles shell process and I/O
 */
class TerminalBase {
    shellProcess;
    io;
    config;
    isActive = false;
    constructor(io, workspaceRoot) {
        this.io = io;
        this.config = this.createShellConfig(workspaceRoot);
    }
    async startShell() {
        try {
            this.shellProcess = (0, child_process_1.spawn)(this.config.shell, this.config.args, {
                cwd: this.config.cwd,
                env: this.config.env,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            if (!this.shellProcess || !this.shellProcess.stdin || !this.shellProcess.stdout || !this.shellProcess.stderr) {
                throw new Error('Failed to create shell process with required streams');
            }
            this.setupProcessHandlers();
            this.isActive = true;
            logger_1.default.interactiveInfo(`Shell started: ${this.config.shell} in ${this.config.cwd}`);
            return true;
        }
        catch (error) {
            logger_1.default.error('Failed to start shell: ' + (error instanceof Error ? error.message : String(error)));
            return false;
        }
    }
    stopShell() {
        if (this.shellProcess && !this.shellProcess.killed) {
            this.shellProcess.kill();
            this.shellProcess = undefined;
        }
        this.isActive = false;
        logger_1.default.interactiveInfo('Shell stopped');
    }
    sendToShell(data) {
        if (this.shellProcess?.stdin && this.isActive) {
            try {
                this.shellProcess.stdin.write(data);
                return true;
            }
            catch (error) {
                logger_1.default.error('Failed to send data to shell: ' + (error instanceof Error ? error.message : String(error)));
                return false;
            }
        }
        return false;
    }
    executeCommand(command) {
        return this.sendToShell(command + '\r\n');
    }
    isShellActive() {
        return this.isActive && !!this.shellProcess && !this.shellProcess.killed;
    }
    getShellPid() {
        return this.shellProcess?.pid;
    }
    createShellConfig(workspaceRoot) {
        const shell = this.getDefaultShell();
        const args = this.getShellArgs();
        return {
            shell,
            args,
            cwd: workspaceRoot,
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                // Custom prompt that includes GitCue branding
                PS1: this.createCustomPrompt(),
                // Enable colors
                FORCE_COLOR: '1',
                CLICOLOR: '1',
                // History settings
                HISTSIZE: '10000',
                HISTFILESIZE: '20000'
            }
        };
    }
    getDefaultShell() {
        if (process.platform === 'win32') {
            // Try PowerShell first, fall back to cmd
            return process.env.COMSPEC || 'cmd.exe';
        }
        // For Unix-like systems, prefer user's shell
        return process.env.SHELL || '/bin/bash';
    }
    getShellArgs() {
        if (process.platform === 'win32') {
            return [];
        }
        // Interactive login shell for better compatibility
        return ['--login', '-i'];
    }
    createCustomPrompt() {
        if (process.platform === 'win32') {
            return 'GitCue $P$G ';
        }
        // For Unix shells, create a colorful prompt
        return '\\[\\e[1;36m\\]GitCue\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]$ ';
    }
    setupProcessHandlers() {
        if (!this.shellProcess)
            return;
        // Handle stdout (normal output)
        this.shellProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            this.io.write(output);
        });
        // Handle stderr (error output)
        this.shellProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            this.io.write(output);
        });
        // Handle process exit
        this.shellProcess.on('close', (code, signal) => {
            this.isActive = false;
            logger_1.default.interactiveInfo(`Shell process closed with code ${code}, signal ${signal}`);
            if (code !== 0 && code !== null) {
                this.io.write(`\r\n${this.getErrorColor()}Shell process exited with code ${code}${this.getResetColor()}\r\n`);
            }
        });
        // Handle process errors
        this.shellProcess.on('error', (error) => {
            this.isActive = false;
            logger_1.default.error('Shell process error: ' + error.message);
            this.io.write(`\r\n${this.getErrorColor()}Shell error: ${error.message}${this.getResetColor()}\r\n`);
        });
        // Handle unexpected termination
        this.shellProcess.on('exit', (code, signal) => {
            if (this.isActive) {
                this.isActive = false;
                logger_1.default.interactiveInfo(`Shell unexpectedly exited: code=${code}, signal=${signal}`);
            }
        });
    }
    getErrorColor() {
        return '\x1b[31m'; // Red
    }
    getResetColor() {
        return '\x1b[0m'; // Reset
    }
    dispose() {
        this.stopShell();
    }
}
exports.TerminalBase = TerminalBase;
//# sourceMappingURL=terminalBase.js.map