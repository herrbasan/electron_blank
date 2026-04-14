#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const modules = [
	{
		name: 'electron_helper',
		url: 'https://github.com/herrbasan/electron_helper.git',
		path: path.join('app', 'modules', 'electron_helper')
	},
	{
		name: 'nui2',
		url: 'https://github.com/herrbasan/nui_wc2.git',
		path: path.join('app', 'modules', 'nui2')
	}
];

function isGitRepoWorkflow() {
	const gitmodulesPath = path.join('.gitmodules');
	if (!fs.existsSync(gitmodulesPath)) return false;
	const content = fs.readFileSync(gitmodulesPath, 'utf8');
	return modules.some(m => content.includes(m.path.replace(/\\/g, '/')));
}

if (isGitRepoWorkflow()) {
	console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.error('  WARNING: This script is for the release workflow only.');
	console.error('  You appear to be in the original git repository.');
	console.error('');
	console.error('  To update submodules here, run:');
	console.error('    git submodule update --remote');
	console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	process.exit(1);
}

for (const mod of modules) {
	console.log(`Updating ${mod.name}...`);
	if (fs.existsSync(mod.path)) {
		fs.rmSync(mod.path, { recursive: true, force: true });
	}
	execSync(`git clone --depth 1 ${mod.url} ${mod.path}`, { stdio: 'inherit' });
	console.log(`✓ ${mod.name} updated\n`);
}
