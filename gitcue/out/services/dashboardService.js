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
exports.DashboardService = void 0;
const vscode = __importStar(require("vscode"));
const extensionConfig_1 = require("../config/extensionConfig");
class DashboardService {
    static instance;
    dashboardPanels = [];
    constructor() { }
    static getInstance() {
        if (!DashboardService.instance) {
            DashboardService.instance = new DashboardService();
        }
        return DashboardService.instance;
    }
    createDashboard(onMessage) {
        const panel = vscode.window.createWebviewPanel('gitcueDashboard', 'GitCue Dashboard', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
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
    updateDashboards(state) {
        this.dashboardPanels.forEach(panel => {
            if (panel.visible) {
                panel.webview.postMessage({
                    action: 'statusUpdate',
                    data: state
                });
            }
        });
    }
    createCommitPreview(options, onMessage) {
        const panel = vscode.window.createWebviewPanel('gitcueCommitPreview', 'GitCue: Commit Preview', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getCommitPreviewHtml(options);
        panel.webview.onDidReceiveMessage(onMessage);
        return panel;
    }
    createBufferNotification(options) {
        const panel = vscode.window.createWebviewPanel('gitcueBuffer', 'GitCue Commit Buffer', vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        panel.webview.html = this.getBufferNotificationHtml(options);
        return panel;
    }
    getDashboardHtml() {
        const theme = (0, extensionConfig_1.getTheme)();
        const version = (0, extensionConfig_1.getVersion)();
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
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Text', sans-serif;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					line-height: 1.6;
					overflow-x: hidden;
					min-height: 100vh;
				}
				
				.container {
					max-width: 1400px;
					margin: 0 auto;
					padding: 24px;
				}
				
				/* Header Styles */
				.header {
					background: linear-gradient(135deg, var(--vscode-textCodeBlock-background) 0%, var(--vscode-sideBar-background) 100%);
					border-radius: 16px;
					border: 1px solid var(--vscode-panel-border);
					padding: 32px;
					margin-bottom: 32px;
					position: relative;
					overflow: hidden;
					text-align: center;
				}
				
				.header::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 4px;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-button-background));
				}
				
				.header-icon {
					width: 48px;
					height: 48px;
					margin: 0 auto 16px;
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					border-radius: 12px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					font-size: 24px;
					font-weight: bold;
				}
				
				.title {
					font-size: 36px;
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
					padding: 6px 16px;
					background: var(--vscode-badge-background);
					color: var(--vscode-badge-foreground);
					border-radius: 20px;
					font-size: 12px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.8px;
				}
				
				/* Grid Layout */
				.dashboard-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
					gap: 24px;
					margin-bottom: 32px;
				}
				
				.dashboard-row {
					display: grid;
					grid-template-columns: 2fr 1fr;
					gap: 24px;
					margin-bottom: 24px;
				}
				
				/* Card Styles */
				.card {
					background: var(--vscode-textCodeBlock-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 16px;
					padding: 24px;
					position: relative;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
					backdrop-filter: blur(10px);
					overflow: hidden;
				}
				
				.card::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 2px;
					background: linear-gradient(90deg, transparent, var(--vscode-button-background), transparent);
					opacity: 0;
					transition: opacity 0.3s ease;
				}
				
				.card:hover {
					transform: translateY(-4px);
					box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
					border-color: var(--vscode-focusBorder);
				}
				
				.card:hover::before {
					opacity: 1;
				}
				
				.card-header {
					display: flex;
					align-items: center;
					margin-bottom: 20px;
					padding-bottom: 16px;
					border-bottom: 1px solid var(--vscode-panel-border);
				}
				
				.card-icon {
					width: 32px;
					height: 32px;
					margin-right: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					background: var(--vscode-button-background);
					border-radius: 8px;
					color: white;
					flex-shrink: 0;
				}
				
				.card-title {
					font-size: 18px;
					font-weight: 600;
					color: var(--vscode-foreground);
					margin: 0;
				}
				
				.card-body {
					min-height: 120px;
				}
				
				/* Status Indicators */
				.status-section {
					margin: 16px 0;
				}
				
				.status-indicator {
					display: flex;
					align-items: center;
					margin: 12px 0;
					padding: 12px;
					background: var(--vscode-sideBar-background);
					border-radius: 8px;
					border-left: 3px solid transparent;
					transition: all 0.2s ease;
				}
				
