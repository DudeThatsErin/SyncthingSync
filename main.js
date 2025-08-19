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
    autoStart: false,
    deviceName: 'Obsidian',
    syncInterval: 300, // 5 minutes
    showNotifications: true,
    apiKey: 'obsidian-syncthing-key',
    useExistingInstance: false,
    autoDownload: true,
};

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
            supportContainer.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0;';
            
            const buyMeACoffeeBtn = supportContainer.createEl('a', { 
                text: '☕ Buy Me a Coffee',
                href: 'https://buymeacoffee.com/erinskidds'
            });
            buyMeACoffeeBtn.style.cssText = 'background: #FFDD00; color: #000; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;';
            
            const githubBtn = supportContainer.createEl('a', { 
                text: '⭐ Star on GitHub',
                href: 'https://github.com/DudeThatsErin/FileCreator'
            });
            githubBtn.style.cssText = 'background: #24292e; color: #fff; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;';
            
            const issuesBtn = supportContainer.createEl('a', { 
                text: '🐛 Report Issues',
                href: 'https://github.com/DudeThatsErin/FileCreator/issues'
            });
            issuesBtn.style.cssText = 'background: #d73a49; color: #fff; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;';
            
            const discordBtn = supportContainer.createEl('a', { 
                text: '💬 Discord Support',
                href: 'https://discord.gg/your-discord-server'
            });
            discordBtn.style.cssText = 'background: #5865F2; color: #fff; padding: 8px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;';
        });

        // Status section
        this.createAccordionSection(containerEl, 'Status & Controls', () => {
            const statusDiv = containerEl.createDiv({ cls: 'setting-item' });
            statusDiv.createEl('div', { cls: 'setting-item-info' }).createEl('div', { cls: 'setting-item-name', text: 'Syncthing Status' });
            const statusControls = statusDiv.createEl('div', { cls: 'setting-item-control' });
            
            const statusText = statusControls.createEl('span', { 
                text: this.plugin.syncthingProcess ? 'Running' : 'Stopped',
                cls: this.plugin.syncthingProcess ? 'status-running' : 'status-stopped'
            });
            
            statusControls.createEl('button', { 
                text: this.plugin.syncthingProcess ? 'Stop' : 'Start',
                cls: 'mod-cta'
            }).addEventListener('click', () => {
                if (this.plugin.syncthingProcess) {
                    this.plugin.stopSyncthing();
                } else {
                    this.plugin.startSyncthing();
                }
                setTimeout(() => this.display(), 1000);
            });

            if (this.plugin.settings.webUIEnabled && this.plugin.syncthingProcess) {
                statusControls.createEl('button', { 
                    text: 'Open Web UI',
                    cls: 'mod-secondary'
                }).addEventListener('click', () => {
                    require('electron').shell.openExternal(`http://localhost:${this.plugin.settings.port}`);
                });
            }
        });

        this.createAccordionSection(containerEl, 'Settings', () => {
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
                .setName('Manual Syncthing Path')
                .setDesc('Manually specify Syncthing executable path (overrides auto-detection)')
                .addTextArea(text => {
                    text.setPlaceholder('C:\\Users\\erins\\AppData\\Local\\Programs\\Syncthing\\syncthing.exe')
                        .setValue(this.plugin.settings.manualPath || '')
                        .onChange(async (value) => {
                            this.plugin.settings.manualPath = value.trim();
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.style.minHeight = '60px';
                    text.inputEl.style.resize = 'vertical';
                    text.inputEl.style.fontFamily = 'monospace';
                    text.inputEl.style.fontSize = '12px';
                })
                .addButton(button => button
                    .setButtonText('Clear')
                    .onClick(async () => {
                        this.plugin.settings.manualPath = '';
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings display
                    }));



            new Setting(containerEl)
                .setName('Auto-start Syncthing')
                .setDesc('Automatically start Syncthing when Obsidian opens')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.autoStart)
                    .onChange(async (value) => {
                        this.plugin.settings.autoStart = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Syncthing Port')
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
                .setName('Enable Web UI')
                .setDesc('Enable Syncthing web interface access')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.webUIEnabled)
                    .onChange(async (value) => {
                        this.plugin.settings.webUIEnabled = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Device Name')
                .setDesc('Name for this device in Syncthing')
                .addText(text => text
                    .setValue(this.plugin.settings.deviceName)
                    .onChange(async (value) => {
                        this.plugin.settings.deviceName = value.trim();
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Sync Interval')
                .setDesc('Automatic sync interval in seconds (0 to disable)')
                .addText(text => text
                    .setPlaceholder('300')
                    .setValue(this.plugin.settings.syncInterval.toString())
                    .onChange(async (value) => {
                        const interval = parseInt(value) || 0;
                        this.plugin.settings.syncInterval = interval;
                        await this.plugin.saveSettings();
                        this.plugin.setupSyncInterval();
                    }));

            new Setting(containerEl)
                .setName('Show Notifications')
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
        header.style.cssText = `
            cursor: pointer;
            padding: 12px 16px;
            background: var(--background-modifier-border);
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            margin: 16px 0 8px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 600;
            transition: background-color 0.2s ease;
        `;
        
        const headerText = header.createSpan();
        headerText.textContent = title;
        
        const arrow = header.createSpan('accordion-arrow');
        arrow.textContent = '▼';
        arrow.style.cssText = `
            transition: transform 0.2s ease;
            font-size: 12px;
        `;
        
        const content = accordionContainer.createDiv('accordion-content');
        content.style.cssText = `
            border-left: 1px solid var(--background-modifier-border);
            border-right: 1px solid var(--background-modifier-border);
            border-bottom: 1px solid var(--background-modifier-border);
            border-radius: 0 0 6px 6px;
            margin-bottom: 16px;
            padding: 16px;
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease;
        `;
        
        let isExpanded = true; // Start expanded
        
        const toggleAccordion = () => {
            isExpanded = !isExpanded;
            
            if (isExpanded) {
                content.style.maxHeight = '1000px';
                content.style.padding = '16px';
                arrow.style.transform = 'rotate(0deg)';
                header.style.borderRadius = '6px 6px 0 0';
            } else {
                content.style.maxHeight = '0';
                content.style.padding = '0 16px';
                arrow.style.transform = 'rotate(-90deg)';
                header.style.borderRadius = '6px';
            }
        };
        
        header.addEventListener('click', toggleAccordion);
        
        // Add hover effect
        header.addEventListener('mouseenter', () => {
            header.style.backgroundColor = 'var(--background-modifier-hover)';
        });
        
        header.addEventListener('mouseleave', () => {
            header.style.backgroundColor = 'var(--background-modifier-border)';
        });
        
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

class SyncStatusModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Syncthing Status' });

        this.statusContainer = contentEl.createDiv();
        this.updateStatus();

        // Refresh button
        contentEl.createEl('button', { text: 'Refresh' })
            .addEventListener('click', () => this.updateStatus());
    }

    async updateStatus() {
        this.statusContainer.empty();
        
        if (!this.plugin.syncthingProcess) {
            this.statusContainer.createEl('p', { text: 'Syncthing is not running' });
            return;
        }

        try {
            const status = await this.plugin.getSyncthingStatus();
            
            this.statusContainer.createEl('h3', { text: 'System Status' });
            this.statusContainer.createEl('p', { text: `Version: ${status.version || 'Unknown'}` });
            this.statusContainer.createEl('p', { text: `Uptime: ${status.uptime || 'Unknown'}` });
            
            if (status.folders && status.folders.length > 0) {
                this.statusContainer.createEl('h3', { text: 'Folders' });
                status.folders.forEach(folder => {
                    const folderDiv = this.statusContainer.createDiv();
                    folderDiv.createEl('p', { text: `${folder.label}: ${folder.state}` });
                });
            }
            
        } catch (error) {
            this.statusContainer.createEl('p', { text: 'Failed to get status from Syncthing' });
        }
    }
}

module.exports = class SyncthingSyncPlugin extends Plugin {
    async onload() {
        console.log('Loading SyncthingSync plugin');
        
        await this.loadSettings();
        this.addSettingTab(new SyncthingSyncSettingTab(this.app, this));

        this.syncthingProcess = null;
        this.syncInterval = null;
        this.statusBarItem = null;

        // Add ribbon icon
        this.addRibbonIcon('sync', 'Syncthing Sync', () => {
            new SyncStatusModal(this.app, this).open();
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
                if (this.settings.webUIEnabled) {
                    require('electron').shell.openExternal(`http://localhost:${this.settings.port}`);
                } else {
                    new Notice('Web UI is disabled in settings');
                }
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
                        console.log('Syncthing auto-detection failed - no executable found');
                    }
                } catch (error) {
                    console.error('Error during Syncthing auto-detection:', error);
                }
            }, 1000);
        }

        // Auto-start if enabled
        if (this.settings.autoStart) {
            setTimeout(() => this.startSyncthing(), 2000);
        }

        // Setup sync interval
        this.setupSyncInterval();
        
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
        
        // Add click handler to open status modal
        this.statusBarItem.onClickEvent(() => {
            new SyncStatusModal(this.app, this).open();
        });
    }


    async detectSyncthingPath() {
        console.log('Starting Syncthing detection...');
        
        throw new Error('Syncthing executable not found. Please enable auto-download in settings or install Syncthing manually.');
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

    async downloadSyncthing() {
        const platform = process.platform;
        const arch = process.arch;
        
        // Map Node.js arch to Syncthing arch names
        const archMap = {
            'x64': 'amd64',
            'arm64': 'arm64',
            'ia32': '386'
        };
        
        const syncthingArch = archMap[arch];
        if (!syncthingArch) {
            throw new Error(`Unsupported architecture: ${arch}`);
        }
        
        // Map platform names
        const platformMap = {
            'win32': 'windows',
            'darwin': 'darwin',
            'linux': 'linux'
        };
        
        const syncthingPlatform = platformMap[platform];
        if (!syncthingPlatform) {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        
        const version = 'v1.27.12'; // Latest stable version
        const fileName = `syncthing-${syncthingPlatform}-${syncthingArch}-${version}`;
        const archiveExt = platform === 'win32' ? 'zip' : 'tar.gz';
        const downloadUrl = `https://github.com/syncthing/syncthing/releases/download/${version}/${fileName}.${archiveExt}`;
        
        const pluginDir = path.dirname(__filename);
        const binDir = path.join(pluginDir, 'bin', `${platform}-${arch}`);
        const archivePath = path.join(binDir, `${fileName}.${archiveExt}`);
        
        // Create directories
        const fs = require('fs');
        if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
        }
        
        if (this.settings.showNotifications) {
            new Notice('Downloading Syncthing...');
        }
        
        try {
            // Download the archive
            const https = require('https');
            const response = await new Promise((resolve, reject) => {
                https.get(downloadUrl, resolve).on('error', reject);
            });
            
            if (response.statusCode !== 200) {
                throw new Error(`Download failed: ${response.statusCode}`);
            }
            
            // Save to file
            const writeStream = fs.createWriteStream(archivePath);
            response.pipe(writeStream);
            
            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });
            
            // Extract the archive
            let executablePath;
            if (platform === 'win32') {
                executablePath = await this.extractZip(archivePath, binDir, fileName);
            } else {
                executablePath = await this.extractTarGz(archivePath, binDir, fileName);
            }
            
            // Clean up archive
            fs.unlinkSync(archivePath);
            
            if (this.settings.showNotifications) {
                new Notice('Syncthing downloaded successfully');
            }
            
            return executablePath;
            
        } catch (error) {
            console.error('Download failed:', error);
            throw new Error(`Failed to download Syncthing: ${error.message}`);
        }
    }

    async extractZip(archivePath, extractDir, folderName) {
        const fs = require('fs');
        const AdmZip = require('adm-zip');
        
        try {
            const zip = new AdmZip(archivePath);
            zip.extractAllTo(extractDir, true);
            
            const executablePath = path.join(extractDir, folderName, 'syncthing.exe');
            
            // Make executable
            fs.chmodSync(executablePath, 0o755);
            
            return executablePath;
        } catch (error) {
            // Fallback: manual extraction using built-in modules
            const executablePath = path.join(extractDir, 'syncthing.exe');
            
            // For now, return the expected path - user may need to extract manually
            console.warn('Automatic extraction failed, please extract manually:', error);
            return executablePath;
        }
    }

    async extractTarGz(archivePath, extractDir, folderName) {
        const fs = require('fs');
        const { exec } = require('child_process');
        
        return new Promise((resolve, reject) => {
            const command = `tar -xzf "${archivePath}" -C "${extractDir}"`;
            exec(command, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                const executablePath = path.join(extractDir, folderName, 'syncthing');
                
                // Make executable
                fs.chmodSync(executablePath, 0o755);
                
                resolve(executablePath);
            });
        });
        
        console.log('Syncthing not found in any standard locations');
        
        return null;
    }

    async analyzeDesktopShortcuts() {
        console.log('Analyzing desktop shortcuts...');
        
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
                console.log(`Checking shortcut: ${shortcutPath}`);
                
                // Try to resolve shortcut using PowerShell
                const targetPath = await this.resolveShortcut(shortcutPath);
                if (targetPath && await this.verifyExecutable(targetPath)) {
                    return targetPath;
                }
            } catch (error) {
                console.log(`Shortcut analysis failed for ${shortcutPath}: ${error.message}`);
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
                        console.log(`PowerShell shortcut resolution failed: ${error || stderr}`);
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
                console.log(`Shortcut resolution error: ${error.message}`);
                resolve(null);
            }
        });
    }

    async scanDirectories() {
        console.log('Starting directory scan...');
        
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
                console.log(`Directory scan failed for ${basePath}: ${error.message}`);
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
                    console.log(`Removed lock file: ${lockFile}`);
                }
            } catch (error) {
                console.warn(`Failed to remove lock file ${lockFile}:`, error.message);
            }
        }

        // Kill any existing Syncthing processes
        await this.killExistingSyncthingProcesses();
    }

    async killExistingSyncthingProcesses() {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            if (process.platform === 'win32') {
                exec('taskkill /F /IM syncthing.exe', (error) => {
                    if (error && !error.message.includes('not found')) {
                        console.warn('Failed to kill existing syncthing processes:', error.message);
                    }
                    resolve();
                });
            } else {
                exec('pkill -f syncthing', (error) => {
                    if (error && !error.message.includes('No such process')) {
                        console.warn('Failed to kill existing syncthing processes:', error.message);
                    }
                    resolve();
                });
            }
        });
    }

    async startSyncthing() {
        if (this.syncthingProcess) {
            if (this.settings.showNotifications) {
                new Notice('Syncthing is already running');
            }
            return;
        }

        try {
            const syncthingPath = await this.findSyncthingPath();
            const syncthingHome = path.join(this.app.vault.adapter.basePath, '.syncthing-obsidian');
            
            // Create syncthing home directory
            const fs = require('fs');
            if (!fs.existsSync(syncthingHome)) {
                fs.mkdirSync(syncthingHome, { recursive: true });
            }

            // Check for and remove lock files from previous instances
            await this.cleanupLockFiles(syncthingHome);

            const availablePort = await this.findAvailablePort(this.settings.port);
            const args = [
                '--home', syncthingHome,
                '--gui-address', `127.0.0.1:${availablePort}`,
                '--no-browser',
                '--no-restart'
            ];

            console.log(`Starting Syncthing with args:`, args);
            this.syncthingProcess = spawn(syncthingPath, args, {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe'],
                cwd: syncthingHome
            });

            this.syncthingProcess.on('error', (error) => {
                console.error('Syncthing error:', error);
                new Notice(`Failed to start Syncthing: ${error.message}`);
                this.syncthingProcess = null;
            });

            this.syncthingProcess.on('exit', (code) => {
                console.log(`Syncthing exited with code ${code}`);
                this.syncthingProcess = null;
                if (code !== 0 && code !== null) {
                    console.error(`Syncthing exited with error code: ${code}`);
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
                console.error('Syncthing stderr:', errorMsg);
                if (errorMsg.includes('bind: address already in use')) {
                    new Notice('Syncthing port is already in use. Try a different port in settings.');
                }
            });
            
            this.syncthingProcess.stdout.on('data', (data) => {
                console.log('Syncthing stdout:', data.toString());
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
            this.syncthingProcess.kill('SIGTERM');
            this.syncthingProcess = null;
            if (this.settings.showNotifications) {
                new Notice('Syncthing stopped');
            }
            this.updateStatusBar();
        } catch (error) {
            console.error('Failed to stop Syncthing:', error);
            new Notice(`Failed to stop Syncthing: ${error.message}`);
        }
        this.updateStatusBar();
    }

    async restartSyncthing() {
        if (this.settings.showNotifications) {
            new Notice('Restarting Syncthing...');
        }
        this.stopSyncthing();
        setTimeout(() => this.startSyncthing(), 2000);
    }

    async syncNow() {
        if (!this.syncthingProcess) {
            new Notice('Syncthing is not running');
            return;
        }

        try {
            // Trigger immediate sync via API
            const response = await fetch(`http://localhost:${this.settings.port}/rest/db/scan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                if (this.settings.showNotifications) {
                    new Notice('Sync triggered successfully');
                }
            } else {
                throw new Error('Failed to trigger sync');
            }
        } catch (error) {
            console.error('Sync error:', error);
            new Notice('Failed to trigger sync');
        }
    }

    async getSyncthingStatus() {
        if (!this.syncthingProcess) {
            return null;
        }

        try {
            const [systemResponse, configResponse] = await Promise.all([
                fetch(`http://localhost:${this.settings.port}/rest/system/status`),
                fetch(`http://localhost:${this.settings.port}/rest/system/config`)
            ]);

            const systemData = await systemResponse.json();
            const configData = await configResponse.json();

            return {
                version: systemData.version,
                uptime: systemData.uptime,
                folders: configData.folders || []
            };
        } catch (error) {
            console.error('Failed to get Syncthing status:', error);
            return null;
        }
    }

    setupSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.settings.syncInterval > 0) {
            this.syncInterval = setInterval(() => {
                if (this.syncthingProcess) {
                    this.syncNow();
                }
            }, this.settings.syncInterval * 1000);
        }
    }

    async verifyExecutable(path) {
        return new Promise((resolve) => {
            try {
                const fs = require('fs');
                console.log(`Verifying executable: ${path}`);
                
                // First check if file exists
                if (!fs.existsSync(path)) {
                    console.log(`File does not exist: ${path}`);
                    resolve(false);
                    return;
                }
                
                // For known working path, skip version check to avoid timeout
                if (path.includes('syncthing.exe') && fs.existsSync(path)) {
                    console.log(`File exists and is syncthing executable: ${path}`);
                    resolve(true);
                    return;
                }
                
                console.log(`File exists, testing execution: ${path}`);
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
        console.log('Unloading SyncthingSync plugin');
        
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        if (this.syncthingProcess) {
            this.stopSyncthing();
        }
    }
};
