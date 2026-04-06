'use strict';

import '../nui2/NUI/nui.js';
import { appWindow } from '../nui2/NUI/lib/modules/nui-app-window.js';
import { contextMenu } from '../nui2/NUI/lib/modules/nui-context-menu.js';
import snippets from './snippets.js';

let g = {};

if (window.electron_helper) { initElectron(); }
else { appStart(); }

async function initElectron() {
	fb('Init Stage');
	g.win = electron_helper.window;
	g.main_env = await electron_helper.global.get('env');
	g.basePath = g.main_env.base_path;
	g.app_path = g.main_env.app_path;
	g.isPackaged = g.main_env.isPackaged;

	let fp = g.app_path;
	if (g.isPackaged) { fp = electron_helper.tools.path.dirname(g.app_path); }
	fp = electron_helper.tools.path.join(fp, 'config.json');

	g.config = await electron_helper.tools.readJSON(fp);
	g.win.show();
	electron_helper.tools.versionInfo();
	appStart();
}

async function appStart() {
	const main = document.querySelector('main');
	const win = appWindow({
		title: document.title,
		icon: 'assessment',
		inner: main,
		statusbar: true,
		onClose: () => {
			if (window.electron_helper) { electron_helper.app.exit(); }
			else { location.reload(); }
		}
	});

	if (window.electron_helper) {
		electron_helper.window.hook_event('focus', () => win.focus());
		electron_helper.window.hook_event('blur', () => win.blur());

		
		document.body.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = buildTitleMenu();
			menu.show(e.clientX, e.clientY);
		});
		
	}

	// Electron DND fix: preventDefault on document.body drag events to allow file access
	// MUST be on document.body, not window, for Electron to populate dataTransfer.files
	document.body.addEventListener('dragover', (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	});
	document.body.addEventListener('drop', (e) => {
		e.preventDefault();
	});

	const imageContainer = document.getElementById('image-container');

	g.dropzone = nui.components.dropzone.create(
		[
			{ name: 'addfiles', label: 'Add files to list ...' },
			{ name: 'replaceFiles', label: 'Replace list ...' }
		],
		(detail) => {
			const { zone, dataTransfer } = detail || {};
			if (!dataTransfer?.files?.length) return;

			if (zone === 'replaceFiles') {
				imageContainer.replaceChildren();
			}

			for (const file of dataTransfer.files) {
				if (!file.type.startsWith('image/')) continue;
				const url = (window.electron_helper && file.path)
					? electron_helper.tools.path.resolve(file.path)
					: URL.createObjectURL(file);
				snippets.loadImage(url, imageContainer);
			}
		},
		win.content
	);

	const spawnBtn = document.querySelector('nui-button button');
	if (spawnBtn) {
		spawnBtn.addEventListener('click', () => snippets.spawnWindow());
	}

	window.addEventListener('keydown', onKey);
}

function buildTitleMenu() {
	return contextMenu([
		{ label: 'Toggle Theme', action: 'theme' },
		{ type: 'separator' },
		{ label: 'Toggle DevTools', action: 'devtools' },
		{ label: 'Toggle Fullscreen', action: 'fullscreen' },
		{ label: 'Center Window', action: 'center' },
		{ type: 'separator' },
		{ label: 'Close', action: 'close' }
	], {
		onAction: async (action) => {
			if (action === 'theme') {
				const scheme = document.documentElement.style.colorScheme;
				document.documentElement.style.colorScheme = scheme === 'dark' ? 'light' : 'dark';
			}
			if (action === 'devtools') { await electron_helper.window.toggleDevTools(); }
			if (action === 'fullscreen') {
				const isFS = await electron_helper.window.isFullScreen();
				await electron_helper.window.setFullScreen(!isFS);
			}
			if (action === 'center') { await electron_helper.window.center(); }
			if (action === 'close') { await electron_helper.window.close(); }
		}
	});
}

async function onKey(e) {
	if (e.keyCode === 122) {
		if (window.electron_helper) {
			const isFS = await g.win.isFullScreen();
			g.win.setFullScreen(!isFS);
		}
	}
	if (e.keyCode === 123) {
		if (window.electron_helper) { g.win.toggleDevTools(); }
	}
	if (e.keyCode === 27) { appExit(); }
}

function appExit() {
	if (window.electron_helper) { electron_helper.app.exit(); }
	else { location.reload(); }
}

function fb(o) { console.log(o); }
