# GitCue Interactive Sidebar Guide

This guide explains how to test and use the new interactive sidebar features in GitCue v4.0.0.

## 🎯 How to Test Interactive Features

### 1. **Install the Extension**
- Install `gitcue-4.0.0.vsix` in VS Code
- The GitCue sidebar should appear in the activity bar (left side)

### 2. **Dashboard View - Interactive Elements**

#### **Status Overview Card**
- **File Watching Toggle**: Click the "File Watching: ON/OFF" item to toggle watching
- **Files Changed**: When files are changed, click the "X Files Changed" item to commit
- **Status Indicator**: Shows if GitCue is Active or Idle

#### **Quick Actions Panel**
- **Create AI Commit**: Click to generate and create an AI commit
- **Open AI Terminal**: Click to open the AI-powered terminal
- **Web Dashboard**: Click to open the full web dashboard
- **Extension Settings**: Click to open GitCue settings

#### **Repository Info Card**
- **Branch Info**: Click to switch branches (uses git.checkout)
- **Uncommitted Changes**: Click to stage changes (uses git.stage)
- **Staged Changes**: Click to commit staged files

#### **Configuration Panel**
- **Mode Setting**: Click to change commit mode (opens VS Code settings)
- **Auto Push**: Click to toggle auto push setting
- **Buffer Time**: Click to adjust buffer time setting
- **API Setup**: Click to configure API key

### 3. **Activity View - Interactive Elements**

#### **Activity Items**
- **Recent Summary**: Shows session overview
- **Activity Items**: Click items to perform related actions:
  - Error items → Show details
  - File change items → Commit changes
  - Commit items → View commit in git log

### 4. **Settings View - Interactive Elements**

#### **Quick Setup Panel**
- **API Key Setup**: Click to configure API key
- **Commit Mode**: Click to change between intelligent/time-based
- **Auto-Watch**: Click to enable/disable auto-watching

#### **Advanced Settings**
- **Auto Push**: Click to toggle auto push
- **Buffer Time**: Click to adjust timing
- **Rate Limiting**: Click to adjust API rate limits
- **Notifications**: Click to enable/disable notifications

#### **Management Tools**
- **Open All Settings**: Click to open full VS Code settings
- **Reset to Defaults**: Click to reset configuration
- **Export Config**: Click to save current settings to file
- **View Documentation**: Click to open online documentation

## 🔧 Troubleshooting Interactive Features

### **If Items Don't Respond to Clicks:**

1. **Check Extension Status**
   - Ensure GitCue v4.0.0 is properly installed
   - Look for any errors in the VS Code Developer Console

2. **Verify Git Repository**
   - Some features require a Git repository
   - Open a folder with a Git repository

3. **Check Command Registration**
   - All commands should be visible in Command Palette (Ctrl+Shift+P)
   - Search for "GitCue:" to see all available commands

4. **Refresh Views**
   - Right-click on any view and select "Refresh" if available
   - Or use Command Palette: "GitCue: Refresh Views"

### **Visual Indicators for Interactive Items:**

- **Hover Effects**: Items should show hover effects when clickable
- **Tooltips**: Hover over items to see detailed tooltips
- **Icons**: Interactive items have appropriate icons
- **Status Colors**: Different colors indicate different states

## 📋 Testing Checklist

### **Dashboard View**
- [ ] Click "File Watching" to toggle
- [ ] Click "Files Changed" when files exist
- [ ] Click "Create AI Commit" action
- [ ] Click "Open AI Terminal" action
- [ ] Click "Web Dashboard" action
- [ ] Click "Extension Settings" action
- [ ] Click repository branch info
- [ ] Click configuration items

### **Activity View**
- [ ] Click activity items to perform actions
- [ ] Verify activity summary updates
- [ ] Check that error items show details
- [ ] Verify file change items trigger commits

### **Settings View**
- [ ] Click API key setup
- [ ] Click commit mode toggle
- [ ] Click auto-watch toggle
- [ ] Click advanced settings
- [ ] Click management tools
- [ ] Click documentation link

## 🎨 UI/UX Enhancements

### **What You Should See:**
1. **Modern Icons**: Professional SVG icons throughout
2. **Clear Hierarchy**: Organized sections with proper spacing
3. **Interactive Elements**: Obvious clickable items
4. **Visual Feedback**: Hover effects and tooltips
5. **Status Indicators**: Clear visual status representation

### **Better Space Utilization:**
- **Actionable Cards**: Instead of plain text
- **Organized Sections**: Logical grouping of features
- **Contextual Actions**: Actions appear where relevant
- **One-Click Access**: Direct access to all features

## 🚀 New Features to Explore

1. **Enhanced Repository Management**: Direct Git operations from sidebar
2. **Quick Configuration**: Inline settings changes
3. **Smart Activity Tracking**: Contextual actions for activities
4. **Professional UI**: Modern design with proper visual hierarchy
5. **Interactive Status**: Real-time status with actions

## 📞 Support

If interactive features don't work as expected:

1. Check VS Code Developer Console for errors
2. Verify extension installation
3. Ensure you're in a Git repository
4. Try refreshing the views
5. Reinstall the extension if needed

---

*This guide covers the interactive sidebar features in GitCue v4.0.0. All items should be clickable and provide immediate actions or navigation to relevant features.* 