#!/usr/bin/env node
// Updates @tabler/icons to the latest version (or the one given), regenerates
// src/icons.json, builds and tests the plugin, then commits the result on a new
// branch and opens a pull request.
//
//   pnpm run icons                   update to the latest version and open a PR
//   pnpm run icons -- --check        only report whether an update is available
//   pnpm run icons -- --no-pr        stop after committing on the new branch
//   pnpm run icons -- --skip-tests   skip unit and UI tests (not recommended)
//   pnpm run icons -- --version 3.48.0   use a specific version instead of latest

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
	const index = args.indexOf(name)
	return index === -1 ? null : args[index + 1]
}

const run = (command, commandArgs, options = {}) =>
	execFileSync(command, commandArgs, { cwd: root, stdio: 'inherit', ...options })
const output = (command, commandArgs) =>
	execFileSync(command, commandArgs, { cwd: root, encoding: 'utf8' }).trim()
const step = (message) => console.log(`\n\u001b[1m${message}\u001b[0m`)

const readIcons = () => JSON.parse(fs.readFileSync(path.join(root, 'src/icons.json'), 'utf8'))
const installedVersion = () =>
	JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@tabler/icons/package.json'), 'utf8')).version

const current = readIcons().version
const target = option('--version') ?? output('pnpm', ['view', '@tabler/icons', 'version'])

if (current === target) {
	console.log(`Icons are up to date (v${current}).`)
	process.exit(0)
}

console.log(`Update available: v${current} -> v${target}`)
if (flag('--check')) {
	process.exit(0)
}

if (output('git', ['status', '--porcelain'])) {
	console.error('The working tree has uncommitted changes. Commit or stash them first.')
	process.exit(1)
}

const branch = `update-icons-v${target}`
step(`Creating branch ${branch}`)
run('git', ['checkout', '-b', branch])

const before = readIcons()

step(`Installing @tabler/icons@${target}`)
// `pnpm add` keeps an already installed newer release when it satisfies the
// saved range, so the version is written to package.json directly. A requested
// (possibly older) version is pinned exactly; the latest one gets a caret range.
const packageJsonPath = path.join(root, 'package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
packageJson.devDependencies['@tabler/icons'] = option('--version') ? target : `^${target}`
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
run('pnpm', ['install'])
if (installedVersion() !== target) {
	throw new Error(`Expected @tabler/icons ${target} to be installed, found ${installedVersion()}`)
}

step('Regenerating src/icons.json')
run('pnpm', ['run', 'icons:generate'])

step('Building the plugin')
run('pnpm', ['run', 'build'])

if (!flag('--skip-tests')) {
	step('Running unit tests')
	run('pnpm', ['run', 'test:unit'])
	step('Running UI tests')
	run('pnpm', ['run', 'test:ui'])
}

// Summarise what changed for the commit message and pull request.
const after = readIcons()
const names = (data, style) => new Set(data.icons.filter((i) => style === 'outline' || i.filled).map((i) => i.name))
const diff = (style) => {
	const old = names(before, style)
	const now = names(after, style)
	return {
		added: [...now].filter((name) => !old.has(name)).sort(),
		removed: [...old].filter((name) => !now.has(name)).sort(),
	}
}
const outline = diff('outline')
const filled = diff('filled')

const list = (items) => (items.length ? items.map((name) => `\`${name}\``).join(', ') : 'none')
const summary = [
	`| | Before | After |`,
	`|---|---|---|`,
	`| Outline icons | ${before.icons.length} | ${after.icons.length} |`,
	`| Filled icons | ${before.icons.filter((i) => i.filled).length} | ${after.icons.filter((i) => i.filled).length} |`,
	'',
	`- **New outline icons (${outline.added.length}):** ${list(outline.added)}`,
	`- **New filled variants (${filled.added.length}):** ${list(filled.added)}`,
	`- **Removed outline icons (${outline.removed.length}):** ${list(outline.removed)}`,
	`- **Removed filled variants (${filled.removed.length}):** ${list(filled.removed)}`,
].join('\n')

step('Summary')
console.log(summary)

const title = `update icons to v${target}`
step('Committing')
run('git', ['add', 'package.json', 'pnpm-lock.yaml', 'src/icons.json'])
run('git', ['commit', '-m', title, '-m', `Tabler Icons v${current} -> v${target}.`])

if (flag('--no-pr')) {
	console.log(`\nCommitted on ${branch}. Push it and open a pull request when ready.`)
	process.exit(0)
}

step('Opening a pull request')
run('git', ['push', '-u', 'origin', branch])
run('gh', [
	'pr', 'create',
	'--base', 'main',
	'--head', branch,
	'--title', title,
	'--body', [
		`Updates Tabler Icons from v${current} to v${target} and regenerates \`src/icons.json\`.`,
		'',
		summary,
		'',
		`Release notes: https://github.com/tabler/tabler-icons/releases/tag/v${target}`,
		'',
		'Generated by `pnpm run icons`, which ran the build' + (flag('--skip-tests') ? '' : ', unit tests and UI tests') + '.',
	].join('\n'),
])
