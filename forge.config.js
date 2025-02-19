const path = require('path');

module.exports = {
  packagerConfig: {
    asar:true,
    ignore:['_Material', '_gsdata_', '.vscode', 'bin'],
    extraResource: [
      "config.json",
      "./build/icons/"
    ],
    executableName: 'blank',
    icon:path.join(__dirname, 'build', 'icons', 'nui-icon-app-fullscreen.ico'),
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'blank',
        setupExe: 'blank_setup.exe',
        setupIcon: path.join(__dirname, 'build', 'icons', 'nui-icon-installer.ico'),
        iconUrl:'https://raum.com/update/nui/nui-icon-app-fullscreen.ico',
      },
    }
  ]
};
