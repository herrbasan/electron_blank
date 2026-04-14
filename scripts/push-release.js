#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

function run(cmd, stdio = 'pipe') {
	return execSync(cmd, { encoding: 'utf8', stdio }).trim();
}

function bumpVersion(current, type) {
	const [major, minor, patch] = current.split('.').map(Number);
	if (type === 'major') return `${major + 1}.0.0`;
	if (type === 'minor') return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

async function main() {
	const pkgPath = path.join(process.cwd(), 'package.json');
	const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
	const current = pkg.version;

	// Preconditions
	const branch = run('git branch --show-current');
	if (branch !== 'main') {
		console.error(`Abort: not on main branch (currently on '${branch}')`);
		process.exit(1);
	}

	const status = run('git status --porcelain');
	if (status) {
		console.error('Abort: working tree is not clean. Commit or stash changes first.');
		console.error(status);
		process.exit(1);
	}

	console.log(`Current version: ${current}`);
	const bump = await question('Bump (patch/minor/major) or exact version: ');
	const newVersion = bump.match(/^\d+\.\d+\.\d+$/) ? bump : bumpVersion(current, bump || 'patch');

	const tag = `v${newVersion}`;

	// Check local tag
	try {
		run(`git rev-parse ${tag}`);
		console.error(`Abort: tag ${tag} already exists locally.`);
		process.exit(1);
	} catch (e) {
		if (!e.stderr?.includes('unknown revision') && !e.message.includes('unknown revision')) throw e;
	}

	// Check remote tag
	const remoteTag = run(`git ls-remote --tags origin ${tag}`);
	if (remoteTag) {
		console.error(`Abort: tag ${tag} already exists on origin.`);
		process.exit(1);
	}

	console.log(`\nNew version: ${newVersion}  (${tag})`);
	const confirm = process.env.CI ? 'Y' : await question('Proceed? (Y/n) ');
	if (confirm.toLowerCase() === 'n') {
		console.log('Aborted.');
		process.exit(0);
	}

	// Bump version (updates package.json + package-lock.json)
	console.log('\n→ Bumping version...');
	execSync(`npm version ${newVersion} --no-git-tag-version --no-commit-hooks`, { stdio: 'inherit' });

	// Commit
	console.log('→ Committing...');
	execSync('git add package.json package-lock.json', { stdio: 'inherit' });
	execSync(`git commit -m "Bump version to ${newVersion}"`, { stdio: 'inherit' });

	// Push commit
	console.log('→ Pushing commit...');
	execSync('git push origin main', { stdio: 'inherit' });

	// Build release
	console.log('→ Building release archive...');
	execSync('node scripts/build-release.js', { stdio: 'inherit' });

	// Tag and push
	console.log(`→ Creating and pushing tag ${tag}...`);
	execSync(`git tag ${tag}`, { stdio: 'inherit' });
	execSync(`git push origin ${tag}`, { stdio: 'inherit' });

	console.log('\n✓ Release pushed successfully!');
	console.log(`  Tag:     ${tag}`);
	console.log(`  Archive: out/electron_blank-${newVersion}.zip`);
	console.log('  GitHub Actions will build and publish the release archive shortly.');

	rl.close();
}

main().catch(err => {
	console.error('Error:', err.message || err);
	process.exit(1);
});
