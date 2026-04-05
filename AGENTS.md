# electron_blank - Project Architecture

## Overview

Blank Electron project using a custom helper library for IPC between main and renderer processes. The main process is minimal — it only bootstraps the app and creates windows. All application logic lives in the renderer (stage) context.

## Startup Flow

```
electron → js/app.js (main) → helper creates window with preload → index.html → js/stage.js (renderer)
```

### 1. Main Process (`js/app.js`)

- Entry point defined in `package.json` → `"main": "js/app.js"`
- Requires `electron_helper/helper.js` (the preload/helper module)
- Sets up `global.env` with path info (handles packaged vs unpackaged, portable)
- Reads `config.json` from app directory
- If packaged: runs auto-updater via `electron_helper/update.js` first
- Calls `helper.tools.browserWindow()` to create the main window
- **Important:** The window is created with `preload: electron_helper/helper.js`
- No application logic — just bootstrapping

### 2. Preload / Helper (`electron_helper/helper.js`)

- Dual-context module: runs in both main process (when `require()`'d) and renderer (as preload)
- Detects context via `process.type` (`'browser'` = main, `'renderer'` = preload)
- **Main process path:** Registers IPC handlers, custom `raum://` file protocol, sets up tools
- **Renderer path:** Exposes `window.electron_helper` with proxy functions that call IPC
- Uses `nodeIntegration: true, contextIsolation: false` — no contextBridge
- Exposes these namespaces on `window.electron_helper`:
  - `window` — window operations (getBounds, setPosition, close, show, hide, etc.)
  - `global` — cross-process key/value storage (maps to Node `global` object)
  - `screen` — display info (getPrimaryDisplay, getAllDisplays)
  - `app` — app info (getAppPath, getName, getVersions, getPath, etc.)
  - `dialog` — file dialogs
  - `shell` — open paths, show items in folder
  - `tools` — utilities (file I/O, path operations, download, browserWindow factory, id generator, etc.)
  - `config` — config file management with watch/IPC sync
  - `id` — current window ID (set by main after window creation)

### 3. Renderer Stage (`js/stage.js`)

- ES module loaded by `index.html` via `<script type="module">`
- All application logic lives here
- Checks `window.electron_helper` to determine if running in Electron or browser
- `initElectron()` — called when helper is available:
  - Gets `env` from `electron_helper.global.get('env')` (set by main in `global.env`)
  - Reads config via `electron_helper.tools.readJSON()`
  - Shows the window via `electron_helper.window.show()`
- `appStart()` — initializes the NUI framework and builds the UI
- Keyboard shortcuts: F11=fullscreen, F12=devtools, Esc=exit

### 4. Snippets (`js/snippets.js`)

- Reusable helper functions for the stage
- `loadImage()` — loads images via `electron_helper.tools.loadImage()` (falls back to dummy in browser)
- `spawnWindow()` — creates child windows with the same helper preload

## NUI Framework

Located in `nui/` submodule. Custom UI library that provides:

- `nui.js` — core framework
- `nui_app.js` — application window chrome / lifecycle
- `nui_ut.js` — utility functions (DOM helpers, createElement, headImport, etc.)
- Various components (gallery, graph, list, media player, etc.)
- CSS in `nui/css/`

The NUI framework provides the window chrome and UI components. `nui_app.appWindow()` initializes the app shell within the renderer.

## Key Conventions

- **`fb()`** — logging function. In main: `console.log(context + ' : ', o)`. In stage: `console.log(o)`
- **`g` object** — stage-level global state (win, config, paths, content reference)
- **`ut`** — NUI utility namespace, available globally after NUI init
- **`electron_helper.id`** — current BrowserWindow ID, set by main after `dom-ready`
- **`electron_helper.global`** — the primary cross-process communication mechanism. Main sets `global.env`, stage reads it
- **Config** — `config.json` in app root, read via `helper.tools.readJSON()`
- **Custom protocol** — `raum://` maps to local file paths for asset loading

## File Structure

```
electron_blank/
├── js/
│   ├── app.js          # Main process entry
│   ├── stage.js        # Renderer application logic
│   └── snippets.js     # Reusable stage helpers
├── electron_helper/
│   ├── helper.js       # Core helper (preload + main module)
│   ├── helper_new.js   # Newer unified API version (same model)
│   ├── update.js       # Auto-updater (main process only)
│   └── test.js         # Test module
├── nui/                # UI framework submodule
├── index.html          # Shell HTML, loads stage.js
├── config.json         # App configuration
└── package.json        # Electron + forge config
```

## Running

- `npm start` — electron-forge dev mode
- `npm run package` — package for distribution
- `npm run dist` — electron-builder (portable exe)

## Important Notes

- `nodeIntegration: true, contextIsolation: false` — renderer has full Node access
- The helper is used as BOTH a `require()` module in main AND a preload script in renderer
- Main process does NOT import stage code. Communication is exclusively via IPC through the helper
- `global.env` is set in main, read in stage via `electron_helper.global.get('env')`
- Window creation always passes the helper as preload to child windows
