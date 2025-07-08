import * as vscode from 'vscode';
import { DashboardState, GitCueConfig, WatchStatus, BufferNotificationOptions, CommitPreviewOptions } from '../types/interfaces';

export class DashboardService {
	private static instance: DashboardService;
	private dashboardPanels: vscode.WebviewPanel[] = [];

	private constructor() {}

	static getInstance(): DashboardService {
		if (!DashboardService.instance) {
			DashboardService.instance = new DashboardService();
		}
		return DashboardService.instance;
	}

	createDashboard(onMessage: (message: any) => void): vscode.WebviewPanel {
		const panel = vscode.window.createWebviewPanel(
			'gitcueDashboard',
			'GitCue Dashboard',
			vscode.ViewColumn.One,
			{ 
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		this.dashboardPanels.push(panel);

		panel.webview.html = this.getDashboardHtml();

		let panelDisposed = false;
		
		panel.onDidDispose(() => {
			panelDisposed = true;
			const index = this.dashboardPanels.indexOf(panel);
			if (index > -1) {
				this.dashboardPanels.splice(index, 1);
			}
		});

		panel.webview.onDidReceiveMessage(async (message) => {
			if (!panelDisposed) {
				onMessage(message);
			}
		});

		return panel;
	}

	updateDashboards(state: DashboardState): void {
		this.dashboardPanels.forEach(panel => {
			if (panel.visible) {
				panel.webview.postMessage({
					action: 'statusUpdate',
					data: state
				});
			}
		});
	}

	createCommitPreview(options: CommitPreviewOptions, onMessage: (message: any) => void): vscode.WebviewPanel {
		const panel = vscode.window.createWebviewPanel(
			'gitcueCommitPreview',
			'GitCue: Commit Preview',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		panel.webview.html = this.getCommitPreviewHtml(options);
		panel.webview.onDidReceiveMessage(onMessage);

		return panel;
	}

	createBufferNotification(options: BufferNotificationOptions): vscode.WebviewPanel {
		const panel = vscode.window.createWebviewPanel(
			'gitcueBuffer',
			'⏰ GitCue Commit Buffer',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		panel.webview.html = this.getBufferNotificationHtml(options);
		return panel;
	}

	private getDashboardHtml(): string {
		// Return simplified dashboard HTML for now
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>GitCue Dashboard</title>
			<style>
				body { 
					font-family: var(--vscode-font-family); 
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					padding: 20px;
				}
				.header { text-align: center; margin-bottom: 30px; }
				.title { font-size: 24px; font-weight: bold; }
				.card { 
					background: var(--vscode-textCodeBlock-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 8px;
					padding: 20px;
					margin: 10px 0;
				}
				.btn {
					padding: 10px 20px;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					margin: 5px;
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
				}
				.btn:hover { background: var(--vscode-button-hoverBackground); }
			</style>
		</head>
		<body>
			<div class="header">
				<h1 class="title">GitCue Dashboard v0.3.8</h1>
				<p>Monitor your AI-powered Git automation</p>
			</div>
			
			<div class="card">
				<h3>Status</h3>
				<div id="status">Loading...</div>
			</div>
			
			<div class="card">
				<h3>Actions</h3>
				<button class="btn" onclick="toggleWatching()">Toggle Watching</button>
				<button class="btn" onclick="openSettings()">Settings</button>
				<button class="btn" onclick="manualCommit()">Manual Commit</button>
				<button class="btn" onclick="openTerminal()">AI Terminal</button>
			</div>
			
			<script>
				const vscode = acquireVsCodeApi();
				
				function toggleWatching() {
					vscode.postMessage({ action: 'toggleWatching' });
				}
				
				function openSettings() {
					vscode.postMessage({ action: 'openSettings' });
				}
				
				function manualCommit() {
					vscode.postMessage({ action: 'manualCommit' });
				}
				
				function openTerminal() {
					vscode.postMessage({ action: 'openTerminal' });
				}
				
				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'statusUpdate') {
						const status = document.getElementById('status');
						const data = message.data;
						status.innerHTML = \`
							<p>Watching: \${data.isWatching ? 'Yes' : 'No'}</p>
							<p>Files Changed: \${data.watchStatus.filesChanged}</p>
							<p>Last Change: \${data.watchStatus.lastChange}</p>
							<p>Mode: \${data.config.commitMode}</p>
						\`;
					}
				});
				
				setInterval(() => {
					vscode.postMessage({ action: 'keepAlive' });
				}, 5000);
			</script>
		</body>
		</html>`;
	}

	private getCommitPreviewHtml(options: CommitPreviewOptions): string {
		const { message, status, config } = options;
		const fileCount = status.split('\n').filter(line => line.trim()).length;
		
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>GitCue Commit Preview</title>
			<style>
				body { 
					font-family: var(--vscode-font-family); 
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					padding: 20px;
				}
				.header { text-align: center; margin-bottom: 30px; }
				.commit-message {
					background: var(--vscode-textCodeBlock-background);
					padding: 15px;
					border-radius: 6px;
					margin: 15px 0;
					border-left: 4px solid var(--vscode-textLink-foreground);
				}
				.changes {
					background: var(--vscode-textCodeBlock-background);
					padding: 15px;
					border-radius: 6px;
					font-family: monospace;
					white-space: pre-wrap;
					max-height: 200px;
					overflow-y: auto;
				}
				.btn {
					padding: 12px 24px;
					border: none;
					border-radius: 6px;
					cursor: pointer;
					margin: 10px;
					font-weight: bold;
				}
				.btn-primary {
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
				}
				.btn-secondary {
					background: var(--vscode-button-secondaryBackground);
					color: var(--vscode-button-secondaryForeground);
				}
				.actions { text-align: center; margin-top: 30px; }
				.stats { display: flex; gap: 20px; justify-content: center; margin: 20px 0; }
				.stat { text-align: center; }
				.stat-value { font-size: 20px; font-weight: bold; color: var(--vscode-textLink-foreground); }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>🤖 GitCue AI Commit</h1>
				<p>Review your AI-generated commit message</p>
			</div>

			<div class="stats">
				<div class="stat">
					<div class="stat-value">${fileCount}</div>
					<div>Files Changed</div>
				</div>
				<div class="stat">
					<div class="stat-value">${config.commitMode}</div>
					<div>Mode</div>
				</div>
				<div class="stat">
					<div class="stat-value">${config.autoPush ? 'Yes' : 'No'}</div>
					<div>Auto Push</div>
				</div>
			</div>

			<div>
				<h3>💬 Commit Message</h3>
				<div class="commit-message" id="commitMessage">${message}</div>
			</div>

			<div>
				<h3>📋 Changes to Commit</h3>
				<div class="changes">${status}</div>
			</div>

			<div>
				<h3>⚙️ Options</h3>
				<label>
					<input type="checkbox" id="shouldPush" ${config.autoPush ? 'checked' : ''}>
					Push to remote repository after commit
				</label>
			</div>

			<div class="actions">
				<button class="btn btn-primary" onclick="commit()">
					🚀 Commit & ${config.autoPush ? 'Push' : 'Save'}
				</button>
				<button class="btn btn-secondary" onclick="editMessage()">
					✏️ Edit Message
				</button>
				<button class="btn btn-secondary" onclick="cancel()">
					❌ Cancel
				</button>
			</div>

			<script>
				const vscode = acquireVsCodeApi();
				
				function commit() {
					const shouldPush = document.getElementById('shouldPush').checked;
					const commitMessage = document.getElementById('commitMessage').textContent;
					vscode.postMessage({
						action: 'commit',
						commitMessage: commitMessage,
						shouldPush: shouldPush
					});
				}
				
				function editMessage() {
					const commitMessage = document.getElementById('commitMessage').textContent;
					vscode.postMessage({
						action: 'edit',
						commitMessage: commitMessage
					});
				}
				
				function cancel() {
					vscode.postMessage({ action: 'cancel' });
				}

				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'updateMessage') {
						document.getElementById('commitMessage').textContent = message.message;
					}
				});
			</script>
		</body>
		</html>`;
	}

	private getBufferNotificationHtml(options: BufferNotificationOptions): string {
		const { message, status, timeLeft, config } = options;
		const fileCount = status.split('\n').filter(line => line.trim()).length;
		
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>GitCue Commit Buffer</title>
			<style>
				body { 
					font-family: var(--vscode-font-family); 
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					padding: 20px;
					text-align: center;
				}
				.timer {
					font-size: 48px;
					font-weight: bold;
					color: var(--vscode-errorForeground);
					margin: 20px 0;
				}
				.commit-info {
					background: var(--vscode-textCodeBlock-background);
					padding: 20px;
					border-radius: 8px;
					margin: 20px 0;
				}
				.btn {
					padding: 15px 30px;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					font-size: 16px;
					font-weight: bold;
					background: var(--vscode-errorBackground);
					color: var(--vscode-errorForeground);
				}
				.progress {
					width: 100%;
					height: 6px;
					background: var(--vscode-panel-border);
					border-radius: 3px;
					overflow: hidden;
					margin: 20px 0;
				}
				.progress-fill {
					height: 100%;
					background: var(--vscode-errorForeground);
					transition: width 1s linear;
					width: ${(timeLeft / config.bufferTimeSeconds) * 100}%;
				}
			</style>
		</head>
		<body>
			<h1>⏰ Commit Buffer Period</h1>
			<p>GitCue is about to commit your changes</p>
			
			<div class="timer">${timeLeft}</div>
			
			<div class="commit-info">
				<h3>💬 ${message}</h3>
				<p>📁 ${fileCount} files • 🔄 ${config.commitMode} mode • 🚀 ${config.autoPush ? 'Auto-push enabled' : 'No auto-push'}</p>
			</div>
			
			<div class="progress">
				<div class="progress-fill"></div>
			</div>
			
			<p style="margin: 20px 0;">⚠️ Committing in ${timeLeft} seconds...</p>
			
			<button class="btn" onclick="cancelCommit()">
				🚫 Cancel Commit
			</button>
			
			<p style="font-size: 14px; opacity: 0.8; margin-top: 20px;">
				Press 'c', 'x', or Ctrl+X to cancel
			</p>

			<script>
				const vscode = acquireVsCodeApi();

				function cancelCommit() {
					vscode.postMessage({ action: 'cancel' });
				}

				document.addEventListener('keydown', function(e) {
					if (e.key.toLowerCase() === 'c' || e.key.toLowerCase() === 'x') {
						e.preventDefault();
						cancelCommit();
					}
					if (e.ctrlKey && e.key.toLowerCase() === 'x') {
						e.preventDefault();
						cancelCommit();
					}
				});

				document.body.focus();
			</script>
		</body>
		</html>`;
	}
} 