'use strict';

import nui from '../nui/nui.js';
import ut from '../nui/nui_ut.js';
import nui_app from '../nui/nui_app.js';
import mediaPlayer from '../nui/nui_media_player.js';
import snippets from './snippets.js';

const radioBrowser = require('radio-browser');
const path = require('path');

let g = {};
let stations = [];
let stations_index = {};
let stations_filtered = [];
let stations_random = [];
let stations_random_idx = 0;
let repeat_time = 1000 * 10; 

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
	electron_helper.tools.versionInfo();
	appStart();
}

async function appStart(){
	await nui_app.appWindow({inner:ut.el('body'), icon:ut.icon('assessment')});
	await ut.headImport({url:'./css/main.css', type:'css'});
	window.addEventListener("keydown", onKey);
	g.content = ut.el('main section');
	let html = /*html*/`
	<div class="nui-card"><h2>Radio</h2></div>
	`
	initRadio();
}

function requestTest(uuid){
	let bench = new Date().getTime();
	radioBrowser.getStations({by:'uuid', searchterm:uuid}).then((data) => {
		console.log(data, new Date().getTime() - bench);
	});
}

// Main
// ########################################################################### *

async function initRadio(){
	if(!await electron_helper.tools.fileExists(path.join(g.main_env.user_path, 'stations.json'))){
		await updateStations();
	}
	else {
		stations = await electron_helper.tools.readJSON(path.join(g.main_env.user_path, 'stations.json'));
	}
	
	console.log('Total Stations', stations.length);
	for(let i = 0; i < stations.length; i++){
		stations_index[stations[i].stationuuid] = i
	}
	
	stations_filtered = filterStations(stations);
	stations_random = ut.shuffleArray(stations_filtered);
	stations_random_idx = 0;
	console.log('Filtered Stations', stations_filtered.length);
	playRandom();
}

function renderStation(station){
	let html = /*html*/`
	<div class="nui-card nui-col-two">
		<div class="rp_cover">
			${station.favicon ? `<img src="${station.favicon}" alt="${station.name}">` : ''}
		</div>
		<div class="rp_info">
			<h2>${station.name}</h2>
			<p>${station.tags}</p>
			<p>${station.country}</p>
			<p>${station.votes}</p>
			<p>${station.bitrate}</p>
			<p>${station.codec}</p>
		</div>
	</div>
	`
	g.content.innerHTML = html;
	return html;
}

 


let temp = {
    "name": "Radio Rijnmond Extra",
    "url": "https://d2e9xgjjdd9cr5.cloudfront.net/icecast/rijnmond/radio-extra-mp3",
    "url_resolved": "https://d2e9xgjjdd9cr5.cloudfront.net/icecast/rijnmond/radio-extra-mp3",
    "homepage": "https://www.rijnmond.nl/radio",
    "favicon": "https://s.regiogroei.cloud/img/favicons/rijnmond/apple-touch-icon.png?v=1715008420733",
    "tags": "sport",
    "country": "The Netherlands",
    "countrycode": "NL",
    "votes": 48,
    "codec": "MP3",
    "bitrate": 192,
    "lastcheckok": 1,
}

function filterStations(data){
	let ar = filter(data, {
		'bitrate' : {condition:'>=', value:128},
		'lastcheckok' : {condition:'>', value:0},
		'votes' : {condition:'>', value:1}
	})
	return ar;
}

let match_conditions = {
	'==' : function(a, b){ return a == b; },
	'!=' : function(a, b){ return a != b; },
	'>' : function(a, b){ return a > b; },
	'<' : function(a, b){ return a < b; },
	'>=' : function(a, b){ return a >= b; },
	'<=' : function(a, b){ return a <= b; },
	'contains' : function(a, b){ return a.indexOf(b) > -1; },
	'!contains' : function(a, b){ return a.indexOf(b) == -1; },
	'is' : function(a, b){ return a === b; },
	'!is' : function(a, b){ return a !== b; }
}

function match(item, condition, value){
    try {
        // Check if condition exists in match_conditions
        if (!match_conditions.hasOwnProperty(condition)) {
            console.warn(`Invalid condition: ${condition}`);
            return false;
        }
        
        // Handle null/undefined values
        if (item === undefined || item === null) {
            return false;
        }

        // Perform the match
        return match_conditions[condition](item, value);
    } catch (error) {
        console.warn(`Error in match function: ${error.message}`);
        return false;
    }
}

