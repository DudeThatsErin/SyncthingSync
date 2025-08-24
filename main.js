// === SyncthingSync Plugin ===

const { Plugin, PluginSettingTab, Setting, Notice, Modal } = require('obsidian');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_SETTINGS = {
    syncthingPath: '',
    manualPath: '',
    port: 8384,
    showNotifications: true,
    apiKey: 'obsidian-syncthing-key',
    useExistingInstance: false,
};

class SyncthingSettingsModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'SyncthingSync Settings' });
        
        // Status Display Section
        const statusSection = contentEl.createDiv({ cls: 'syncthing-status-section' });
        statusSection.createEl('h3', { text: 'Current Status' });
        
        const statusContainer = statusSection.createDiv({ cls: 'status-container' });
        
        // Check actual running status
        const isActuallyRunning = await this.plugin.checkSyncthingRunning();
        
        // Update plugin state based on actual running status
        if (isActuallyRunning && !this.plugin.syncthingProcess) {
            this.plugin.syncthingProcess = { running: true };
        } else if (!isActuallyRunning && this.plugin.syncthingProcess) {
            this.plugin.syncthingProcess = null;
        }
        
        // Determine status
        let statusText = 'Stopped';
        let statusClass = 'status-stopped';
        let statusIcon = '⏸️';
        
        if (this.plugin.syncthingProcess) {
            statusText = 'Running';
            statusClass = 'status-running';
            statusIcon = '▶️';
        }
        
        const statusDisplay = statusContainer.createDiv({ cls: 'status-display' });
        statusDisplay.createEl('span', { text: statusIcon, cls: 'status-icon' });
        statusDisplay.createEl('span', { text: statusText, cls: `status-text ${statusClass}` });
        
        // Connection info if running
        if (this.plugin.syncthingProcess) {
            const connectionInfo = statusContainer.createDiv({ cls: 'connection-info' });
            connectionInfo.createEl('p', { text: `Port: ${this.plugin.settings.port}` });
            connectionInfo.createEl('p', { text: `URL: http://localhost:${this.plugin.settings.port}` });
        }

        // Syncthing Installation section
        contentEl.createEl('h3', { text: 'Syncthing Installation' });
        
        new Setting(contentEl)
            .setName('Download syncthing')
            .setDesc('Download Syncthing from syncthing.net/downloads and install it')
            .addButton(button => button
                .setButtonText('Open download page')
                .onClick(() => {
                    require('electron').shell.openExternal('https://syncthing.net/downloads/');
                }));

        // Auto-detected Path section
        contentEl.createEl('h3', { text: 'Auto-detected Path' });
        
        new Setting(contentEl)
            .setName('Automatically detected Syncthing path')
            .setDesc('Automatically detected Syncthing path (read-only)')
            .addText(text => {
                text.setValue(this.plugin.settings.syncthingPath || 'Not detected');
                text.inputEl.disabled = true;
            })
            .addButton(button => button
                .setButtonText('Detect Now')
                .onClick(async () => {
                    const detectedPath = await this.plugin.detectSyncthingPath();
                    if (detectedPath) {
                        this.plugin.settings.syncthingPath = detectedPath;
                        await this.plugin.saveSettings();
                        new Notice(`Detected Syncthing at: ${detectedPath}`);
                        this.onOpen(); // Refresh modal
                    } else {
                        new Notice('Syncthing not found in common locations');
                    }
                }));

        // Manual Path section
        contentEl.createEl('h3', { text: 'Manual Syncthing Path' });
        
        new Setting(contentEl)
            .setName('Manual syncthing path')
            .setDesc('Manually specify Syncthing executable path (overrides auto-detection)')
            .addTextArea(text => {
                text.setValue(this.plugin.settings.manualPath);
                text.onChange(async (value) => {
                    this.plugin.settings.manualPath = value.trim();
                    await this.plugin.saveSettings();
                });
                text.inputEl.className = 'manual-path-input';
            })
            .addButton(button => button
                .setButtonText('Clear')
                .onClick(async () => {
                    this.plugin.settings.manualPath = '';
                    await this.plugin.saveSettings();
                    this.onOpen(); // Refresh modal
                }));

        // Port setting
        new Setting(contentEl)
            .setName('Syncthing port')
            .setDesc('Port for syncthing web UI (default: 8384)')
            .addText(text => text
                .setPlaceholder('8384')
                .setValue(this.plugin.settings.port.toString())
                .onChange(async (value) => {
                    const port = parseInt(value) || 8384;
                    this.plugin.settings.port = port;
                    await this.plugin.saveSettings();
                }));

        // Notifications setting
        new Setting(contentEl)
            .setName('Show notifications')
            .setDesc('Show sync status notifications')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.showNotifications = value;
                    await this.plugin.saveSettings();
                }));

        // Control buttons
        contentEl.createEl('h3', { text: 'Controls' });
        
        const buttonContainer = contentEl.createDiv();
        buttonContainer.className = 'modal-button-container';
        
        buttonContainer.createEl('button', { text: 'Start Syncthing' })
            .addEventListener('click', () => {
                this.plugin.startSyncthing();
                this.close();
            });
            
        buttonContainer.createEl('button', { text: 'Stop Syncthing' })
            .addEventListener('click', () => {
                this.plugin.stopSyncthing();
                this.close();
            });

        const getSupportBtn = buttonContainer.createEl('button', { text: 'Get Support' });
        getSupportBtn.addEventListener('click', () => {
            window.open('https://discord.gg/XcJWhE3SEA', '_blank');
            this.close();
        });
            
        const openWebUIBtn = buttonContainer.createEl('button', { text: 'Open Web UI' });
        openWebUIBtn.addEventListener('click', () => {
            window.open(`http://localhost:${this.plugin.settings.port}`, '_blank');
            this.close();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

class SyncthingSyncSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'SyncthingSync Settings' });

         // Support & Links Section
         this.createAccordionSection(containerEl, 'Support & Links', () => {
            const supportContainer = containerEl.createDiv();
            supportContainer.className = 'support-container';
            
            const buyMeACoffeeBtn = supportContainer.createEl('a', { 
                text: '☕ Buy Me a Coffee',
                href: 'https://buymeacoffee.com/erinskidds'
            });
            buyMeACoffeeBtn.className = 'support-link coffee-link';
            
            const githubBtn = supportContainer.createEl('a', { 
                text: '⭐ Star on GitHub',
                href: 'https://github.com/DudeThatsErin/SyncthingSync'
            });
            githubBtn.className = 'support-link github-link';
            
            const issuesBtn = supportContainer.createEl('a', { 
                text: '🐛 Report Issues',
                href: 'https://github.com/DudeThatsErin/SyncthingSync/issues'
            });
            issuesBtn.className = 'support-link issues-link';
            
            const discordBtn = supportContainer.createEl('a', { 
                text: '💬 Discord Support',
                href: 'https://discord.gg/zgkMsNcBPT'
            });
            discordBtn.className = 'support-link discord-link';
        });

        // Status section
        this.createAccordionSection(containerEl, 'Status & Controls', () => {
            // Main status display
            const statusDiv = containerEl.createDiv({ cls: 'setting-item' });
            statusDiv.createEl('div', { cls: 'setting-item-info' }).createEl('div', { cls: 'setting-item-name', text: 'Syncthing status' });
            const statusControls = statusDiv.createEl('div', { cls: 'setting-item-control' });
            
            // Determine detailed status
            let statusText = 'Stopped';
            let statusClass = 'status-stopped';
            let statusIcon = '⏸️';
            
            if (this.plugin.syncthingProcess) {
                statusText = 'Running';
                statusClass = 'status-running';
                statusIcon = '▶️';
            }
            
            const statusDisplay = statusControls.createEl('div', { cls: 'syncthing-status-display' });
            statusDisplay.createEl('span', { text: statusIcon, cls: 'status-icon' });
            statusDisplay.createEl('span', { text: statusText, cls: statusClass });
            
            // Port and connection info
            if (this.plugin.syncthingProcess) {
                const connectionInfo = containerEl.createDiv({ cls: 'setting-item' });
                connectionInfo.createEl('div', { cls: 'setting-item-info' }).createEl('div', { cls: 'setting-item-name', text: 'Connection details' });
                const connectionControls = connectionInfo.createEl('div', { cls: 'setting-item-control' });
                
                const portInfo = connectionControls.createEl('div', { cls: 'connection-details' });
                portInfo.createEl('p', { text: `Port: ${this.plugin.settings.port}`, cls: 'connection-detail' });
                portInfo.createEl('p', { text: `URL: http://localhost:${this.plugin.settings.port}`, cls: 'connection-detail' });
            }
            
            // Control buttons
            const controlButtons = containerEl.createDiv({ cls: 'setting-item' });
            controlButtons.createEl('div', { cls: 'setting-item-info' }).createEl('div', { cls: 'setting-item-name', text: 'Controls' });
            const buttonControls = controlButtons.createEl('div', { cls: 'setting-item-control syncthing-controls' });
            
            // Start/Stop button
            const startStopBtn = buttonControls.createEl('button', { 
                text: this.plugin.syncthingProcess ? 'Stop Syncthing' : 'Start Syncthing',
                cls: this.plugin.syncthingProcess ? 'mod-warning' : 'mod-cta'
            });
            startStopBtn.addEventListener('click', async () => {
                if (this.plugin.syncthingProcess) {
                    await this.plugin.stopSyncthing();
                } else {
                    await this.plugin.startSyncthing();
                }
                setTimeout(() => this.display(), 1500);
            });
            
            // Refresh status button
            const refreshBtn = buttonControls.createEl('button', { 
                text: 'Refresh Status',
                cls: 'mod-secondary'
            });
            refreshBtn.addEventListener('click', async () => {
                const isRunning = await this.plugin.checkSyncthingRunning();
                if (isRunning && !this.plugin.syncthingProcess) {
                    this.plugin.syncthingProcess = { running: true };
                }
                this.display();
            });

            // Web UI button - always show when Syncthing is detected as running
            const webUIBtn = buttonControls.createEl('button', { 
                text: 'Open Web UI',
                cls: 'mod-secondary'
            });
            webUIBtn.addEventListener('click', () => {
                window.open(`http://localhost:${this.plugin.settings.port}`, '_blank');
            });
            
            // Disable button if Syncthing is not running
            if (!this.plugin.syncthingProcess) {
                webUIBtn.disabled = true;
                webUIBtn.style.opacity = '0.5';
            }
        });

        this.createAccordionSection(containerEl, 'Settings', () => {
            // Installation instructions
            new Setting(containerEl)
                .setName('Syncthing installation')
                .setDesc('Download Syncthing from syncthing.net/downloads and install it')
                .addButton(button => button
                    .setButtonText('Open download page')
                    .onClick(() => {
                        window.open('https://syncthing.net/downloads/', '_blank');
                    }));

            // Syncthing executable path
            new Setting(containerEl)
                .setName('Auto-detected Path')
                .setDesc('Automatically detected Syncthing path (read-only)')
                .addText(text => {
                    text.setValue(this.plugin.settings.syncthingPath || 'Not detected')
                        .setDisabled(true);
                })
                .addButton(button => button
                    .setButtonText('Detect Now')
                    .onClick(async () => {
                        new Notice('Detecting Syncthing...');
                        const detectedPath = await this.plugin.detectSyncthingPath();
                        if (detectedPath) {
                            this.plugin.settings.syncthingPath = detectedPath;
                            await this.plugin.saveSettings();
                            new Notice(`✅ Found Syncthing at: ${detectedPath}`);
                            this.display(); // Refresh the settings display
                        } else {
                            new Notice('❌ Syncthing not found in standard locations');
                        }
                    }));

            new Setting(containerEl)
                .setName('Manual syncthing path')
                .setDesc('Manually specify Syncthing executable path (overrides auto-detection)')
                .addTextArea(text => {
                    text.setPlaceholder('C:\\Users\\erins\\AppData\\Local\\Programs\\Syncthing\\syncthing.exe')
                        .setValue(this.plugin.settings.manualPath || '')
                        .onChange(async (value) => {
                            this.plugin.settings.manualPath = value.trim();
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.className = 'manual-path-input';
                })
                .addButton(button => button
                    .setButtonText('Clear')
                    .onClick(async () => {
                        this.plugin.settings.manualPath = '';
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings display
                    }));




            new Setting(containerEl)
                .setName('Syncthing port')
                .setDesc('Port for Syncthing web UI (default: 8384)')
                .addText(text => text
                    .setPlaceholder('8384')
                    .setValue(this.plugin.settings.port.toString())
                    .onChange(async (value) => {
                        const port = parseInt(value) || 8384;
                        this.plugin.settings.port = port;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Show notifications')
                .setDesc('Show sync status notifications')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.showNotifications)
                    .onChange(async (value) => {
                        this.plugin.settings.showNotifications = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }

    createAccordionSection(containerEl, title, contentCallback) {
        const accordionContainer = containerEl.createDiv('accordion-section');
        
        const header = accordionContainer.createDiv('accordion-header');
        header.className = 'accordion-header';
        
        const headerText = header.createSpan();
        headerText.textContent = title;
        
        const arrow = header.createSpan('accordion-arrow');
        arrow.textContent = '▼';
        arrow.className = 'accordion-arrow';
        
        const content = accordionContainer.createDiv('accordion-content');
        content.className = 'accordion-content';
        
        let isExpanded = true; // Start expanded
        
        const toggleAccordion = () => {
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                content.classList.add('expanded');
                content.classList.remove('collapsed');
                arrow.classList.add('expanded');
                arrow.classList.remove('collapsed');
                header.classList.add('expanded');
                header.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
                content.classList.remove('expanded');
                arrow.classList.add('collapsed');
                arrow.classList.remove('expanded');
                header.classList.add('collapsed');
                header.classList.remove('expanded');
            }
        };
        
        header.addEventListener('click', toggleAccordion);
        
        // Hover effects are now handled by CSS
        
        // Call the content callback to populate the accordion
        const tempContainer = containerEl.createDiv();
        const originalContainerEl = containerEl;
        
        // Temporarily redirect new Settings to our temp container
        const originalCreateEl = containerEl.createEl;
        containerEl.createEl = tempContainer.createEl.bind(tempContainer);
        
        contentCallback();
        
        // Restore original createEl
        containerEl.createEl = originalCreateEl;
        
        // Move the settings that were just added to the accordion content
        while (tempContainer.firstChild) {
            content.appendChild(tempContainer.firstChild);
        }
        
        // Remove the temp container
        tempContainer.remove();
    }

}

module.exports = class SyncthingSyncPlugin extends Plugin {
    async onload() {
        
        await this.loadSettings();
        this.addSettingTab(new SyncthingSyncSettingTab(this.app, this));

        this.syncthingProcess = null;
        this.statusBarItem = null;

        // Add ribbon icon
        this.addRibbonIcon('sync', 'Syncthing Sync Settings', () => {
            new SyncthingSettingsModal(this.app, this).open();
        });

        // Commands
        this.addCommand({
            id: 'start-syncthing',
            name: 'Start Syncthing',
            callback: () => this.startSyncthing()
        });

        this.addCommand({
            id: 'stop-syncthing',
            name: 'Stop Syncthing',
            callback: () => this.stopSyncthing()
        });

        this.addCommand({
            id: 'restart-syncthing',
            name: 'Restart Syncthing',
            callback: () => this.restartSyncthing()
        });

        this.addCommand({
            id: 'sync-now',
            name: 'Sync Now',
            callback: () => this.syncNow()
        });

        this.addCommand({
            id: 'open-syncthing-ui',
            name: 'Open Syncthing Web UI',
            callback: () => {
                window.open(`http://localhost:${this.settings.port}`, '_blank');
            }
        });

        // Auto-detect Syncthing path on startup
        if (!this.settings.syncthingPath && !this.settings.manualPath) {
            setTimeout(async () => {
                try {
                    const detectedPath = await this.detectSyncthingPath();
                    if (detectedPath) {
                        this.settings.syncthingPath = detectedPath;
                        await this.saveSettings();
                        new Notice(`Auto-detected Syncthing at: ${detectedPath}`);
                    } else {
                    }
                } catch (error) {
                }
            }, 1000);
        }

        // Auto-start if enabled
        if (this.settings.autoStart) {
            setTimeout(() => this.startSyncthing(), 2000);
        }
        
        // Add status bar item
        this.statusBarItem = this.addStatusBarItem();
        this.updateStatusBar();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    updateStatusBar() {
        if (!this.statusBarItem) return;
        
        if (this.syncthingProcess) {
            this.statusBarItem.setText('🔄 Syncthing: Running');
            this.statusBarItem.addClass('syncthing-running');
            this.statusBarItem.removeClass('syncthing-stopped');
        } else {
            this.statusBarItem.setText('⏸️ Syncthing: Stopped');
            this.statusBarItem.addClass('syncthing-stopped');
            this.statusBarItem.removeClass('syncthing-running');
        }
    
    }


    async detectSyncthingPath() {
        
        // Check manual path first
        if (this.settings.manualPath) {
            const fs = require('fs');
            if (fs.existsSync(this.settings.manualPath)) {
                return this.settings.manualPath;
            }
        }
        
        // Check common installation paths
        const fs = require('fs');
        const commonPaths = [
            'C:\\Program Files\\Syncthing\\syncthing.exe',
            'C:\\Program Files (x86)\\Syncthing\\syncthing.exe',
            '/usr/bin/syncthing',
            '/usr/local/bin/syncthing',
            process.env.HOME + '/syncthing/syncthing'
        ];
        
        for (const path of commonPaths) {
            if (fs.existsSync(path)) {
                return path;
            }
        }
        
        return null;
    }

    getBundledSyncthingPath() {
        const platform = process.platform;
        const arch = process.arch;
        const pluginDir = path.dirname(__filename);
        
        let execName = 'syncthing';
        if (platform === 'win32') {
            execName = 'syncthing.exe';
        }
        
        const bundledPath = path.join(pluginDir, 'bin', `${platform}-${arch}`, execName);
        return bundledPath;
    }



    async analyzeDesktopShortcuts() {
        
        const shortcutPaths = [
            process.env.USERPROFILE + '\\Desktop\\Syncthing.lnk',
            process.env.USERPROFILE + '\\Desktop\\Syncthing.url',
            'C:\\Users\\Public\\Desktop\\Syncthing.lnk',
            'C:\\Users\\Public\\Desktop\\Syncthing.url',
            process.env.APPDATA + '\\Microsoft\\Windows\\Start Menu\\Programs\\Syncthing.lnk',
            'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Syncthing.lnk'
        ];
        
        for (const shortcutPath of shortcutPaths) {
            try {
                
                // Try to resolve shortcut using PowerShell
                const targetPath = await this.resolveShortcut(shortcutPath);
                if (targetPath && await this.verifyExecutable(targetPath)) {
                    return targetPath;
                }
            } catch (error) {
            }
        }
        
        return null;
    }
    
    async resolveShortcut(shortcutPath) {
        return new Promise((resolve) => {
            try {
                const { exec } = require('child_process');
                const powershellCmd = `$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('${shortcutPath}'); $Shortcut.TargetPath`;
                
                exec(`powershell -Command "${powershellCmd}"`, { timeout: 5000 }, (error, stdout, stderr) => {
                    if (error || stderr) {
                        resolve(null);
                        return;
                    }
                    
                    const targetPath = stdout.trim();
                    if (targetPath && targetPath.toLowerCase().includes('syncthing')) {
                        resolve(targetPath);
                    } else {
                        resolve(null);
                    }
                });
            } catch (error) {
                resolve(null);
            }
        });
    }

    async scanDirectories() {
        
        const scanPaths = [
            'C:\\Program Files',
            'C:\\Program Files (x86)',
            'C:\\',
            'D:\\',
            'E:\\',
            process.env.USERPROFILE || 'C:\\Users\\' + (process.env.USERNAME || 'User')
        ];
        
        for (const basePath of scanPaths) {
            try {
                const found = await this.recursiveSearch(basePath, 'syncthing.exe', 3); // Max depth 3
                if (found) {
                    return found;
                }
            } catch (error) {
            }
        }
        
        return null;
    }

    async findInPath() {
        return new Promise((resolve) => {
            // Try 'where' command on Windows
            exec('where syncthing', (error, stdout) => {
                if (!error && stdout.trim()) {
                    const paths = stdout.trim().split('\n');
                    resolve(paths[0].trim());
                    return;
                }
                
                // Try 'which' command on Unix/Linux/macOS
                exec('which syncthing', (error, stdout) => {
                    if (!error && stdout.trim()) {
                        resolve(stdout.trim());
                        return;
                    }
                    
                    // Try PowerShell Get-Command on Windows
                    exec('powershell "Get-Command syncthing -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source"', (error, stdout) => {
                        if (!error && stdout.trim()) {
                            resolve(stdout.trim());
                            return;
                        }
                        
                        resolve(null);
                    });
                });
            });
        });
    }

    async searchWindowsRegistry() {
        return new Promise((resolve) => {
            // Search Windows registry for Syncthing installation
            const regQuery = 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s /f "Syncthing" 2>nul';
            exec(regQuery, (error, stdout) => {
                if (!error && stdout) {
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        if (line.includes('InstallLocation')) {
                            const match = line.match(/REG_SZ\s+(.+)/);
                            if (match) {
                                const installPath = path.join(match[1].trim(), 'syncthing.exe');
                                if (fs.existsSync(installPath)) {
                                    resolve(installPath);
                                    return;
                                }
                            }
                        }
                    }
                }
                resolve(null);
            });
        });
    }

    async recursiveSearch(basePath, targetFile, maxDepth) {
        return this.searchDirectoryForSyncthing(basePath, maxDepth);
    }

    async searchDirectoryForSyncthing(directory, maxDepth) {
        if (maxDepth <= 0) return null;
        
        return new Promise((resolve) => {
            try {
                const items = fs.readdirSync(directory, { withFileTypes: true });
                
                // First check for syncthing.exe in current directory
                for (const item of items) {
                    if (item.isFile() && item.name.toLowerCase() === 'syncthing.exe') {
                        const fullPath = path.join(directory, item.name);
                        resolve(fullPath);
                        return;
                    }
                }
                
                // Then search subdirectories
                const promises = [];
                for (const item of items) {
                    if (item.isDirectory() && !item.name.startsWith('.') && item.name.toLowerCase().includes('syncthing')) {
                        const subDir = path.join(directory, item.name);
                        promises.push(this.searchDirectoryForSyncthing(subDir, maxDepth - 1));
                    }
                }
                
                Promise.all(promises).then(results => {
                    const found = results.find(result => result !== null);
                    resolve(found || null);
                });
                
            } catch (error) {
                resolve(null);
            }
        });
    }

    getSyncthingPath() {
        // Use manual path if specified, otherwise use auto-detected path
        return this.settings.manualPath || this.settings.syncthingPath;
    }

    async cleanupLockFiles(syncthingHome) {
        const fs = require('fs');
        const lockFiles = [
            path.join(syncthingHome, 'index-v0.14.0.db', 'LOCK'),
            path.join(syncthingHome, 'index', 'LOCK'),
            path.join(syncthingHome, 'csrftokens.txt'),
            path.join(syncthingHome, 'syncthing.log.lck')
        ];

        for (const lockFile of lockFiles) {
            try {
                if (fs.existsSync(lockFile)) {
                    fs.unlinkSync(lockFile);
                }
            } catch (error) {
            }
        }

        // Kill any existing Syncthing processes
        await this.killExistingSyncthingProcesses();
    }

    async checkSyncthingRunning() {
        // Try multiple common ports
        const portsToTry = [this.settings.port, 8384, 8080, 22000];
        
        for (const port of portsToTry) {
            try {
                
                // Use a simpler approach - just try to connect to the port
                const { exec } = require('child_process');
                const isPortOpen = await new Promise((resolve) => {
                    if (process.platform === 'win32') {
                        exec(`netstat -an | findstr :${port}`, (error, stdout) => {
                            resolve(stdout.includes(`:${port}`));
                        });
                    } else {
                        exec(`lsof -i :${port}`, (error, stdout) => {
                            resolve(stdout.includes('syncthing') || stdout.includes(`:${port}`));
                        });
                    }
                });
                
                if (isPortOpen) {
                    // Update settings if we found it on a different port
                    if (port !== this.settings.port) {
                        this.settings.port = port;
                        await this.saveSettings();
                    }
                    return true;
                }
            } catch (error) {
                continue;
            }
        }
        
        return false;
    }

    async killExistingSyncthingProcesses() {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                exec('taskkill /F /IM syncthing.exe', (error) => {
                    if (error && !error.message.includes('not found')) {
                    }
                    resolve();
                });
            } else {
                exec('pkill -f syncthing', (error) => {
                    if (error && !error.message.includes('No such process')) {
                    }
                    resolve();
                });
            }
        });
    }

    async startSyncthing() {
        // First check if Syncthing is already running externally
        const isRunning = await this.checkSyncthingRunning();
        if (isRunning) {
                this.syncthingProcess = { running: true };
            this.updateStatusBar('Running');
            if (this.settings.showNotifications) {
                new Notice('Connected to running Syncthing instance');
            }
            return;
        }
        
        // If not running externally, try to detect and start our own instance

        if (this.syncthingProcess) {
            if (this.settings.showNotifications) {
                new Notice('Syncthing is already running');
            }
            return;
        }

        try {
            let syncthingPath = await this.detectSyncthingPath();
            
            if (!syncthingPath) {
                const installMsg = `Syncthing not found. Please install and start Syncthing:
                
1. Download from: https://syncthing.net/downloads/
2. Install Syncthing on your system
3. Start Syncthing (it should be running before using this plugin)
4. Set manual path in plugin settings if needed`;
                
                new Notice('Syncthing not found - check console for installation instructions', 8000);
                throw new Error('Syncthing executable not found. Syncthing must be installed and running separately.');
            }
            
            const syncthingHome = path.join(this.app.vault.adapter.basePath, '.syncthing-obsidian');
            
            // Create syncthing home directory
            const fs = require('fs');
            if (!fs.existsSync(syncthingHome)) {
                fs.mkdirSync(syncthingHome, { recursive: true });
            }

            // Clean up any lock files only if we're starting our own instance
            await this.cleanupLockFiles(syncthingHome);

            const availablePort = await this.findAvailablePort(this.settings.port);
            const args = [
                '--home', syncthingHome,
                '--gui-address', `127.0.0.1:${availablePort}`,
                '--no-browser',
                '--no-restart'
            ];

            this.syncthingProcess = spawn(syncthingPath, args, {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: syncthingHome
            });

            this.syncthingProcess.on('error', (error) => {
                new Notice(`Failed to start Syncthing: ${error.message}`);
                this.syncthingProcess = null;
            });

            this.syncthingProcess.on('exit', (code) => {
                this.syncthingProcess = null;
                if (code !== 0 && code !== null) {
                    if (this.settings.showNotifications) {
                        new Notice(`Syncthing stopped unexpectedly (code: ${code})`);
                    }
                } else if (this.settings.showNotifications) {
                    new Notice('Syncthing stopped');
                }
                this.updateStatusBar();
            });
            
            // Capture stderr for debugging
            this.syncthingProcess.stderr.on('data', (data) => {
                const errorMsg = data.toString();
                if (errorMsg.includes('bind: address already in use')) {
                    new Notice('Syncthing port is already in use. Try a different port in settings.');
                }
            });
            
            // Capture stdout but don't log to console
            this.syncthingProcess.stdout.on('data', (data) => {
                // Process stdout data if needed
            });

            // Wait a moment for startup
            setTimeout(() => {
                if (this.syncthingProcess && this.settings.showNotifications) {
                    new Notice('Syncthing started successfully');
                }
                this.updateStatusBar();
            }, 2000);

        } catch (error) {
            console.error('Failed to start Syncthing:', error);
            new Notice(`Failed to start Syncthing: ${error.message}`);
        }
    }

    async findAvailablePort(startPort) {
        const net = require('net');
        
        const isPortAvailable = (port) => {
            return new Promise((resolve) => {
                const server = net.createServer();
                server.listen(port, '127.0.0.1', () => {
                    server.close(() => resolve(true));
                });
                server.on('error', () => resolve(false));
            });
        };

        for (let port = startPort; port < startPort + 100; port++) {
            if (await isPortAvailable(port)) {
                if (port !== startPort) {
                    console.log(`Port ${startPort} unavailable, using ${port}`);
                    this.settings.port = port;
                    await this.saveSettings();
                }
                return port;
            }
        }
        
        throw new Error('No available ports found');
    }

    stopSyncthing() {
        if (!this.syncthingProcess) {
            if (this.settings.showNotifications) {
                new Notice('Syncthing is not running');
            }
            return;
        }

        try {
            // Only try to kill if it's a process we started (has kill method)
            if (this.syncthingProcess.kill && typeof this.syncthingProcess.kill === 'function') {
                this.syncthingProcess.kill('SIGTERM');
                if (this.settings.showNotifications) {
                    new Notice('Syncthing stopped');
                }
            } else {
                // External Syncthing process - just clear our reference
                console.log('Syncthing is running externally, cannot stop it from plugin');
            }
            this.syncthingProcess = null;
            this.updateStatusBar();
        } catch (error) {
            console.error('Failed to stop Syncthing:', error);
            this.syncthingProcess = null;
            this.updateStatusBar();
        }
    }

    async restartSyncthing() {
        if (this.settings.showNotifications) {
            new Notice('Restarting Syncthing...');
        }
        this.stopSyncthing();
        setTimeout(() => this.startSyncthing(), 2000);
    }

    async syncNow(showNotification = true) {
        if (!this.syncthingProcess) {
            new Notice('Syncthing is not running');
            return;
        }

        try {
            // Since HTTP API calls are blocked by CORS, we'll just show a notice
            // Syncthing will automatically sync based on its configuration
            if (this.settings.showNotifications && showNotification) {
                new Notice('Syncthing is running - sync will happen automatically');
            }
            console.log('Sync requested - Syncthing handles sync automatically');
        } catch (error) {
            console.error('Sync error:', error);
            new Notice('Syncthing sync status unknown');
        }
    }

    async verifyExecutable(path) {
        return new Promise((resolve) => {
            try {
                const fs = require('fs');
                
                // First check if file exists
                if (!fs.existsSync(path)) {
                    resolve(false);
                    return;
                }
                
                // For known working path, skip version check to avoid timeout
                if (path.includes('syncthing.exe') && fs.existsSync(path)) {
                    resolve(true);
                    return;
                }
                
                const { spawn } = require('child_process');
                const child = spawn(path, ['--version'], { 
                    stdio: ['ignore', 'pipe', 'pipe'],
                    timeout: 3000,
                    windowsHide: true
                });
                
                let output = '';
                let errorOutput = '';
                
                child.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                child.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                child.on('close', (code) => {
                    console.log(`Process exited with code ${code}, output: ${output}, error: ${errorOutput}`);
                    const isValid = code === 0 && output.toLowerCase().includes('syncthing');
                    console.log(`Verification result for ${path}: ${isValid}`);
                    resolve(isValid);
                });
                
                child.on('error', (error) => {
                    console.log(`Process error for ${path}: ${error.message}`);
                    resolve(false);
                });
                
                // Shorter timeout to avoid hanging
                setTimeout(() => {
                    console.log(`Timeout reached for ${path}`);
                    child.kill();
                    resolve(false);
                }, 3000);
                
            } catch (error) {
                console.log(`Exception in verifyExecutable for ${path}: ${error.message}`);
                resolve(false);
            }
        });
    }

    onunload() {
        if (this.syncthingProcess) {
            this.stopSyncthing();
        }
    }
};