				.status-indicator:hover {
					background: var(--vscode-list-hoverBackground);
				}
				
				.status-indicator.active {
					border-left-color: var(--vscode-testing-iconPassed);
				}
				
				.status-indicator.inactive {
					border-left-color: var(--vscode-testing-iconFailed);
				}
				
				.status-indicator.pending {
					border-left-color: var(--vscode-testing-iconQueued);
				}
				
				.status-dot {
					width: 10px;
					height: 10px;
					border-radius: 50%;
					margin-right: 12px;
					flex-shrink: 0;
				}
				
				.status-dot.active {
					background: var(--vscode-testing-iconPassed);
					animation: pulse 2s infinite;
				}
				
				.status-dot.inactive {
					background: var(--vscode-testing-iconFailed);
				}
				
				.status-dot.pending {
					background: var(--vscode-testing-iconQueued);
					animation: pulse 2s infinite;
				}
				
				.status-text {
					flex: 1;
					font-weight: 500;
				}
				
				.status-value {
					font-weight: 600;
					color: var(--vscode-button-background);
				}
				
				@keyframes pulse {
					0%, 100% { opacity: 1; transform: scale(1); }
					50% { opacity: 0.7; transform: scale(1.1); }
				}
				
				/* Button Styles */
				.btn {
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 12px 20px;
					border: 2px solid transparent;
					border-radius: 10px;
					font-size: 14px;
					font-weight: 500;
					text-decoration: none;
					cursor: pointer;
					transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
					margin: 4px;
					min-width: 140px;
					font-family: inherit;
					outline: none;
					position: relative;
					overflow: hidden;
				}
				
				.btn::before {
					content: '';
					position: absolute;
					top: 0;
					left: -100%;
					width: 100%;
					height: 100%;
					background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
					transition: left 0.5s ease;
				}
				
				.btn:hover::before {
					left: 100%;
				}
				
				.btn-primary {
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					color: white;
					border-color: var(--vscode-button-background);
					box-shadow: 0 4px 12px rgba(54, 209, 220, 0.3);
				}
				
