# Vault Path Copier

An Obsidian plugin that copies file paths with their correct extension (`.md`, `.canvas`, etc.) to the clipboard — directly from the file explorer context menu and via hotkey for multi-select.

Solves the friction of Obsidian's native "Copy path from vault" which strips the `.md` extension, causing AI agents using Obsidian MCP tools to fail.

## Features

- **Single file** — Right-click any file in the explorer → `Copy vault path` → path with extension in clipboard
- **Multi-select** — `Ctrl+click` multiple files → `Ctrl+Shift+C` → all paths with extensions, one per line
- **Multi-select context menu** — Right-click with multiple files selected → `Copy N file paths` at the top of the menu
- **Works with any file type** — Resolves `.md`, `.canvas`, images, and other formats via vault lookup
- **Works with folders too** — Selected folders are copied with trailing `/`

## Installation

### From source

```bash
git clone https://github.com/your-username/vault-path-copier.git
```

1. Copy the `vault-path-copier` folder to your vault's `.obsidian/plugins/` directory
2. In Obsidian, go to `Settings → Community Plugins`
3. Click **Reload plugins** (`Ctrl+P` → `Reload app without saving`)
4. Enable **Vault Path Copier**
5. (Optional) Assign a different hotkey in `Settings → Hotkeys → Copy selected file paths`

```shell
# From repo root to Obsidian vault:
cp -r vault-path-copier /path/to/your/vault/.obsidian/plugins/
```

## Usage

### Copy a single file path

1. In the file explorer, `right-click` on a file
2. Click **Copy vault path**
3. Paste (`Ctrl+V`) — result: `folder/file_name.md`

### Copy multiple file paths

**Method A — Hotkey (fastest)**
1. Select files with `Ctrl+click` in the file explorer
2. Press `Ctrl+Shift+C`
3. Paste — result: `folder/file1.md\nfolder/file2.md\nfolder/file3.md`

**Method B — Context menu**
1. Select files with `Ctrl+click` in the file explorer
2. Right-click on any selected file
3. Click **Copy N file paths** (appears at the top of the menu)

## How it works

The plugin uses three mechanisms to capture file paths:

| Mechanism | Purpose |
|-----------|---------|
| `file-menu` event | Adds `Copy vault path` to single-file context menus |
| `contextmenu` capture + `MutationObserver` | Injects `Copy N file paths` into multi-file context menus (catches the selection before Obsidian clears multi-select on right-click) |
| Plugin command + `Ctrl+Shift+C` | Copies all currently selected file paths in the explorer |

Path resolution:
- For single-file menu items: uses `TFile.path` directly (always includes the correct extension)
- For multi-select: builds the path from the file explorer DOM, then resolves the extension by querying `Vault.getAbstractFileByPath()` against known extensions (`[.md, .canvas, .png, .jpg, .jpeg, .svg, .webp, .pdf]`)

## Technical details

- **Zero dependencies** — Pure JavaScript, no build step required
- **Minimal footprint** — ~200 lines, single `main.js` file
- **Safe cleanup** — Disconnects observer and removes injected DOM nodes on `onunload()`
- **`isDesktopOnly: false`** — Works on mobile (tested via hotkey)
- **`minAppVersion: 1.0.0`** — Compatible with all modern Obsidian versions

### File structure

```
vault-path-copier/
├── manifest.json   # Plugin metadata
├── main.js         # Plugin implementation (~200 lines)
└── README.md       # This file
```

## Changelog

### 1.0.0 — 2026-06-16

- Single-file context menu copy with correct extension
- Multi-select context menu injection via MutationObserver
- `Ctrl+Shift+C` hotkey for multi-file path copy
- Extension resolution via vault lookup

## License

MIT
