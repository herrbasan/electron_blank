import nui from '../nui/nui.js';
import ut from '../nui/nui_ut.js';
import nui_app from '../nui/nui_app.js';

document.addEventListener('DOMContentLoaded', init);
let g = {};

async function init(){
    let stations = await fetch('../stations.json');
    stations = await stations.json();
    g.stations = stations;
    console.log(stations);
}
