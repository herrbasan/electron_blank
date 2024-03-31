'use strict';
import ut from "../nui/nui_ut.js";

let snippets = {};

async function loadImage(url, target){
	let img;
	if(window.electron_helper){
		let fp = electron_helper.tools.path.resolve(url);
		img = await electron_helper.tools.loadImage(fp);
	}
	else {
		img = ut.drawImageDummy(url);
	}
	let html = ut.createElement('figure', {class:'', inner:img})
	if(target) { target.appendChild(html);}
	return html;
}



function spawnWindow(){
	let sub = electron_helper.tools.browserWindow('frameless', {
		webPreferences:{preload: electron_helper.tools.path.join(__dirname, 'js', '../electron_helper/helper.js')},
		devTools: false,
		width:640, 
		height:480,
		html:/*HTML*/`
			<!DOCTYPE html>
			<html>
				<head>
					<title>Blank</title>
				</head>
			
				<body class="dark">
					<main>
						<section>
							Nothing
						</section>
					</main>
				</body>
				<script type="module">
					import nui from './nui/nui.js';
					import ut from './nui/nui_ut.js';
					import nui_app from './nui/nui_app.js';
					document.addEventListener('DOMContentLoaded', async () => {
						await nui_app.appWindow({inner:ut.el('body'), fnc_close:window.electron_helper.window.close, icon:ut.icon('settings')});
						await ut.headImport({url:'./css/main.css', type:'css'});
					}, {conce:true})
				</script>
			</html>
		`
	})
}


snippets.loadImage = loadImage;
snippets.spawnWindow = spawnWindow;

export default snippets;
