# SyncthingSync

A desktop-only Obsidian plugin that integrates Syncthing directly into Obsidian for seamless vault synchronization without running Syncthing separately.

## Features

- **Desktop-Only Integration**: Run Syncthing directly from within Obsidian
- **Auto-Detection**: Automatically detects Syncthing installation
- **Web UI Access**: Optional web interface for advanced configuration
- **Real-time Sync**: Configurable sync intervals with manual sync triggers
- **Status Monitoring**: View sync status and folder information
- **Status Bar Indicator**: Shows Syncthing running/stopped status in Obsidian's status bar
- **Notifications**: Optional sync status notifications
- **Auto-Start**: Automatically start Syncthing when Obsidian opens

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

**Syncthing must be installed on your system.** Download from [syncthing.net](https://syncthing.net/)

### Installation Locations
The plugin will auto-detect Syncthing in these locations:
- Windows: `C:\Program Files\Syncthing\syncthing.exe`
- macOS/Linux: `/usr/bin/syncthing` or `/usr/local/bin/syncthing`
- User directory: `~/syncthing/syncthing`

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

## Support

- 💬 [Discord Support](https://discord.gg/your-discord-server) - Fastest support
- 🐛 [Report Issues](https://github.com/DudeThatsErin/SyncthingSync/issues)
- ⭐ [Star on GitHub](https://github.com/DudeThatsErin/SyncthingSync)
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/erinskidds)

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release
- Desktop-only Syncthing integration
- Auto-detection and configuration
- Web UI access and status monitoring
- Configurable sync intervals and notifications
