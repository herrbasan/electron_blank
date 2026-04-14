# electron_blank - Project Architecture

## Coding Philosophy

### Deterministic Mind — Coding Maxims

#### Core Maxims
- **Reliability > Performance > Everything else.**
- **LLM-Native Codebase:** No human readability goals. Optimize for what an LLM can most efficiently understand and modify.
- **Vanilla JS everywhere.** No TypeScript. `.d.ts` files are generated for context only, never used at runtime.
- **Zero Dependencies.** If we can build it ourselves using raw standard libraries, we build it. Avoid external third-party packages. Evaluate per-case if a dependency is truly necessary.
- **Fail Fast, Always.** No defensive coding. No mock data, no fallback defaults, no silencing `try/catch`. Let it crash and fix the root cause.

#### Design Principles
- **Design Failures Away:** Prevention over handling. Every eliminated failure condition is a state that can never occur. When failures remain (external systems), fail fast.
- **No Defensive Programming:** Silent fallbacks, swallowed exceptions, and default values hide bugs — they make failures invisible and let bad state propagate. Each fallback trades a visible failure you can fix now for an invisible inconsistency you'll debug later. Defensive patterns belong only at boundaries you don't control (third-party libs, external APIs, user input) — and only as temporary band-aids in production while you fix the underlying design.
- **Disposal is Mandatory and Verifiable.** Every resource created must have a proven, confirmed disposal path.
- **Block Until Truth.** State is authoritative. UI reflects truth, never intent. Inputs are blocked during transitions — race conditions are structurally impossible.
- **Prefer Self-Explanatory Code.** Comments drift; code doesn't. Comment only what code cannot express: regulatory requirements, historical context, non-obvious consequences.
- **Single Responsibility.** If you need "and" or "or" to describe a function, it has multiple responsibilities.
- **Functional Purity.** Isolate impurity (I/O, state, randomness) at boundaries. Keep the core pure for local reasoning.
- **Explicit Dependencies.** Accessing via globals or registries hides contracts. Pass dependencies explicitly where it matters.
- **Immutability by Default.** Mutation creates temporal dependencies. Start immutable; optimize with mutation only when measurement proves it necessary.
- **Composition Over Inheritance.** Inheritance forces premature classification and tight coupling.
- **Measure Before Optimizing.** Intuition about performance is frequently wrong. Profile first.
- **Abstraction From Evidence.** First use case: write direct. Second: copy-modify. Third (now the pattern is visible): abstract. Wrong abstraction is harder to remove than no abstraction.
- **Know Your Data Shapes.** Type annotations are claims, not proofs. Validate at boundaries. When the type system and reality disagrees, reality wins.

---

## Overview

Blank Electron project using a custom helper library for IPC between main and renderer processes. The main process is minimal — it only bootstraps the app and creates windows. All application logic lives in the renderer (stage) context.

## Startup Flow

```
electron → app/js/app.js (main) → helper creates window with preload → app/index.html → app/js/stage.js (renderer)
```

### 1. Main Process (`app/js/app.js`)

- Entry point defined in `package.json` → `"main": "app/js/app.js"`
- Requires `app/modules/electron_helper/helper_new.js` (the active helper version)
- Sets up `global.env` with path info (handles packaged vs unpackaged, portable)
- Reads `config.json` from app directory via `helper.tools.readJSON()`
- If packaged: runs auto-updater via `app/modules/electron_helper/update.js` first
- Calls `helper.tools.browserWindow()` to create the main window
- **Important:** The window is created with `preload: app/modules/electron_helper/helper_new.js`
- No application logic — just bootstrapping

### 2. Dual-Context Helper Architecture

The helper is a **single module** that runs in TWO different Electron contexts, detecting its environment via `process.type`:

#### Context Detection
```
process.type === 'browser'  → Main process (require'd)
process.type === 'renderer' → Renderer process (preload script)
```

#### Main Process Path (`process.type === 'browser'`)
- Registers IPC handlers via `ipcMain.handle()` for each API namespace
- Registers custom `raum://` file protocol for local asset loading
- Creates temp directory at `app.getPath('userData')/temp`
- Sets up `app.on('will-quit')` handler for graceful cleanup
- Exports module via `module.exports = exp`

#### Renderer Process Path (`process.type === 'renderer'`)
- Installs window-level error handlers (uncaughtException, unhandledRejection)
- Builds renderer-side proxy API via `initApis()` — each method calls `ipcRenderer.invoke()`
- Attaches to global scope: `window.electron_helper = exp`
- No module export (runs as preload script)

#### Exposed Namespaces on `window.electron_helper`
| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `window` | BrowserWindow control | close, show, hide, focus, setPosition, setBounds, setFullScreen, isFullScreen, isVisible, getBounds, getPosition, getId, setSize, center, hook_event |
| `global` | Cross-process key/value storage | get(name, clone), set(name, data) — maps to Node `global` object |
| `screen` | Display information | getPrimaryDisplay, getAllDisplays |
| `app` | App lifecycle/info | exit, isPackaged, getAppPath, getPath, getName, getExecPath, getVersions |
| `dialog` | File dialogs | showOpenDialog |
| `shell` | OS shell operations | showItemInFolder, openPath |
| `tools` | Utilities | browserWindow, readJSON, writeJSON, fileExists, ensureDir, getFiles, getFilesRecursive, download, loadImage, drawImageDummy, sendToMain, sendToId, broadcast, id, versionInfo, headCSS, isAdmin, subWindow, jRequest, medianAverage |
| `config` | Config management (v2 only) | initMain(name, defaults, options), initRenderer(name, callback, options) |
| `id` | Current window ID | Number, set by main after `dom-ready` |