function filter(data, conditions){
	let ar = [];
	for(let i = 0; i < data.length; i++){
		let item = data[i];
		let isMatch = 0;
		let countMatch = 0
		for(let key in conditions){
			countMatch++;
			if(match(ut.deep_get(item, key), conditions[key].condition, conditions[key].value)){
				isMatch++;
			}
		}
		if(isMatch == countMatch){ ar.push(item); }
		
	}
	return ar;
}


async function updateStations(){
	let data = await radioBrowser.getStations();
	stations = data;
	let check = await electron_helper.tools.writeJSON(path.join(g.main_env.user_path, 'stations.json'), data);
	console.log(check);
}

async function playStation(station){
	let player = ut.createElement('audio', {attributes:{autoplay:true}});
	if(g.player) {
		cleanUpPlayer(g.player)
		g.player.src = ''; 
	}
}



async function playRandom(){
    // Reset index if we've reached the end
    if (stations_random_idx >= stations_random.length) {
        stations_random_idx = 0;
        stations_random = ut.shuffleArray(stations_filtered);
    }

    let station = stations_random[stations_random_idx];
    stations_random_idx++;
    
    // Fancy console separator
    console.log(' ');
    console.log('%c' + station.name, 'font-size: 20px; font-weight: bold; color: #4CAF50');
    console.log('Tags: ' + (station.tags ? station.tags : 'No Tags') + ' - Country: ' + (station.country ? station.country : 'No Country'));
    console.log('Votes: ' + station.votes + ' - Bitrate: ' + station.bitrate + ' - Codec: ' + station.codec);
	console.log(station);
    console.log(' ');

    let player = ut.createElement('audio', {attributes:{autoplay:true}});
    waitFor(player).then((isOK) => {
        if(g.player) { g.player.src = ''; }
        if(isOK){
            g.player = player;
            setTimeout(playRandom, repeat_time);
        }
        else {
            playRandom();
        }
    })
    player.src = station.url_resolved ? station.url_resolved : station.url;
	renderStation(station);
}

function waitFor(obj){
	return new Promise((resolve, reject) => {
		
		obj.rp_done = function (e){
			cleanUpPlayer(obj)
			resolve(true);
		}
		obj.rp_error = function(e){
			cleanUpPlayer(obj)
			resolve(false);
		}
		obj.rp_timeout = function(e){
			cleanUpPlayer(obj);
			resolve(false);
		}

		obj.addEventListener('playing', obj.rp_done);
		obj.addEventListener('error', obj.rp_error);
		obj.timeout = setTimeout(obj.rp_timeout, 5000 * 10);
	});
}	

function cleanUpPlayer(obj){
	obj.removeEventListener('playing', obj.rp_done);
	obj.removeEventListener('error', obj.rp_error);
	clearTimeout(obj.timeout);
}


function initMediaEvents(audio){
	audio.addEventListener('abort', mediaEvents);
	audio.addEventListener('canplay', mediaEvents);
	audio.addEventListener('canplaythrough', mediaEvents);
	audio.addEventListener('emptied', mediaEvents);
	audio.addEventListener('ended', mediaEvents);
	audio.addEventListener('error', mediaEvents);
	audio.addEventListener('loadeddata', mediaEvents);
	audio.addEventListener('loadedmetadata', mediaEvents);
	audio.addEventListener('loadstart', mediaEvents);
	audio.addEventListener('pause', mediaEvents);
	audio.addEventListener('play', mediaEvents);
	audio.addEventListener('playing', mediaEvents);
	//audio.addEventListener('progress', mediaEvents);
	audio.addEventListener('ratechange', mediaEvents);
	audio.addEventListener('seeked', mediaEvents);
	audio.addEventListener('seeking', mediaEvents);
	audio.addEventListener('stalled', mediaEvents);
	audio.addEventListener('suspend', mediaEvents);
	//audio.addEventListener('timeupdate', mediaEvents);
	audio.addEventListener('volumechange', mediaEvents);
	audio.addEventListener('waiting', mediaEvents);
}

// Tools
// ###########################################################################

async function onKey(e) {
	//fb(e.keyCode)
	if (e.keyCode == 88 && e.ctrlKey && e.shiftKey) {
		ut.toggleClass(document.body, 'dark');
	}
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