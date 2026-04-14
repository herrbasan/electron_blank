#!/usr/bin/env node
'use strict';

/**
 * Build a clean release archive from the current repo state.
 * Intended to run in CI (GitHub Actions) after submodules are checked out.
 *
 * Customization env vars (all optional):
 *   RELEASE_NAME    -> package.json name
 *   RELEASE_TITLE   -> app/index.html <title> and <h1>
 *   RELEASE_DESC    -> package.json description and app/index.html <p>
 *   RELEASE_AUTHOR  -> package.json author and forge.config.js authors
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const BUILD_DIR = path.join(DIST_DIR, 'electron_blank');
const ZIP_NAME = `electron_blank-${process.env.GITHUB_REF_NAME || 'snapshot'}.zip`;
const ZIP_PATH = path.join(DIST_DIR, ZIP_NAME);

const projectName = process.env.RELEASE_NAME || 'electron_blank';
const projectTitle = process.env.RELEASE_TITLE || projectName;
const projectDesc = process.env.RELEASE_DESC || 'Blank Electron Project';
const author = process.env.RELEASE_AUTHOR || '';

const EXCLUDES = new Set([
	'.git',
	'.github',
	'.gitmodules',
	'node_modules',
	'out',
	'dist',
	'_Archive',
	'project_snapshot.txt',
	'init-project.js'
]);

function copyDir(src, dest) {
	fs.mkdirSync(dest, { recursive: true });
	for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
		const name = entry.name;
		if (EXCLUDES.has(name)) continue;

		const srcPath = path.join(src, name);
		const destPath = path.join(dest, name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

function removeGitDirs(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const child = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '.git') {
				fs.rmSync(child, { recursive: true, force: true });
			} else {
				removeGitDirs(child);
			}
		}
	}
}

function transformFile(filePath, transform) {
	if (!fs.existsSync(filePath)) return;
	const content = fs.readFileSync(filePath, 'utf8');
	const newContent = transform(content);
	fs.writeFileSync(filePath, newContent);
	console.log(`  ✓ Updated ${path.relative(BUILD_DIR, filePath)}`);
}

function main() {
	console.log('╔════════════════════════════════════════════════════════╗');
	console.log('║  Building release archive                              ║');
	console.log('╚════════════════════════════════════════════════════════╝');
	console.log();

	// Ensure submodules are present
	const nui2Path = path.join('app', 'modules', 'nui2', 'NUI', 'nui.js');
	if (!fs.existsSync(nui2Path)) {
		console.log('  → Initializing submodules...');
		execSync('git submodule update --init --recursive', { stdio: 'inherit' });
	}

	// Clean and recreate build dir
	if (fs.existsSync(BUILD_DIR)) {
		fs.rmSync(BUILD_DIR, { recursive: true, force: true });
	}
	fs.mkdirSync(BUILD_DIR, { recursive: true });

	// Copy project files
	console.log('  → Copying project files...');
	copyDir(ROOT, BUILD_DIR);

	// Remove any nested .git directories (submodules become plain folders)
	console.log('  → Stripping git metadata...');
	removeGitDirs(BUILD_DIR);

	// Apply customizations
	console.log('  → Applying customizations...');
	transformFile(path.join(BUILD_DIR, 'package.json'), (content) => {
		const pkg = JSON.parse(content);
		pkg.name = projectName;
		pkg.description = projectDesc;
		if (author) pkg.author = author;
		return JSON.stringify(pkg, null, 4) + '\n';
	});

	transformFile(path.join(BUILD_DIR, 'app', 'index.html'), (content) => {
		return content
			.replace(/<title>.*?<\/title>/, `<title>${projectTitle}</title>`)
			.replace(/<h1>.*?<\/h1>/, `<h1>${projectTitle}</h1>`)
			.replace(/<p>.*?<\/p>/, `<p>${projectDesc}</p>`);
	});

	transformFile(path.join(BUILD_DIR, 'README.md'), (content) => {
		return content.replace(/# electron_blank/, `# ${projectName}`);
	});

	transformFile(path.join(BUILD_DIR, 'forge.config.js'), (content) => {
		if (author) {
			return content.replace(/authors: '.*?'/, `authors: '${author}'`);
		}
		return content;
	});

	// Create zip
	console.log('  → Creating archive...');
	if (fs.existsSync(ZIP_PATH)) {
		fs.unlinkSync(ZIP_PATH);
	}
	try {
		execSync(`zip -r "${ZIP_NAME}" electron_blank`, { cwd: DIST_DIR, stdio: 'inherit' });
	} catch {
		execSync(`powershell -Command "Compress-Archive -Path '${BUILD_DIR}' -DestinationPath '${ZIP_PATH}'"`, { cwd: ROOT, stdio: 'inherit' });
	}

	console.log();
	console.log(`✓ Release archive ready: ${ZIP_PATH}`);
}

main();