				.btn-primary:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 20px rgba(54, 209, 220, 0.4);
				}
				
				.btn-secondary {
					background: var(--vscode-textCodeBlock-background);
					color: var(--vscode-foreground);
					border-color: var(--vscode-panel-border);
				}
				
				.btn-secondary:hover {
					background: var(--vscode-list-hoverBackground);
					border-color: var(--vscode-focusBorder);
					transform: translateY(-1px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				}
				
				.btn:active {
					transform: translateY(0);
				}
				
				.actions-container {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
					gap: 12px;
					margin-top: 16px;
				}
				
				.btn-icon {
					margin-right: 8px;
					font-size: 16px;
				}
				
				/* Statistics */
				.stats-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
					gap: 16px;
					margin-top: 16px;
				}
				
				.stat-item {
					text-align: center;
					padding: 20px 16px;
					background: var(--vscode-sideBar-background);
					border-radius: 12px;
					border: 1px solid var(--vscode-panel-border);
					transition: all 0.2s ease;
					position: relative;
					overflow: hidden;
				}
				
				.stat-item::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 2px;
					background: var(--vscode-button-background);
					transform: scaleX(0);
					transition: transform 0.3s ease;
				}
				
				.stat-item:hover::before {
					transform: scaleX(1);
				}
				
				.stat-item:hover {
					transform: translateY(-2px);
					box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
				}
				
				.stat-value {
					font-size: 28px;
					font-weight: 700;
					color: var(--vscode-button-background);
					margin-bottom: 6px;
				}
				
				.stat-label {
					font-size: 12px;
					text-transform: uppercase;
					letter-spacing: 0.6px;
					opacity: 0.8;
					font-weight: 500;
				}
				
				/* Activity Log */
				.activity-log {
					max-height: 320px;
					overflow-y: auto;
					border: 1px solid var(--vscode-panel-border);
					border-radius: 12px;
					padding: 16px;
					margin-top: 16px;
					background: var(--vscode-sideBar-background);
				}
				
				.activity-item {
					display: flex;
					align-items: center;
					padding: 12px 0;
					border-bottom: 1px solid var(--vscode-panel-border);
					transition: all 0.2s ease;
				}
				
				.activity-item:last-child {
					border-bottom: none;
				}
				
				.activity-item:hover {
					background: var(--vscode-list-hoverBackground);
					border-radius: 8px;
					margin: 0 -8px;
					padding: 12px 8px;
				}
				
				.activity-item.has-details:hover {
					background: var(--vscode-list-activeSelectionBackground);
				}
				
				.activity-icon {
					width: 24px;
					height: 24px;
					margin-right: 16px;
					border-radius: 6px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 12px;
					font-weight: bold;
					color: white;
					flex-shrink: 0;
				}
				
				.activity-content {
					flex: 1;
					min-width: 0;
				}
				
				#activity-details {
					margin-top: 16px;
					animation: slideIn 0.3s ease;
				}
				
				@keyframes slideIn {
					from {
						opacity: 0;
						transform: translateY(-10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				
				.activity-message {
					font-size: 14px;
					margin-bottom: 4px;
					font-weight: 500;
				}
				
				.activity-time {
					font-size: 12px;
					opacity: 0.7;
				}
				
				/* Loading Animation */
				.loading {
					display: inline-block;
					width: 20px;
					height: 20px;
					border: 2px solid var(--vscode-panel-border);
					border-radius: 50%;
					border-top-color: var(--vscode-button-background);
					animation: spin 1s linear infinite;
				}
				
				@keyframes spin {
					to { transform: rotate(360deg); }
				}
				
				.loading-text {
					display: flex;
					align-items: center;
					justify-content: center;
					padding: 40px;
					color: var(--vscode-descriptionForeground);
				}
				
				/* Full-width cards */
				.card-full {
					grid-column: 1 / -1;
				}
				
				/* Scrollbar Styling */
				.activity-log::-webkit-scrollbar {
					width: 6px;
				}
				
				.activity-log::-webkit-scrollbar-track {
					background: var(--vscode-scrollbarSlider-background);
					border-radius: 3px;
				}
				
				.activity-log::-webkit-scrollbar-thumb {
					background: var(--vscode-scrollbarSlider-hoverBackground);
					border-radius: 3px;
				}
				
				/* Responsive Design */
				@media (max-width: 768px) {
					.dashboard-grid {
						grid-template-columns: 1fr;
					}
					
					.dashboard-row {
						grid-template-columns: 1fr;
					}
					
					.container {
						padding: 16px;
					}
					
					.header {
						padding: 24px 20px;
					}
					
					.title {
						font-size: 28px;
					}
					
					.actions-container {
						grid-template-columns: 1fr;
						gap: 8px;
					}
					
					.btn {
						width: 100%;
						min-width: auto;
					}
					
					.stats-grid {
						grid-template-columns: repeat(2, 1fr);
					}
				}
				
				@media (max-width: 480px) {
					.stats-grid {
						grid-template-columns: 1fr;
					}
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<div class="header-icon">GC</div>
					<h1 class="title">GitCue Dashboard</h1>
					<p class="subtitle">AI-Powered Git Automation & Monitoring</p>
					<span class="version-badge">v${version}</span>
				</div>
				
				<div class="dashboard-row">
					<!-- Status Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
								</svg>
							</div>
							<h3 class="card-title">System Status</h3>
						</div>
						<div class="card-body">
							<div id="status-content">
								<div class="loading-text">
									<div class="loading"></div>
									<span style="margin-left: 12px;">Loading status...</span>
								</div>
							</div>
						</div>
					</div>
					
					<!-- Statistics Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M3 3v18h18"/>
									<path d="M18.7 8l-4.4 4.4-2.6-2.6L6 15.4"/>
									<circle cx="18" cy="8" r="2"/>
								</svg>
							</div>
							<h3 class="card-title">Statistics</h3>
						</div>
						<div class="card-body">
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
					</div>
				</div>
				
				<div class="dashboard-grid">
					<!-- Quick Actions Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
								</svg>
							</div>
							<h3 class="card-title">Quick Actions</h3>
						</div>
						<div class="card-body">
							<div class="actions-container">
								<button class="btn btn-primary" onclick="toggleWatching()">
									<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
										<circle cx="12" cy="12" r="3"/>
									</svg>
									<span id="watch-btn-text">Watch</span>
								</button>
								<button class="btn btn-secondary" onclick="manualCommit()">
									<svg class="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="4"/>
										<path d="M16 8v5a3 3 0 0 0 6 0v-5a4 4 0 1 0-8 8"/>
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
					</div>
					
					<!-- Configuration Card -->
					<div class="card">
						<div class="card-header">
							<div class="card-icon">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="3"/>
									<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
								</svg>
							</div>
							<h3 class="card-title">Configuration</h3>
						</div>
						<div class="card-body">
							<div id="config-content">
								<div class="loading-text">
									<div class="loading"></div>
									<span style="margin-left: 12px;">Loading configuration...</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				
				<!-- Activity Log Card -->
				<div class="card card-full">
					<div class="card-header">
						<div class="card-icon">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14,2 14,8 20,8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
								<polyline points="10,9 9,9 8,9"/>
							</svg>
						</div>
						<h3 class="card-title">Recent Activity</h3>
					</div>
					<div class="card-body">
						<div class="activity-log" id="activity-log">
							<div class="activity-item">
								<div class="activity-icon" style="background: var(--vscode-panel-border);">
									<div class="loading"></div>
								</div>
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
					const configContent = document.getElementById('config-content');
					const watchBtnText = document.getElementById('watch-btn-text');
					const filesChanged = document.getElementById('files-changed');
					
					// Update status content
					statusContent.innerHTML = \`
						<div class="status-section">
							<div class="status-indicator \${data.isWatching ? 'active' : 'inactive'}">
								<div class="status-dot \${data.isWatching ? 'active' : 'inactive'}"></div>
								<span class="status-text">File Watching</span>
								<span class="status-value">\${data.isWatching ? 'Active' : 'Inactive'}</span>
							</div>
							<div class="status-indicator \${data.watchStatus.pendingCommit ? 'pending' : 'inactive'}">
								<div class="status-dot \${data.watchStatus.pendingCommit ? 'pending' : 'inactive'}"></div>
								<span class="status-text">Pending Commit</span>
								<span class="status-value">\${data.watchStatus.pendingCommit ? 'Yes' : 'No'}</span>
							</div>
							<div class="status-indicator \${data.config.geminiApiKey ? 'active' : 'inactive'}">
								<div class="status-dot \${data.config.geminiApiKey ? 'active' : 'inactive'}"></div>
								<span class="status-text">API Status</span>
								<span class="status-value">\${data.config.geminiApiKey ? 'Ready' : 'Not Set'}</span>
							</div>
						</div>
					\`;
					
					// Update configuration content
					configContent.innerHTML = \`
						<div class="status-section">
							<div class="status-indicator">
								<span class="status-text">Commit Mode</span>
								<span class="status-value">\${data.config.commitMode}</span>
							</div>
							<div class="status-indicator">
								<span class="status-text">Auto Push</span>
								<span class="status-value">\${data.config.autoPush ? 'Enabled' : 'Disabled'}</span>
							</div>
							<div class="status-indicator">
								<span class="status-text">Buffer Time</span>
								<span class="status-value">\${data.config.bufferTimeSeconds}s</span>
							</div>
							<div class="status-indicator">
								<span class="status-text">Last Change</span>
								<span class="status-value">\${data.watchStatus.lastChange || 'Never'}</span>
							</div>
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
								<div class="activity-icon" style="background: var(--vscode-panel-border);">
									<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="10"/>
										<line x1="12" y1="8" x2="12" y2="12"/>
										<line x1="12" y1="16" x2="12.01" y2="16"/>
									</svg>
								</div>
								<div class="activity-content">
									<div class="activity-message">No recent activity</div>
									<div class="activity-time">Start watching to see activity</div>
								</div>
							</div>
						\`;
						return;
					}
					
					const recentActivities = activities.slice(-15).reverse();
					activityLog.innerHTML = recentActivities.map((activity, index) => {
						const iconColor = getActivityIconColor(activity.type);
						const iconSvg = getActivityIconSvg(activity.type);
						const hasDetails = activity.type === 'commit' && activity.commitMetadata;
						
						return \`
							<div class="activity-item \${hasDetails ? 'has-details' : ''}" onclick="\${hasDetails ? \`showActivityDetails(\${index})\` : ''}" style="\${hasDetails ? 'cursor: pointer;' : ''}">
								<div class="activity-icon" style="background: \${iconColor};">\${iconSvg}</div>
								<div class="activity-content">
									<div class="activity-message">\${activity.message}</div>
									<div class="activity-time">\${formatTime(activity.timestamp)}\${hasDetails ? ' • Click for details' : ''}</div>
								</div>
							</div>
						\`;
					}).join('');
					
					// Store activities for details view
					window.currentActivities = recentActivities;
				}
				
				function showActivityDetails(index) {
					const activity = window.currentActivities[index];
					if (!activity || !activity.commitMetadata) return;
					
					const metadata = activity.commitMetadata;
					const detailsHtml = \`
						<div style="padding: 16px; background: var(--vscode-editor-background); border-radius: 4px; margin-top: 8px;">
							<h3 style="margin: 0 0 12px 0; color: var(--vscode-foreground);">Commit Details</h3>
							
							<div style="margin-bottom: 12px;">
								<strong>Commit Reason:</strong> <span style="color: var(--vscode-textLink-foreground);">\${metadata.reason.replace('_', ' ').toUpperCase()}</span>
							</div>
							
							<div style="margin-bottom: 12px;">
								<strong>Configuration:</strong>
								<ul style="margin: 4px 0; padding-left: 20px;">
									<li>Mode: \${metadata.config.mode}</li>
									<li>Buffer Time: \${metadata.config.bufferTime}s</li>
									<li>Auto Push: \${metadata.config.autoPush ? 'Yes' : 'No'}</li>
									\${metadata.config.threshold ? \`<li>Threshold: \${metadata.config.threshold}</li>\` : ''}
								</ul>
							</div>
							
							\${metadata.aiAnalysis ? \`
								<div style="margin-bottom: 12px;">
									<strong>AI Analysis:</strong>
									<ul style="margin: 4px 0; padding-left: 20px;">
										<li>Significance: <span style="color: \${metadata.aiAnalysis.significance === 'HIGH' ? 'var(--vscode-testing-iconFailed)' : metadata.aiAnalysis.significance === 'MEDIUM' ? 'var(--vscode-testing-iconQueued)' : 'var(--vscode-testing-iconPassed)'};">\${metadata.aiAnalysis.significance}</span></li>
										<li>Completeness: \${metadata.aiAnalysis.completeness}</li>
										<li>Change Type: \${metadata.aiAnalysis.changeType}</li>
										<li>Reasoning: \${metadata.aiAnalysis.reasoning}</li>
									</ul>
								</div>
							\` : ''}
							
							<div style="margin-bottom: 12px;">
								<strong>Changed Files (\${metadata.changedFiles.length}):</strong>
								<ul style="margin: 4px 0; padding-left: 20px; max-height: 100px; overflow-y: auto;">
									\${metadata.changedFiles.slice(0, 10).map(file => \`<li style="font-family: monospace; font-size: 12px;">\${file}</li>\`).join('')}
									\${metadata.changedFiles.length > 10 ? \`<li>... and \${metadata.changedFiles.length - 10} more</li>\` : ''}
								</ul>
							</div>
							
							<div style="margin-bottom: 12px;">
								<strong>Diff Summary:</strong>
								<pre style="margin: 4px 0; padding: 8px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; overflow-x: auto; font-size: 12px;">\${metadata.diffSummary || 'No diff summary available'}</pre>
							</div>
							
							<button onclick="closeActivityDetails()" style="padding: 6px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">Close</button>
						</div>
					\`;
					
					const detailsContainer = document.getElementById('activity-details');
					if (!detailsContainer) {
						const container = document.createElement('div');
						container.id = 'activity-details';
						container.innerHTML = detailsHtml;
						document.getElementById('activity-log').parentElement.appendChild(container);
					} else {
						detailsContainer.innerHTML = detailsHtml;
						detailsContainer.style.display = 'block';
					}
				}
				
				function closeActivityDetails() {
					const detailsContainer = document.getElementById('activity-details');
					if (detailsContainer) {
						detailsContainer.style.display = 'none';
					}
				}
				
				function getActivityIconColor(type) {
					switch(type) {
						case 'commit': return 'var(--vscode-testing-iconPassed)';
						case 'error': return 'var(--vscode-testing-iconFailed)';
						case 'file_change': return 'var(--vscode-button-background)';
						case 'ai_analysis': return 'var(--vscode-testing-iconQueued)';
						case 'watch_start': return 'var(--vscode-progressBar-background)';
						case 'watch_stop': return 'var(--vscode-testing-iconFailed)';
						default: return 'var(--vscode-panel-border)';
					}
				}
				
				function getActivityIconSvg(type) {
					switch(type) {
						case 'commit': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-5a4 4 0 1 0-8 8"/></svg>';
						case 'error': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
						case 'file_change': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>';
						case 'ai_analysis': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h1m4 0h1m-6 4h6"/></svg>';
						case 'watch_start': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
						case 'watch_stop': return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/></svg>';
						default: return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
					}
				}
				
				function formatTime(timestamp) {
					const date = new Date(timestamp);
					const now = new Date();
					const diffMs = now.getTime() - date.getTime();
					const diffMins = Math.floor(diffMs / 60000);
					const diffHours = Math.floor(diffMins / 60);
					const diffDays = Math.floor(diffHours / 24);

					if (diffMins < 1) {
						return 'Just now';
					} else if (diffMins < 60) {
						return \`\${diffMins}m ago\`;
					} else if (diffHours < 24) {
						return \`\${diffHours}h ago\`;
					} else {
						return \`\${diffDays}d ago\`;
					}
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
    getCommitPreviewHtml(options) {
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
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Text', sans-serif;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					line-height: 1.6;
					padding: 24px;
					min-height: 100vh;
				}
				
				.container {
					max-width: 900px;
					margin: 0 auto;
				}
				
				.header {
					text-align: center;
					margin-bottom: 32px;
					padding: 32px 24px;
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
					height: 4px;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-button-background));
					border-radius: 16px 16px 0 0;
				}
				
				.header-icon {
					width: 48px;
					height: 48px;
					margin: 0 auto 16px;
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					border-radius: 12px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					font-size: 24px;
					font-weight: bold;
				}
				
				.title {
					font-size: 28px;
					font-weight: 700;
					margin-bottom: 8px;
					background: linear-gradient(45deg, var(--vscode-foreground), var(--vscode-textLink-foreground));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
				
				.subtitle {
					opacity: 0.8;
					font-size: 16px;
				}
				
				.stats {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 16px;
					margin: 24px 0;
				}
				
				.stat {
					text-align: center;
					padding: 20px 16px;
					background: var(--vscode-textCodeBlock-background);
					border-radius: 12px;
					border: 1px solid var(--vscode-panel-border);
					transition: all 0.2s ease;
					position: relative;
					overflow: hidden;
				}
				
				.stat::before {
					content: '';
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 2px;
					background: var(--vscode-button-background);
					transform: scaleX(0);
					transition: transform 0.3s ease;
				}
				
				.stat:hover::before {
					transform: scaleX(1);
				}
				
				.stat:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
				}
				
				.stat-value {
					font-size: 24px;
					font-weight: 700;
					color: var(--vscode-button-background);
					margin-bottom: 6px;
				}
				
				.stat-label {
					font-size: 12px;
					text-transform: uppercase;
					opacity: 0.8;
					letter-spacing: 0.6px;
					font-weight: 500;
				}
				
				.section {
					margin: 24px 0;
					padding: 24px;
					background: var(--vscode-textCodeBlock-background);
					border-radius: 16px;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.section-title {
					font-size: 18px;
					font-weight: 600;
					margin-bottom: 20px;
					display: flex;
					align-items: center;
					gap: 12px;
					padding-bottom: 12px;
					border-bottom: 1px solid var(--vscode-panel-border);
				}
				
				.section-icon {
					width: 24px;
					height: 24px;
					color: var(--vscode-button-background);
				}
				
				.commit-message {
					background: var(--vscode-sideBar-background);
					padding: 24px;
					border-radius: 12px;
					border-left: 4px solid var(--vscode-progressBar-background);
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
					font-size: 14px;
					line-height: 1.6;
					position: relative;
					overflow-wrap: break-word;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.changes {
					background: var(--vscode-sideBar-background);
					padding: 20px;
					border-radius: 12px;
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
					font-size: 13px;
					white-space: pre-wrap;
					max-height: 320px;
					overflow-y: auto;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.options {
					display: flex;
					align-items: center;
					gap: 16px;
					padding: 20px;
					background: var(--vscode-sideBar-background);
					border-radius: 12px;
					border: 1px solid var(--vscode-panel-border);
				}
				
				.checkbox-container {
					display: flex;
					align-items: center;
					gap: 12px;
					cursor: pointer;
					font-weight: 500;
				}
				
				.checkbox-container input[type="checkbox"] {
					width: 18px;
					height: 18px;
					accent-color: var(--vscode-button-background);
				}
				
				.actions {
					display: flex;
					gap: 16px;
					justify-content: center;
					margin-top: 32px;
					flex-wrap: wrap;
				}
				
				.btn {
					display: inline-flex;
					align-items: center;
					padding: 14px 28px;
					border: none;
					border-radius: 10px;
					cursor: pointer;
					font-size: 15px;
					font-weight: 500;
					text-decoration: none;
					transition: all 0.3s ease;
					min-width: 160px;
					justify-content: center;
					gap: 10px;
					font-family: inherit;
				}
				
				.btn-primary {
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					color: white;
					box-shadow: 0 4px 12px rgba(54, 209, 220, 0.3);
				}
				
				.btn-primary:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 20px rgba(54, 209, 220, 0.4);
				}
				
				.btn-secondary {
					background: var(--vscode-textCodeBlock-background);
					color: var(--vscode-foreground);
					border: 1px solid var(--vscode-panel-border);
				}
				
				.btn-secondary:hover {
					background: var(--vscode-list-hoverBackground);
					border-color: var(--vscode-focusBorder);
					transform: translateY(-1px);
					box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
				}
				
				.btn-icon {
					font-size: 16px;
				}
				
				@media (max-width: 600px) {
					.actions {
						flex-direction: column;
					}
					
					.stats {
						grid-template-columns: 1fr 1fr;
					}
					
					.btn {
						width: 100%;
					}
				}
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<div class="header-icon">AI</div>
					<h1 class="title">GitCue AI Commit</h1>
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
					<h3 class="section-title">
						<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
						</svg>
						Commit Message
					</h3>
					<div class="commit-message" id="commitMessage">${message}</div>
				</div>

				<div class="section">
					<h3 class="section-title">
						<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14,2 14,8 20,8"/>
							<line x1="16" y1="13" x2="8" y2="13"/>
							<line x1="16" y1="17" x2="8" y2="17"/>
						</svg>
						Changes to Commit
					</h3>
					<div class="changes">${status}</div>
				</div>

				<div class="section">
					<h3 class="section-title">
						<svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="3"/>
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
						</svg>
						Options
					</h3>
					<div class="options">
						<label class="checkbox-container">
							<input type="checkbox" id="shouldPush" ${config.autoPush ? 'checked' : ''}>
							<span>Push to remote repository after commit</span>
						</label>
					</div>
				</div>

				<div class="actions">
					<button class="btn btn-primary" onclick="commit()">
						<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M7 7l10-10M7 7l8 8M7 7l-7 8"/>
						</svg>
						<span>Commit & ${config.autoPush ? 'Push' : 'Save'}</span>
					</button>
					<button class="btn btn-secondary" onclick="editMessage()">
						<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
						</svg>
						<span>Edit Message</span>
					</button>
					<button class="btn btn-secondary" onclick="cancel()">
						<svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="18" y1="6" x2="6" y2="18"/>
							<line x1="6" y1="6" x2="18" y2="18"/>
						</svg>
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
    getBufferNotificationHtml(options) {
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
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Text', sans-serif;
					color: var(--vscode-foreground);
					background: var(--vscode-editor-background);
					padding: 24px;
					text-align: center;
					animation: fadeIn 0.4s ease-out;
					min-height: 100vh;
					display: flex;
					flex-direction: column;
					justify-content: center;
				}
				@keyframes fadeIn {
					from { opacity: 0; transform: translateY(20px); }
					to { opacity: 1; transform: translateY(0); }
				}
				
				.container {
					max-width: 500px;
					margin: 0 auto;
				}
				
				.header-icon {
					width: 64px;
					height: 64px;
					margin: 0 auto 20px;
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					border-radius: 16px;
					display: flex;
					align-items: center;
					justify-content: center;
					color: white;
					font-size: 32px;
					font-weight: bold;
				}
				
				h1 {
					margin: 0 0 12px 0;
					font-size: 28px;
					font-weight: 700;
					background: linear-gradient(45deg, var(--vscode-foreground), var(--vscode-textLink-foreground));
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
				}
				.subtitle {
					margin: 0 0 32px 0;
					opacity: 0.8;
					font-size: 16px;
				}
				.timer {
					font-size: 72px;
					font-weight: 800;
					color: var(--vscode-errorForeground);
					margin: 24px 0;
					font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
					text-shadow: 0 0 20px rgba(255,255,255,0.1);
					transition: all 0.3s ease;
				}
				.timer.warning {
					color: var(--vscode-testing-iconFailed);
					animation: pulse 1s infinite;
				}
				@keyframes pulse {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(1.08); }
				}
				.commit-info {
					background: var(--vscode-textCodeBlock-background);
					padding: 24px;
					border-radius: 16px;
					margin: 24px 0;
					border: 1px solid var(--vscode-panel-border);
					box-shadow: 0 4px 12px rgba(0,0,0,0.1);
				}
				.commit-info h3 {
					margin: 0 0 12px 0;
					font-size: 18px;
					font-weight: 600;
					display: flex;
					align-items: center;
					justify-content: center;
					gap: 8px;
				}
				.commit-info p {
					margin: 0;
					opacity: 0.9;
					font-size: 14px;
				}
				.btn {
					padding: 16px 32px;
					border: none;
					border-radius: 12px;
					cursor: pointer;
					font-size: 16px;
					font-weight: 600;
					background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-progressBar-background));
					color: white;
					transition: all 0.3s ease;
					box-shadow: 0 4px 12px rgba(54, 209, 220, 0.3);
					display: inline-flex;
					align-items: center;
					gap: 8px;
				}
				.btn:hover {
					transform: translateY(-2px);
					box-shadow: 0 8px 20px rgba(54, 209, 220, 0.4);
				}
				.btn:active {
					transform: translateY(0);
					box-shadow: 0 4px 12px rgba(54, 209, 220, 0.3);
				}
				.progress {
					width: 100%;
					height: 12px;
					background: var(--vscode-panel-border);
					border-radius: 6px;
					overflow: hidden;
					margin: 24px 0;
					box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
				}
				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, var(--vscode-progressBar-background), var(--vscode-errorForeground));
					transition: width 1s linear;
					width: 100%;
					border-radius: 6px;
				}
				.warning-text {
					margin: 24px 0;
					font-size: 16px;
					opacity: 0.9;
					font-weight: 500;
				}
				.cancel-hint {
					font-size: 14px;
					opacity: 0.7;
					margin-top: 24px;
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
			<div class="container">
				<div class="header-icon">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12,6 12,12 16,14"/>
					</svg>
				</div>
				
				<h1>Commit Buffer Period</h1>
				<p class="subtitle">
					<span class="status-dot"></span>GitCue is about to commit your changes
				</p>
				
				<div class="timer" id="timer">${timeLeft}</div>
				
				<div class="commit-info">
					<h3>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
						</svg>
						${message}
					</h3>
					<p>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14,2 14,8 20,8"/>
						</svg>
						${fileCount} files • 
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin: 0 4px;">
							<circle cx="12" cy="12" r="3"/>
						</svg>
						${config.commitMode} mode • 
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin: 0 4px;">
							<path d="M7 7l10-10M7 7l8 8M7 7l-7 8"/>
						</svg>
						${config.autoPush ? 'Auto-push enabled' : 'No auto-push'}
					</p>
				</div>
				
				<div class="progress">
					<div class="progress-fill" id="progress-fill"></div>
				</div>
				
				<p class="warning-text" id="warning-text">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
						<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
						<line x1="12" y1="9" x2="12" y2="13"/>
						<line x1="12" y1="17" x2="12.01" y2="17"/>
					</svg>
					Committing in <span id="timer-text">${timeLeft}</span> seconds...
				</p>
				
				<button class="btn" onclick="cancelCommit()">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
					Cancel Commit
				</button>
				
				<p class="cancel-hint">
					Press 'c', 'x', or Ctrl+X to cancel
				</p>
			</div>

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
					const warningIcon = timeLeft <= 5 ? 
						'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' :
						'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
					
					warningElement.innerHTML = warningIcon + 'Committing in <span id="timer-text">' + timeLeft + '</span> seconds...';
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
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboardService.js.map