'use strict';

import nui from '../nui/nui.js';
import nui_app from '../nui/nui_app.js';
import snippets from './snippets.js';
let g = {};

// Init
// ###########################################################################

if(window.electron_helper){ initElectron(); }
else { appStart(); }

async function initElectron(){
	fb('Init Stage')
	g.win = electron_helper.window;
	g.main_env = await electron_helper.global.get('env');
	g.basePath = g.main_env.base_path;
	g.app_path = g.main_env.app_path;
	g.isPackaged = g.main_env.isPackaged;
	console.log(g.main_env);
	
	let fp = g.app_path;
	if(g.isPackaged){fp = electron_helper.tools.path.dirname(g.app_path);}
	fp = electron_helper.tools.path.join(fp, 'config.json');

	g.config = await electron_helper.tools.readJSON(fp);
	g.win.show();
	console.log(g.config);
	//tools.versionInfo();
	appStart();
}

async function appStart(){
	await nui_app.appWindow({inner:ut.el('body'), icon:ut.icon('assessment')});
	await ut.headImport({url:'./css/main.css', type:'css'});
	window.addEventListener("keydown", onKey);
	g.content = ut.el('main section');
	await nui_app.dropZone(
		[
			{name:'addfiles', label:'Add files to list ...'},
			{name:'replaceFiles', label:'Replace list ...'},
		], 
		(fileList) => { console.log(fileList)},
		g.content
	)
	let card = ut.createElement('div', {class:'nui-card', target:g.content, inner:'<div class="nui-button-container"></div>'})
	ut.createElement('button', {target:card.el('.nui-button-container'), events:{click:() => { snippets.loadImage('X:\\# Photos\\# Misc\\Echo.png',g.content)}}, inner:'Test'})
	ut.createElement('button', {target:card.el('.nui-button-container'), events:{click:() => {snippets.spawnWindow({parentID:electron_helper.id, modal:true})}}, inner:'SpawnWindow'})
}





// Tools
// ###########################################################################

async function onKey(e) {
	//fb(e.keyCode)
	if (e.keyCode == 122) {
		if(await g.win.isFullScreen()){
			g.win.setFullScreen(false);
		}
		else {
			g.win.setFullScreen(true);
		}
	}
	if (e.keyCode == 123) {
		g.win.toggleDevTools();
	}
	if (e.keyCode == 27) {
		appExit();
	}
}

function appExit(){
	if(window.electron_helper){
		electron_helper.app.exit();
	}
	else {
		location.reload();
	}
}


function fb(o){
    console.log(o);
}