#!/usr/bin/env node
'use strict';

/**
 * Project Initialization Script
 * 
 * Run this after cloning to customize the project for your needs.
 * Usage: node init-project.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function init() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Electron + NUI2 Project Initializer                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log();

    // Get current folder name as default
    const currentDir = path.basename(process.cwd());
    const defaultName = currentDir !== 'electron_blank' ? currentDir : 'my-electron-app';

    const projectName = await question(`Project name (${defaultName}): `) || defaultName;
    const projectTitle = await question(`Window title (${projectName}): `) || projectName;
    const projectDesc = await question(`Description: `) || 'An Electron application';
    const author = await question(`Author: `) || '';

    console.log();
    console.log('Applying changes...');

    // Files to modify
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

    // Process each file
    for (const [file, transform] of Object.entries(files)) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const newContent = transform(content);
            fs.writeFileSync(file, newContent);
            console.log(`  ✓ Updated ${file}`);
        }
    }

    // Handle git disconnection
    const gitDir = path.join('.git');
    if (fs.existsSync(gitDir)) {
        const gitConfig = fs.readFileSync(path.join(gitDir, 'config'), 'utf8');
        const isOriginalRepo = gitConfig.includes('herrbasan/electron_blank');
        const hasRemoteOrigin = gitConfig.includes('[remote "origin"]');
        
        if (isOriginalRepo || hasRemoteOrigin) {
            console.log('  → Removing original git history and remote...');
            fs.rmSync(gitDir, { recursive: true, force: true });
            console.log('  ✓ Disconnected from original repository');
            
            const initGit = await question('\nInitialize new git repository? (Y/n): ');
            if (initGit.toLowerCase() !== 'n') {
                const { execSync } = require('child_process');
                try {
                    execSync('git init', { stdio: 'ignore' });
                    execSync('git add -A', { stdio: 'ignore' });
                    execSync('git commit -m "Initial commit"', { stdio: 'ignore' });
                    console.log('  ✓ New git repository initialized with initial commit');
                } catch (e) {
                    console.log('  ✗ Git init failed. Run "git init" manually.');
                }
            }
        }
    }

    // Self-destruct or rename
    const deleteScript = await question('\nDelete init-project.js? (Y/n): ');
    if (deleteScript.toLowerCase() !== 'n') {
        fs.unlinkSync('init-project.js');
        console.log('  ✓ init-project.js removed');
    }

    console.log();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  Project initialized!                                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log();
    console.log('Next steps:');
    console.log('  npm install');
    console.log('  npm start');
    console.log();

    rl.close();
}

init().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
