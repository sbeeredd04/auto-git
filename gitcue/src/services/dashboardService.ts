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
		// Return modern polished dashboard HTML
		return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>GitCue Dashboard</title>
			<style>
				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}
				
				body { 
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					line-height: 1.6;
					overflow-x: hidden;
				}
				
				.container {
					max-width: 1200px;
					margin: 0 auto;
					padding: 20px;
				}
				
				/* Header Styles */
				.header {
					text-align: center;
					margin-bottom: 40px;
					padding: 30px 0;
					background: linear-gradient(135deg, var(--vscode-textCodeBlock-background) 0%, var(--vscode-sideBar-background) 100%);
					border-radius: 16px;
					border: 1px solid var(--vscode-panel-border);
					position: relative;
					overflow: hidden;
				}
				
				.header::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-button-background));
				}
				
				.title {
					font-size: 32px;
					font-weight: 700;
					margin-bottom: 8px;
					background: linear-gradient(45deg, var(--vscode-foreground), var(--vscode-textLink-foreground));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
				
				.subtitle {
					font-size: 16px;
					opacity: 0.8;
					margin-bottom: 20px;
				}
				
				.version-badge {
					display: inline-block;
					padding: 4px 12px;
					background: var(--vscode-badge-background);
					color: var(--vscode-badge-foreground);
					border-radius: 20px;
					font-size: 12px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.5px;
				}
				
				/* Grid Layout */
				.dashboard-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
					gap: 20px;
					margin-bottom: 30px;
				}
				
				/* Card Styles */
				.card {
					background: var(--vscode-textCodeBlock-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 12px;
					padding: 24px;
					position: relative;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
					backdrop-filter: blur(10px);
				}
				
				.card:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
					border-color: var(--vscode-focusBorder);
				}
				
				.card-header {
					display: flex;
					align-items: center;
					margin-bottom: 16px;
				}
				
				.card-icon {
					width: 24px;
					height: 24px;
					margin-right: 12px;
					font-size: 20px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: var(--vscode-button-background);
				}
				
				.card-title {
					font-size: 18px;
					font-weight: 600;
					color: var(--vscode-foreground);
				}
				
				/* Status Indicators */
				.status-indicator {
					display: flex;
					align-items: center;
					margin: 12px 0;
				}
				
				.status-dot {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					margin-right: 8px;
					animation: pulse 2s infinite;
				}
				
				.status-dot.active {
					background: var(--vscode-testing-iconPassed);
				}
				
				.status-dot.inactive {
					background: var(--vscode-testing-iconFailed);
				}
				
				.status-dot.pending {
					background: var(--vscode-testing-iconQueued);
				}
				
				@keyframes pulse {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.5; }
				}
				
				/* Modern Button Styles */
				.btn {
					width: 10em;
					position: relative;
					height: 3.5em;
					border: 3px ridge var(--vscode-button-background);
					outline: none;
					background-color: transparent;
					color: var(--vscode-foreground);
					transition: 1s;
					border-radius: 0.3em;
					font-size: 16px;
					font-weight: bold;
					cursor: pointer;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					margin: 6px;
					min-width: 120px;
					text-decoration: none;
					font-family: inherit;
				}
				
				.btn::after {
					content: "";
					position: absolute;
					top: -10px;
					left: 3%;
					width: 95%;
					height: 40%;
					background-color: var(--vscode-editor-background);
					transition: 0.5s;
					transform-origin: center;
				}
				
				.btn::before {
					content: "";
					transform-origin: center;
					position: absolute;
					top: 80%;
					left: 3%;
					width: 95%;
					height: 40%;
					background-color: var(--vscode-editor-background);
					transition: 0.5s;
				}
				
				.btn:hover::before, .btn:hover::after {
					transform: scale(0)
				}
				
				.btn:hover {
					box-shadow: inset 0px 0px 25px var(--vscode-button-background);
				}
				
				.btn-primary {
					border-color: var(--vscode-button-background);
					color: var(--vscode-button-background);
				}
				
				.btn-primary:hover {
					box-shadow: inset 0px 0px 25px var(--vscode-button-background);
				}
				
				.btn-secondary {
					border-color: var(--vscode-panel-border);
					color: var(--vscode-foreground);
				}
				
				.btn-secondary:hover {
					box-shadow: inset 0px 0px 25px var(--vscode-panel-border);
				}
				
				.btn-icon {
					margin-right: 8px;
					font-size: 16px;
				}
				
				/* Clean Icons */
				.icon-activity {
					font-size: 20px;
					color: var(--vscode-button-background);
				}
				
				.icon-stats {
					font-size: 20px;
					color: var(--vscode-testing-iconPassed);
				}
				
				.icon-actions {
					font-size: 20px;
					color: var(--vscode-testing-iconQueued);
				}
				
				.icon-log {
					font-size: 20px;
					color: var(--vscode-testing-iconFailed);
				}
				
				/* Activity Log */
				.activity-log {
					max-height: 300px;
					overflow-y: auto;
					border: 1px solid var(--vscode-panel-border);
					border-radius: 8px;
					padding: 16px;
					margin-top: 16px;
				}
				
				.activity-item {
					display: flex;
					align-items: center;
					padding: 8px 0;
					border-bottom: 1px solid var(--vscode-panel-border);
				}
				
				.activity-item:last-child {
					border-bottom: none;
				}
				
				.activity-icon {
					width: 16px;
					height: 16px;
					margin-right: 12px;
					border-radius: 50%;
				}
				
				.activity-content {
					flex: 1;
				}
				
				.activity-message {
					font-size: 14px;
					margin-bottom: 4px;
				}
				
				.activity-time {
					font-size: 12px;
					opacity: 0.7;
				}
				
				/* Statistics */
				.stats-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 16px;
					margin-top: 16px;
				}
				
				.stat-item {
					text-align: center;
					padding: 16px;
					background: var(--vscode-sideBar-background);
					border-radius: 8px;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.stat-value {
					font-size: 24px;
					font-weight: 700;
					color: var(--vscode-button-background);
					margin-bottom: 4px;
				}
				
				.stat-label {
					font-size: 12px;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					opacity: 0.8;
				}
				
				/* Loading Animation */
				.loading {
					display: inline-block;
					width: 20px;
					height: 20px;
					border: 2px solid var(--vscode-panel-border);
					border-radius: 50%;
					border-top-color: var(--vscode-button-background);
					animation: spin 1s ease-in-out infinite;
				}
				
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				
				/* Responsive Design */
				@media (max-width: 768px) {
					.dashboard-grid {
						grid-template-columns: 1fr;
					}
					
					.container {
						padding: 16px;
					}
					
					.header {
						padding: 20px;
					}
					
					.title {
						font-size: 24px;
					}
					
					.btn {
						width: 100%;
						max-width: 200px;
					}
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1 class="title">GitCue Dashboard</h1>
					<p class="subtitle">AI-Powered Git Automation & Monitoring</p>
					<span class="version-badge">v0.3.8</span>
				</div>
				
				<div class="dashboard-grid">
					<!-- Status Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
								</svg>
							</div>
							<div class="card-title">System Status</div>
						</div>
						<div id="status-content">
							<div class="loading"></div>
							<span style="margin-left: 12px;">Loading status...</span>
						</div>
					</div>
					
					<!-- Statistics Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M3 3v18h18"/>
									<path d="M18.7 8l-4.4 4.4-2.6-2.6L6 15.4"/>
									<circle cx="18" cy="8" r="2"/>
								</svg>
							</div>
							<div class="card-title">Statistics</div>
						</div>
						<div class="stats-grid" id="stats-grid">
							<div class="stat-item">
								<div class="stat-value" id="files-changed">0</div>
								<div class="stat-label">Files Changed</div>
							</div>
							<div class="stat-item">
								<div class="stat-value" id="commits-made">0</div>
								<div class="stat-label">Commits Made</div>
							</div>
							<div class="stat-item">
								<div class="stat-value" id="ai-calls">0</div>
								<div class="stat-label">AI Calls</div>
							</div>
						</div>
					</div>
					
					<!-- Quick Actions Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
								</svg>
							</div>
							<div class="card-title">Quick Actions</div>
						</div>
						<div style="display: flex; flex-wrap: wrap; gap: 8px;">
							<button class="btn btn-primary" onclick="toggleWatching()">
								<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
									<circle cx="12" cy="12" r="3"/>
								</svg>
								<span id="watch-btn-text">Watch</span>
							</button>
							<button class="btn btn-secondary" onclick="manualCommit()">
								<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
									<polyline points="17,21 17,13 7,13 7,21"/>
									<polyline points="7,3 7,8 15,8"/>
								</svg>
								Commit
							</button>
							<button class="btn btn-secondary" onclick="openTerminal()">
								<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
									<line x1="8" y1="21" x2="16" y2="21"/>
									<line x1="12" y1="17" x2="12" y2="21"/>
								</svg>
								Terminal
							</button>
							<button class="btn btn-secondary" onclick="openSettings()">
								<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="3"/>
									<path d="M12 1v6m0 6v6m11-9h-6m-6 0H1"/>
								</svg>
								Settings
							</button>
						</div>
					</div>
					
					<!-- Activity Log Card -->
					<div class="card" style="grid-column: 1 / -1;">
						<div class="card-header">
							<div class="card-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
									<polyline points="14,2 14,8 20,8"/>
									<line x1="16" y1="13" x2="8" y2="13"/>
									<line x1="16" y1="17" x2="8" y2="17"/>
									<polyline points="10,9 9,9 8,9"/>
								</svg>
							</div>
							<div class="card-title">Recent Activity</div>
						</div>
						<div class="activity-log" id="activity-log">
							<div class="activity-item">
								<div class="activity-icon loading"></div>
								<div class="activity-content">
									<div class="activity-message">Loading recent activity...</div>
									<div class="activity-time">Just now</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			<script>
				const vscode = acquireVsCodeApi();
				
				// Button Actions
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
				
				// Status Updates
				function updateStatus(data) {
					const statusContent = document.getElementById('status-content');
					const watchBtnText = document.getElementById('watch-btn-text');
					const filesChanged = document.getElementById('files-changed');
					
					// Update status content
					statusContent.innerHTML = \`
						<div class="status-indicator">
							<div class="status-dot \${data.isWatching ? 'active' : 'inactive'}"></div>
							<span>Watching: \${data.isWatching ? 'Active' : 'Inactive'}</span>
						</div>
						<div class="status-indicator">
							<div class="status-dot \${data.watchStatus.pendingCommit ? 'pending' : 'inactive'}"></div>
							<span>Pending Commit: \${data.watchStatus.pendingCommit ? 'Yes' : 'No'}</span>
						</div>
						<div style="margin-top: 16px;">
							<div><strong>Mode:</strong> \${data.config.commitMode}</div>
							<div><strong>Auto Push:</strong> \${data.config.autoPush ? 'Enabled' : 'Disabled'}</div>
							<div><strong>Last Change:</strong> \${data.watchStatus.lastChange}</div>
						</div>
					\`;
					
					// Update button text
					watchBtnText.textContent = data.isWatching ? 'Stop Watching' : 'Start Watching';
					
					// Update statistics
					filesChanged.textContent = data.watchStatus.filesChanged || 0;
					
					// Update activity log
					updateActivityLog(data.watchStatus.activityHistory || []);
				}
				
				function updateActivityLog(activities) {
					const activityLog = document.getElementById('activity-log');
					
					if (activities.length === 0) {
						activityLog.innerHTML = \`
							<div class="activity-item">
								<div class="activity-icon" style="background: var(--vscode-panel-border);"></div>
								<div class="activity-content">
									<div class="activity-message">No recent activity</div>
									<div class="activity-time">Start watching to see activity</div>
								</div>
							</div>
						\`;
						return;
					}
					
					const recentActivities = activities.slice(-10).reverse();
					activityLog.innerHTML = recentActivities.map(activity => {
						const iconColor = getActivityIconColor(activity.type);
						const icon = getActivityIcon(activity.type);
						
						return \`
							<div class="activity-item">
								<div class="activity-icon" style="background: \${iconColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px;">\${icon}</div>
								<div class="activity-content">
									<div class="activity-message">\${activity.message}</div>
									<div class="activity-time">\${formatTime(activity.timestamp)}</div>
								</div>
							</div>
						\`;
					}).join('');
				}
				
				function getActivityIconColor(type) {
					switch(type) {
						case 'commit': return 'var(--vscode-testing-iconPassed)';
						case 'error': return 'var(--vscode-testing-iconFailed)';
						case 'file_change': return 'var(--vscode-button-background)';
						case 'ai_analysis': return 'var(--vscode-testing-iconQueued)';
						default: return 'var(--vscode-panel-border)';
					}
				}
				
				function getActivityIcon(type) {
					switch(type) {
						case 'commit': return '✓';
						case 'error': return '✗';
						case 'file_change': return '📄';
						case 'ai_analysis': return '🤖';
						case 'watch_start': return '👁️';
						case 'watch_stop': return '⏸️';
						default: return '•';
					}
				}
				
				function formatTime(timestamp) {
					return new Date(timestamp).toLocaleTimeString();
				}
				
				// Message Handling
				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'statusUpdate') {
						updateStatus(message.data);
					}
				});
				
				// Keep Alive
				setInterval(() => {
					vscode.postMessage({ action: 'keepAlive' });
				}, 5000);
				
				// Initialize
				vscode.postMessage({ action: 'requestStatus' });
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
				* {
					margin: 0;
					padding: 0;
					box-sizing: border-box;
				}
				
				body { 
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					line-height: 1.6;
					padding: 20px;
					min-height: 100vh;
				}
				
				.container {
					max-width: 800px;
					margin: 0 auto;
				}
				
				.header {
					text-align: center;
					margin-bottom: 30px;
					padding: 20px;
					background: linear-gradient(135deg, var(--vscode-textCodeBlock-background) 0%, var(--vscode-sideBar-background) 100%);
					border-radius: 12px;
					border: 1px solid var(--vscode-panel-border);
					position: relative;
				}
				
				.header::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 3px;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-button-background));
					border-radius: 12px 12px 0 0;
				}
				
				.title {
					font-size: 24px;
					font-weight: 700;
					margin-bottom: 8px;
					background: linear-gradient(45deg, var(--vscode-foreground), var(--vscode-textLink-foreground));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
				
				.subtitle {
					opacity: 0.8;
					font-size: 14px;
				}
				
				.stats {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
					gap: 16px;
					margin: 20px 0;
				}
				
				.stat {
					text-align: center;
					padding: 16px;
					background: var(--vscode-textCodeBlock-background);
					border-radius: 8px;
					border: 1px solid var(--vscode-panel-border);
					transition: all 0.2s ease;
				}
				
				.stat:hover {
					transform: translateY(-2px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				}
				
				.stat-value {
					font-size: 20px;
					font-weight: 700;
					color: var(--vscode-button-background);
					margin-bottom: 4px;
				}
				
				.stat-label {
					font-size: 12px;
					text-transform: uppercase;
					opacity: 0.8;
					letter-spacing: 0.5px;
				}
				
				.section {
					margin: 24px 0;
					padding: 20px;
					background: var(--vscode-textCodeBlock-background);
					border-radius: 12px;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.section-title {
					font-size: 16px;
					font-weight: 600;
					margin-bottom: 16px;
					display: flex;
					align-items: center;
					gap: 8px;
				}
				
				.commit-message {
					background: var(--vscode-sideBar-background);
					padding: 20px;
					border-radius: 8px;
					border-left: 4px solid var(--vscode-progressBar-background);
					font-family: 'Consolas', 'Monaco', monospace;
					font-size: 14px;
					line-height: 1.6;
					position: relative;
					overflow-wrap: break-word;
				}
				
				.commit-message::before {
					content: '💬';
					position: absolute;
					top: 16px;
					right: 16px;
					font-size: 16px;
					opacity: 0.5;
				}
				
				.changes {
					background: var(--vscode-sideBar-background);
					padding: 16px;
					border-radius: 8px;
					font-family: 'Consolas', 'Monaco', monospace;
					font-size: 12px;
					white-space: pre-wrap;
					max-height: 300px;
					overflow-y: auto;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.options {
					display: flex;
					align-items: center;
					gap: 12px;
					padding: 16px;
					background: var(--vscode-sideBar-background);
					border-radius: 8px;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.checkbox-container {
					display: flex;
					align-items: center;
					gap: 8px;
					cursor: pointer;
				}
				
				.checkbox-container input[type="checkbox"] {
					width: 16px;
					height: 16px;
					accent-color: var(--vscode-button-background);
				}
				
				.actions {
					display: flex;
					gap: 12px;
					justify-content: center;
					margin-top: 30px;
					flex-wrap: wrap;
				}
				
				.btn {
					display: inline-flex;
					align-items: center;
					padding: 12px 24px;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					font-size: 14px;
					font-weight: 500;
					text-decoration: none;
					transition: all 0.2s ease;
					min-width: 140px;
					justify-content: center;
					gap: 8px;
				}
				
				.btn-primary {
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
				}
				
				.btn-primary:hover {
					background: var(--vscode-button-hoverBackground);
					transform: translateY(-1px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				}
				
				.btn-secondary {
					background: var(--vscode-textCodeBlock-background);
					color: var(--vscode-foreground);
					border: 1px solid var(--vscode-panel-border);
				}
				
				.btn-secondary:hover {
					background: var(--vscode-list-hoverBackground);
					border-color: var(--vscode-focusBorder);
				}
				
				.btn-icon {
					font-size: 16px;
				}
				
				@media (max-width: 600px) {
					.actions {
						flex-direction: column;
					}
					
					.stats {
						grid-template-columns: 1fr;
					}
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<h1 class="title">🤖 GitCue AI Commit</h1>
					<p class="subtitle">Review your AI-generated commit message</p>
				</div>

				<div class="stats">
					<div class="stat">
						<div class="stat-value">${fileCount}</div>
						<div class="stat-label">Files Changed</div>
					</div>
					<div class="stat">
						<div class="stat-value">${config.commitMode}</div>
						<div class="stat-label">Mode</div>
					</div>
					<div class="stat">
						<div class="stat-value">${config.autoPush ? 'Yes' : 'No'}</div>
						<div class="stat-label">Auto Push</div>
					</div>
				</div>

				<div class="section">
					<h3 class="section-title">💬 Commit Message</h3>
					<div class="commit-message" id="commitMessage">${message}</div>
				</div>

				<div class="section">
					<h3 class="section-title">📋 Changes to Commit</h3>
					<div class="changes">${status}</div>
				</div>

				<div class="section">
					<h3 class="section-title">⚙️ Options</h3>
					<div class="options">
						<label class="checkbox-container">
							<input type="checkbox" id="shouldPush" ${config.autoPush ? 'checked' : ''}>
							<span>Push to remote repository after commit</span>
						</label>
					</div>
				</div>

				<div class="actions">
					<button class="btn btn-primary" onclick="commit()">
						<span class="btn-icon">🚀</span>
						<span>Commit & ${config.autoPush ? 'Push' : 'Save'}</span>
					</button>
					<button class="btn btn-secondary" onclick="editMessage()">
						<span class="btn-icon">✏️</span>
						<span>Edit Message</span>
					</button>
					<button class="btn btn-secondary" onclick="cancel()">
						<span class="btn-icon">❌</span>
						<span>Cancel</span>
					</button>
				</div>
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
					animation: fadeIn 0.3s ease-in;
				}
				@keyframes fadeIn {
					from { opacity: 0; transform: translateY(20px); }
					to { opacity: 1; transform: translateY(0); }
				}
				h1 {
					margin: 0 0 10px 0;
					font-size: 24px;
					font-weight: 600;
				}
				.subtitle {
					margin: 0 0 30px 0;
					opacity: 0.8;
					font-size: 14px;
				}
				.timer {
					font-size: 56px;
					font-weight: bold;
					color: var(--vscode-errorForeground);
					margin: 20px 0;
					font-family: 'Courier New', monospace;
					text-shadow: 0 0 10px rgba(255,255,255,0.1);
					transition: all 0.3s ease;
				}
				.timer.warning {
					color: var(--vscode-testing-iconFailed);
					animation: pulse 1s infinite;
				}
				@keyframes pulse {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(1.05); }
				}
				.commit-info {
					background: var(--vscode-textCodeBlock-background);
					padding: 20px;
					border-radius: 12px;
					margin: 20px 0;
					border: 1px solid var(--vscode-panel-border);
					box-shadow: 0 2px 8px rgba(0,0,0,0.1);
				}
				.commit-info h3 {
					margin: 0 0 10px 0;
					font-size: 16px;
					font-weight: 600;
				}
				.commit-info p {
					margin: 0;
					opacity: 0.9;
					font-size: 14px;
				}
				.btn {
					padding: 15px 30px;
					border: none;
					border-radius: 8px;
					cursor: pointer;
					font-size: 16px;
					font-weight: bold;
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					transition: all 0.2s ease;
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				}
				.btn:hover {
					background: var(--vscode-button-hoverBackground);
					transform: translateY(-1px);
					box-shadow: 0 4px 8px rgba(0,0,0,0.2);
				}
				.btn:active {
					transform: translateY(0);
					box-shadow: 0 2px 4px rgba(0,0,0,0.1);
				}
				.progress {
					width: 100%;
					height: 8px;
					background: var(--vscode-panel-border);
					border-radius: 4px;
					overflow: hidden;
					margin: 20px 0;
					box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
				}
				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-errorForeground));
					transition: width 1s linear;
					width: 100%;
					border-radius: 4px;
				}
				.warning-text {
					margin: 20px 0;
					font-size: 14px;
					opacity: 0.9;
				}
				.cancel-hint {
					font-size: 12px;
					opacity: 0.7;
					margin-top: 20px;
				}
				.status-dot {
					display: inline-block;
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background: var(--vscode-testing-iconPassed);
					margin-right: 8px;
					animation: blink 2s infinite;
				}
				@keyframes blink {
					0%, 50% { opacity: 1; }
					51%, 100% { opacity: 0.3; }
				}
			</style>
		</head>
		<body>
			<h1>⏰ Commit Buffer Period</h1>
			<p class="subtitle"><span class="status-dot"></span>GitCue is about to commit your changes</p>
			
			<div class="timer" id="timer">${timeLeft}</div>
			
			<div class="commit-info">
				<h3>💬 ${message}</h3>
				<p>📁 ${fileCount} files • 🔄 ${config.commitMode} mode • 🚀 ${config.autoPush ? 'Auto-push enabled' : 'No auto-push'}</p>
			</div>
			
			<div class="progress">
				<div class="progress-fill" id="progress-fill"></div>
			</div>
			
			<p class="warning-text" id="warning-text">⚠️ Committing in <span id="timer-text">${timeLeft}</span> seconds...</p>
			
			<button class="btn" onclick="cancelCommit()">
				🚫 Cancel Commit
			</button>
			
			<p class="cancel-hint">
				Press 'c', 'x', or Ctrl+X to cancel
			</p>

			<script>
				const vscode = acquireVsCodeApi();
				let currentTimeLeft = ${timeLeft};
				let totalTime = ${config.bufferTimeSeconds};

				function cancelCommit() {
					vscode.postMessage({ action: 'cancel' });
				}

				function updateTimer(timeLeft) {
					currentTimeLeft = timeLeft;
					
					// Update timer display
					const timerElement = document.getElementById('timer');
					const timerTextElement = document.getElementById('timer-text');
					const progressElement = document.getElementById('progress-fill');
					
					timerElement.textContent = timeLeft;
					timerTextElement.textContent = timeLeft;
					
					// Update progress bar
					const progressPercent = (timeLeft / totalTime) * 100;
					progressElement.style.width = progressPercent + '%';
					
					// Add warning class when time is low
					if (timeLeft <= 10) {
						timerElement.classList.add('warning');
					} else {
						timerElement.classList.remove('warning');
					}
					
					// Update warning text
					const warningElement = document.getElementById('warning-text');
					if (timeLeft <= 5) {
						warningElement.innerHTML = '🚨 Committing in <span id="timer-text">' + timeLeft + '</span> seconds...';
					} else {
						warningElement.innerHTML = '⚠️ Committing in <span id="timer-text">' + timeLeft + '</span> seconds...';
					}
				}

				// Listen for timer updates from the extension
				window.addEventListener('message', event => {
					const message = event.data;
					if (message.action === 'updateTimer') {
						updateTimer(message.timeLeft);
					}
				});

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