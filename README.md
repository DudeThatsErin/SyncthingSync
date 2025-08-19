# SyncthingSync

<img width="1536" height="1718" alt="image" src="https://github.com/user-attachments/assets/3fc624eb-ee54-4851-a849-0518c47aa819" />

<img width="283" height="84" alt="image" src="https://github.com/user-attachments/assets/6633cf75-9235-491d-9a19-7a40f58fca44" />

A desktop-only Obsidian plugin that provides a convenient interface to manage an external Syncthing installation for vault synchronization.

**⚠️ IMPORTANT: This plugin requires Syncthing to be installed separately on your system. It cannot run Syncthing internally.**

## Features

- **Syncthing Management**: Start/stop external Syncthing process from Obsidian
- **Auto-Detection**: Automatically detects existing Syncthing installation
- **Web UI Access**: Quick access to Syncthing's web interface
- **Status Monitoring**: View Syncthing running status
- **Status Bar Indicator**: Shows Syncthing running/stopped status in Obsidian's status bar
- **Notifications**: Optional status notifications

## Support

- 💬 [Discord Support](https://discord.gg/zgkMsNcBPT) - Fastest support
- 🐛 [Report Issues](https://github.com/DudeThatsErin/SyncthingSync/issues)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/erinskidds)

## Installation

### Via BRAT (Recommended)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Open BRAT settings and click "Add Beta plugin"
3. Enter: `DudeThatsErin/SyncthingSync`
4. Click "Add Plugin"
5. Enable the plugin in Community Plugins settings

### Manual Installation

1. Download the latest release from [GitHub](https://github.com/DudeThatsErin/SyncthingSync/releases)
2. Extract to `.obsidian/plugins/syncthing-sync/` in your vault
3. Enable the plugin in Community Plugins settings

## Prerequisites

**⚠️ REQUIRED: Syncthing must be installed and running on your system.**

1. **Download Syncthing**: Get it from [syncthing.net](https://syncthing.net/)
2. **Install Syncthing**: Follow the installation instructions for your OS
3. **Start Syncthing**: Run Syncthing before using this plugin
4. **Configure Syncthing**: Set up your devices and folders via Syncthing's web UI

### How This Plugin Works
- This plugin is a **management interface** for external Syncthing
- It **cannot** run Syncthing internally due to Obsidian's security limitations  
- It **detects** and **controls** an existing Syncthing installation
- Syncthing must be installed separately on your system

## Configuration

1. Open Settings → SyncthingSync
2. Configure Syncthing executable path (or use auto-detect)
3. Set your preferred sync interval and device name
4. Enable auto-start if desired
5. Configure web UI access (optional)

## Usage

### Starting/Stopping Syncthing
- **Ribbon Icon**: Click the sync icon to view status
- **Status Bar**: Shows "Running" or "Stopped" status at bottom of Obsidian
- **Commands**: Use Command Palette for start/stop/restart
- **Auto-start**: Enable in settings to start with Obsidian

### Sync Operations
- **Manual Sync**: Use "Sync Now" command
- **Automatic**: Set sync interval in settings
- **Status**: View sync status via ribbon icon or status bar indicator

### Web UI Access
- Enable in settings to access Syncthing's web interface
- Use "Open Syncthing Web UI" command
- Configure devices and folders through web interface

## Platform Support

- ✅ **Windows**: Full support
- ✅ **macOS**: Full support  
- ✅ **Linux**: Full support
- ❌ **Mobile**: Not supported (desktop-only)

## Commands

- `Start Syncthing`: Start the Syncthing process
- `Stop Syncthing`: Stop the Syncthing process
- `Restart Syncthing`: Restart Syncthing
- `Sync Now`: Trigger immediate synchronization
- `Open Syncthing Web UI`: Open web interface

## Settings

- **Syncthing Path**: Path to Syncthing executable
- **Auto-start**: Start Syncthing with Obsidian
- **Port**: Web UI port (default: 8384)
- **Device Name**: Name for this device
- **Sync Interval**: Automatic sync frequency
- **Notifications**: Show sync status messages

## Troubleshooting

### Syncthing Not Found
1. Install Syncthing from [syncthing.net](https://syncthing.net/)
2. Use auto-detect in plugin settings
3. Manually specify path if needed

### Sync Issues
1. Check Syncthing status in plugin
2. Verify device connections in web UI
3. Check folder configurations
4. Restart Syncthing if needed

### Performance
- Adjust sync interval based on vault size
- Disable notifications for large vaults
- Use web UI for advanced configuration
