'use strict';
import '../modules/nui2/NUI/nui.js';
import { appWindow } from '../modules/nui2/NUI/lib/modules/nui-app-window.js';

let snippets = {};

async function loadImage(url, target){
	let img;
	// If it's a blob URL or http(s), use it directly as <img> tag
	// Only use electron_helper.loadImage for actual file paths
	if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
		img = `<img src="${url}" alt="">`;
	}
	else if (window.electron_helper) {
		let fp = electron_helper.tools.path.resolve(url);
		img = await electron_helper.tools.loadImage(fp);
	}
	else {
		img = `<img src="${url}" alt="">`;
	}
	let html = nui.util.createElement('figure', {class:'', content:img});
	if(target) { target.appendChild(html);}
	return html;
}

function spawnWindow(prop){
	let sub = electron_helper.tools.browserWindow('frameless', {
		webPreferences:{preload: electron_helper.tools.path.join(__dirname, '../modules/electron_helper/helper_new.js')},
		devTools: false,
		width:1280, 
		height:800,
		modal: prop?.modal || false,
		parentID:prop?.parentID || null,
		html:/*HTML*/`
			<!DOCTYPE html>
			<html>
				<head>
					<title>NUI Playground</title>
					<link rel="stylesheet" href="./app/modules/nui2/NUI/css/nui-theme.css">
					<link rel="stylesheet" href="./app/modules/nui2/NUI/css/modules/nui-app-window.css">
					<style>
						html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
						main { display: flex; flex-direction: column; height: 100%; }
						iframe { border: none; flex: 1; width: 100%; min-height: 0; }
					</style>
				</head>
				<body class="dark">
					<main>
						<iframe src="./app/modules/nui2/Playground/index.html"></iframe>
					</main>
				</body>
				<script type="module">
					import './app/modules/nui2/NUI/nui.js';
					import { appWindow } from './app/modules/nui2/NUI/lib/modules/nui-app-window.js';
					document.addEventListener('DOMContentLoaded', () => {
						const win = appWindow({
							icon: 'palette',
							title: 'NUI Playground',
							inner: document.querySelector('main'),
							statusbar: false,
							onClose: () => window.close()
						});
						
						if (window.electron_helper) {
							electron_helper.window.hook_event('focus', () => win.focus());
							electron_helper.window.hook_event('blur', () => win.blur());
						}
					}, {once:true})
				</script>
			</html>
		`
	})
}

snippets.loadImage = loadImage;
snippets.spawnWindow = spawnWindow;

export default snippets;
