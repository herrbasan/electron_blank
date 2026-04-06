# electron_blank

A minimal Electron boilerplate with NUI2 for rapid application development.

## Features

- **Electron** with nodeIntegration enabled
- **NUI2** component framework (dropzone, appWindow, context menus, etc.)
- **Drag & Drop** image loading with add/replace zones
- **Multi-window** support with spawn functionality
- **Zero TypeScript** - pure vanilla JavaScript

## Quick Start

### Clone and Initialize

```bash
# Clone the repo
git clone https://github.com/herrbasan/electron_blank.git my-app
cd my-app

# Run the init script to customize
node init-project.js

# Install dependencies
npm install

# Start development
npm start
```

### Manual Setup (without init script)

```bash
git clone https://github.com/herrbasan/electron_blank.git
cd electron_blank
rm -rf .git
npm install
npm start
```

## Project Structure

```
my-app/
├── js/
│   ├── app.js              # Main process entry
│   ├── stage.js            # Renderer logic
│   └── snippets.js         # Reusable helpers
├── electron_helper/
│   └── helper_new.js       # IPC helper (main + preload)
├── nui2/                   # NUI2 framework (submodule)
├── css/main.css            # App styles
├── index.html              # App shell
└── package.json
```

## Available Scripts

- `npm start` - Start in development mode
- `npm run package` - Package for current platform
- `npm run dist` - Build portable executable

## Demo Features

The boilerplate includes a working demo of:

1. **Drag & Drop Zone** - Drop images onto "Add files" or "Replace list" zones
2. **Image Display** - Loaded images appear in the content area
3. **Spawn Window** - Open NUI2 Playground in a child window
4. **Context Menu** - Right-click title bar for options
5. **Keyboard Shortcuts** - F11 (fullscreen), F12 (devtools), Esc (exit)

## Customizing NUI2

The project uses NUI2 as a git submodule. To update:

```bash
git submodule update --remote
```

## License

MIT
