#!/usr/bin/env node
'use strict';

/**
 * Project Initialization Script
 * 
 * Run this after cloning to setup and customize the project.
 * Usage: node init-project.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

function run(cmd, label) {
    console.log(`  → ${label || cmd}...`);
    try {
        execSync(cmd, { stdio: 'inherit', shell: true });
        console.log(`  ✓ ${label || 'Done'}`);
        return true;
    } catch (e) {
        console.log(`  ✗ Failed: ${e.message}`);
        console.log(`    (Command: ${cmd})`);
        return false;
    }
}

async function init() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Electron + NUI2 Project Initializer                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log();

    // Get current folder name as default
    const currentDir = path.basename(process.cwd());
    const defaultName = currentDir !== 'electron_blank' ? currentDir : 'my-electron-app';

    // Collect project info
    const projectName = await question(`Project name (${defaultName}): `) || defaultName;
    const projectTitle = await question(`Window title (${projectName}): `) || projectName;
    const projectDesc = await question(`Description: `) || 'An Electron application';
    const author = await question(`Author: `) || '';

    console.log();
    console.log('══════════════════════════════════════════════════════════');
    console.log('Setting up project...');
    console.log('══════════════════════════════════════════════════════════');
    console.log();

    // 1. Update/download nui2 submodule
    const nui2Path = path.join('nui2', 'NUI', 'nui.js');
    if (!fs.existsSync(nui2Path)) {
        run('git submodule update --init --recursive', 'Downloading NUI2 submodule');
    } else {
        console.log('  ✓ NUI2 submodule already present');
    }

    // 2. Install npm dependencies
    console.log();
    const nodeModulesPath = path.join('node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        run('npm install', 'Installing npm dependencies');
    } else {
        console.log('  ✓ node_modules already present (run "npm install" manually if needed)');
    }

    // 3. Apply project customizations
    console.log();
    console.log('══════════════════════════════════════════════════════════');
    console.log('Customizing project files...');
    console.log('══════════════════════════════════════════════════════════');
    console.log();

    const files = {
        'package.json': (content) => {
            const pkg = JSON.parse(content);
            pkg.name = projectName;
            pkg.description = projectDesc;
            if (author) pkg.author = author;
            return JSON.stringify(pkg, null, 4);
        },
        'index.html': (content) => {
            return content
                .replace(/<title>.*?<\/title>/, `<title>${projectTitle}</title>`)
                .replace(/<h1>.*?<\/h1>/, `<h1>${projectTitle}</h1>`)
                .replace(/<p>.*?<\/p>/, `<p>${projectDesc}</p>`);
        },
        'README.md': (content) => {
            return content.replace(/# electron_blank/, `# ${projectName}`);
        },
        'forge.config.js': (content) => {
            if (author) {
                return content.replace(/authors: '.*?'/, `authors: '${author}'`);
            }
            return content;
        }
    };

    for (const [file, transform] of Object.entries(files)) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const newContent = transform(content);
            fs.writeFileSync(file, newContent);
            console.log(`  ✓ Updated ${file}`);
        }
    }

    // 4. Handle git disconnection
    console.log();
    console.log('══════════════════════════════════════════════════════════');
    console.log('Handling git repository...');
    console.log('══════════════════════════════════════════════════════════');
    console.log();

    const gitDir = path.join('.git');
    if (fs.existsSync(gitDir)) {
        const gitConfig = fs.readFileSync(path.join(gitDir, 'config'), 'utf8');
        const isOriginalRepo = gitConfig.includes('herrbasan/electron_blank');
        const hasRemoteOrigin = gitConfig.includes('[remote "origin"]');
        
        if (isOriginalRepo || hasRemoteOrigin) {
            console.log('  → Removing original git history and remote...');
            fs.rmSync(gitDir, { recursive: true, force: true });
            console.log('  ✓ Disconnected from original repository');
        }
    }

    const initGit = await question('\nInitialize new git repository? (Y/n): ');
    if (initGit.toLowerCase() !== 'n') {
        try {
            execSync('git init', { stdio: 'ignore' });
            execSync('git add -A', { stdio: 'ignore' });
            execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
            console.log('  ✓ New git repository initialized with initial commit');
        } catch (e) {
            console.log('  ✗ Git init failed. Run "git init" manually.');
        }
    }

    // 5. Self-destruct
    console.log();
    const deleteScript = await question('Delete init-project.js? (Y/n): ');
    if (deleteScript.toLowerCase() !== 'n') {
        fs.unlinkSync('init-project.js');
        console.log('  ✓ init-project.js removed');
    }

    // Done
    console.log();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Project ready!                                        ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Run the app:');
    console.log('  npm start');
    console.log();
    console.log('Package for distribution:');
    console.log('  npm run package');
    console.log('  npm run dist');
    console.log();

    rl.close();
}

init().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
