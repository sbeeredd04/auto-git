import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as os from 'os';
import logger from '../utils/logger';

export interface TerminalIO {
  write: (data: string) => void;
  onData: (callback: (data: string) => void) => void;
}

export interface ShellConfig {
  shell: string;
  args: string[];
  env: Record<string, string>;
  cwd: string;
}

/**
 * Base terminal management class that handles shell process and I/O
 */
export class TerminalBase {
  private shellProcess?: ChildProcess;
  private io: TerminalIO;
  private config: ShellConfig;
  private isActive = false;

  constructor(io: TerminalIO, workspaceRoot: string) {
    this.io = io;
    this.config = this.createShellConfig(workspaceRoot);
  }

  async startShell(): Promise<boolean> {
    try {
      this.shellProcess = spawn(this.config.shell, this.config.args, {
        cwd: this.config.cwd,
        env: this.config.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (!this.shellProcess || !this.shellProcess.stdin || !this.shellProcess.stdout || !this.shellProcess.stderr) {
        throw new Error('Failed to create shell process with required streams');
      }

      this.setupProcessHandlers();
      this.isActive = true;
      
      logger.interactiveInfo(`Shell started: ${this.config.shell} in ${this.config.cwd}`);
      return true;
    } catch (error) {
      logger.error('Failed to start shell: ' + (error instanceof Error ? error.message : String(error)));
      return false;
    }
  }

  stopShell(): void {
    if (this.shellProcess && !this.shellProcess.killed) {
      this.shellProcess.kill();
      this.shellProcess = undefined;
    }
    this.isActive = false;
    logger.interactiveInfo('Shell stopped');
  }

  sendToShell(data: string): boolean {
    if (this.shellProcess?.stdin && this.isActive) {
      try {
        this.shellProcess.stdin.write(data);
        return true;
      } catch (error) {
        logger.error('Failed to send data to shell: ' + (error instanceof Error ? error.message : String(error)));
        return false;
      }
    }
    return false;
  }

  executeCommand(command: string): boolean {
    return this.sendToShell(command + '\r\n');
  }

  isShellActive(): boolean {
    return this.isActive && !!this.shellProcess && !this.shellProcess.killed;
  }

  getShellPid(): number | undefined {
    return this.shellProcess?.pid;
  }

  private createShellConfig(workspaceRoot: string): ShellConfig {
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

  private getDefaultShell(): string {
    if (process.platform === 'win32') {
      // Try PowerShell first, fall back to cmd
      return process.env.COMSPEC || 'cmd.exe';
    }
    // For Unix-like systems, prefer user's shell
    return process.env.SHELL || '/bin/bash';
  }

  private getShellArgs(): string[] {
    if (process.platform === 'win32') {
      return [];
    }
    // Interactive login shell for better compatibility
    return ['--login', '-i'];
  }

  private createCustomPrompt(): string {
    if (process.platform === 'win32') {
      return 'GitCue $P$G ';
    }
    
    // For Unix shells, create a colorful prompt
    return '\\[\\e[1;36m\\]GitCue\\[\\e[0m\\]:\\[\\e[1;34m\\]\\w\\[\\e[0m\\]$ ';
  }

  private setupProcessHandlers(): void {
    if (!this.shellProcess) return;

    // Handle stdout (normal output)
    this.shellProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.io.write(output);
    });

    // Handle stderr (error output)
    this.shellProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.io.write(output);
    });

    // Handle process exit
    this.shellProcess.on('close', (code, signal) => {
      this.isActive = false;
      logger.interactiveInfo(`Shell process closed with code ${code}, signal ${signal}`);
      
      if (code !== 0 && code !== null) {
        this.io.write(`\r\n${this.getErrorColor()}Shell process exited with code ${code}${this.getResetColor()}\r\n`);
      }
    });

    // Handle process errors
    this.shellProcess.on('error', (error) => {
      this.isActive = false;
      logger.error('Shell process error: ' + error.message);
      this.io.write(`\r\n${this.getErrorColor()}Shell error: ${error.message}${this.getResetColor()}\r\n`);
    });

    // Handle unexpected termination
    this.shellProcess.on('exit', (code, signal) => {
      if (this.isActive) {
        this.isActive = false;
        logger.interactiveInfo(`Shell unexpectedly exited: code=${code}, signal=${signal}`);
      }
    });
  }

  private getErrorColor(): string {
    return '\x1b[31m'; // Red
  }

  private getResetColor(): string {
    return '\x1b[0m'; // Reset
  }

  dispose(): void {
    this.stopShell();
  }
} 