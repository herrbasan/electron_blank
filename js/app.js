'use strict';
const {app, BrowserWindow, Menu} = require('electron');
const path = require('path');
const fs = require("fs").promises;
const helper = require('../electron_helper/helper.js');
const update = require('../electron_helper/update.js');

//app.commandLine.appendSwitch('high-dpi-support', 'false');
//app.commandLine.appendSwitch('force-device-scale-factor', '1');
//app.commandLine.appendSwitch('--js-flags', '--experimental-module');

let config = {};
let env = { 
	isPackaged:app.isPackaged, 
	app_path:app.getAppPath(), 
	base_path:path.join(app.getAppPath()),
	user_path:app.getPath('userData')
};


if (env.isPackaged) {
	if(process.env.PORTABLE_EXECUTABLE_DIR){
		env.base_path = process.env.PORTABLE_EXECUTABLE_DIR;
	}
	else {
		var ar = process.execPath.split( path.sep );
		ar.length -= 2;
		env.base_path = ar.join(path.sep) + path.sep;
	}
}

init();
async function init(){
	fb('APP SET_ENV');
	let fp = env.app_path;
	if(env.isPackaged){fp = path.dirname(fp);}
	fp = path.join(fp, 'config.json');
	config = await helper.tools.readJSON(fp);

	fb('--------------------------------------');
	process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
	global.env = env;

	fb('Electron Version: ' + process.versions.electron);
	fb('Node Version: ' + process.versions.node);
	fb('Chrome Version: ' + process.versions.chrome);
	fb('--------------------------------------');

	app.whenReady().then(startUp).catch((err) => { throw err});
}

function startUp(){
	fb('Check for update');
	if(!env.isPackaged){ appStart(); return;}
	update.init({mode:'splash', start_delay:1000, url:config.update_url, progress:(e) => {
		if(e.type == 'state'){
			if(e.data < 0){
				appStart();
			}
		}
	}});
}


async function appStart(){
    fb('Init Windows');
	let win = await helper.tools.browserWindow('frameless', {
		webPreferences:{preload: path.join(__dirname, '../electron_helper/helper.js')},
		devTools: !env.isPackaged,
		width:960, 
		height:740,
		file:'index.html'
	});

    //Menu.setApplicationMenu( Menu.buildFromTemplate( [{ label:'File', submenu: [{role: 'quit'}]}] ) );
	Menu.setApplicationMenu( null );
}


function fb(o, context='main'){
	 if (!env.isPackaged) {
    	console.log(context + ' : ', o);
	 }
}