#### IPC Communication Flow
```
Renderer (stage.js)                          Main Process (app.js)
─────────────────                            ────────────────────
electron_helper.window.show() ────IPC────►   BrowserWindow.show()
electron_helper.global.get('env') ──IPC────► global.env (Node global object)
electron_helper.tools.readJSON(fp) ──IPC───► fs.readFile → JSON.parse
electron_helper.tools.browserWindow() ─IPC─► new BrowserWindow() → returns win.id
```

#### Security Model
- `nodeIntegration: true, contextIsolation: false` — renderer has full Node access
- No `contextBridge` used — helper attaches directly to `window.electron_helper`
- `webSecurity: false` — allows cross-origin requests
- `backgroundThrottling: false` — prevents throttling when window is hidden

### 3. Helper Version Differences

| Feature | `helper.js` (v1.0.5) | `helper_new.js` (v2.0.0) |
|---------|---------------------|-------------------------|
| IPC Setup | Individual command functions per namespace | Unified `initApis()` with handle/invoke object definitions |
| Config | Simple factory function | Full `config.initMain/initRenderer` with watch, backup/restore, migration hooks |
| Error Handling | Basic | Process-level uncaughtException/unhandledRejection handlers |
| Window Creation | Uses `did-finish-load` event | Uses `dom-ready` event (earlier injection) |
| Shell API | `showItemInFolder` only | + `openPath` |
| Global Storage | Direct JSON stringify/parse | Markers for undefined/null preservation (`__undefined`, `__missing`) |
| Window Close Notification | None | Sends `window-closed` event to stage when child windows close |
| `jRequest` | Missing query string support, no Content-Type header | Fixed URL search params, proper Content-Type header, https/http protocol selection |
| `isAdmin` | No windowsHide flag | Uses `{ windowsHide: true }` |
| `getFilesR` | No input validation | Guards against empty/invalid directory paths |
| Module Export | Always `module.exports = exp` | Wrapped in try/catch for ESM compatibility |

**Current usage:** `helper_new.js` is the active and only helper version used across the project.

### 4. Renderer Stage (`app/js/stage.js`)

- ES module loaded by `app/index.html` via `<script type="module">`
- All application logic lives here
- Checks `window.electron_helper` to determine if running in Electron or browser
- `initElectron()` — called when helper is available:
  - Gets `env` from `electron_helper.global.get('env')` (set by main in `global.env`)
  - Reads config via `electron_helper.tools.readJSON()`
  - Shows the window via `electron_helper.window.show()`
- `appStart()` — initializes the NUI framework and builds the UI
- Keyboard shortcuts: F11=fullscreen, F12=devtools, Esc=exit

### 5. Snippets (`app/js/snippets.js`)

- Reusable helper functions for the stage
- `loadImage()` — loads images via `electron_helper.tools.loadImage()` (falls back to dummy in browser)
- `spawnWindow()` — creates child windows with the same helper preload

## NUI Framework

Located in `app/modules/nui2/` submodule. Custom UI library that provides:

- `nui.js` — core framework
- `nui_app.js` — application window chrome / lifecycle
- `nui_ut.js` — utility functions (DOM helpers, createElement, headImport, etc.)
- Various components (gallery, graph, list, media player, etc.)
- CSS in `app/modules/nui2/NUI/css/`

The NUI framework provides the window chrome and UI components. `nui_app.appWindow()` initializes the app shell within the renderer.

## Auto-Updater (`app/modules/electron_helper/update.js`)

- Main process only module
- Supports two update sources: HTTP server and GitHub releases
- Three UI modes: `splash` (full window), `widget` (floating transparent), `silent`
- Version comparison: supports both simple dot-notation and semantic versioning
- Uses Squirrel.Windows (`autoUpdater`) for installation
- Downloads update package, then calls `autoUpdater.quitAndInstall()`
- Prevents app quit during update window lifecycle via `window-all-closed` handler

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
├── app/
│   ├── js/
│   │   ├── app.js          # Main process entry
│   │   ├── stage.js        # Renderer application logic
│   │   └── snippets.js     # Reusable stage helpers
│   ├── css/
│   │   └── main.css        # App styles
│   ├── modules/
│   │   ├── electron_helper/
│   │   │   ├── helper_new.js   # Core helper (active version, unified API)
│   │   │   ├── update.js       # Auto-updater (main process only)
│   │   │   └── test.js         # Test module
│   │   └── nui2/               # UI framework submodule
│   └── index.html          # Shell HTML, loads stage.js
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
- **Active helper version:** `helper_new.js` is the active and only helper version used across the project.
