#!/usr/bin/env node
// Prepares a plugin release. Figma has no API for publishing plugin versions,
// so the last step (Publish new version in the desktop app) stays manual; this
// script does everything around it:
//
//   1. checks that you are on an up-to-date, clean main branch
//   2. builds the plugin and runs the unit and UI tests
//   3. drafts release notes from the changes since the last release, opens them
//      in an editor and copies the result to the clipboard
//   4. opens the Figma desktop app
//   5. after you confirm the version is published, tags the commit as
//      release-YYYY-MM-DD and pushes the tag
//
//   pnpm run release                   full flow
//   pnpm run release -- --dry-run      only build, test and print the notes
//   pnpm run release -- --since <ref>  base the notes on a commit instead of the last release tag
//   pnpm run release -- --skip-tests   skip unit and UI tests
//   pnpm run release -- --no-edit      use the draft notes without opening an editor
//   pnpm run release -- --yes          tag without asking for confirmation

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const option = (name) => {
	const index = args.indexOf(name)
	return index === -1 ? null : args[index + 1]
}
const dryRun = flag('--dry-run')

const run = (command, commandArgs, options = {}) =>
	execFileSync(command, commandArgs, { cwd: root, stdio: 'inherit', ...options })
const output = (command, commandArgs) =>
	// icons.json from an earlier commit is several MB, above the default 1 MB buffer.
	execFileSync(command, commandArgs, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const tryOutput = (command, commandArgs) => {
	try {
		return output(command, commandArgs)
	} catch {
		return null
	}
}
const step = (message) => console.log(`\n\u001b[1m${message}\u001b[0m`)
const fail = (message) => {
	console.error(`\n${message}`)
	process.exit(1)
}

// 1. Repository state
step('Checking the repository')
if (output('git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main' && !dryRun) {
	fail('Releases are made from main. Check out main first, or use --dry-run.')
}
if (output('git', ['status', '--porcelain'])) {
	fail('The working tree has uncommitted changes. Commit or stash them first.')
}
run('git', ['fetch', '--quiet', '--tags', 'origin', 'main'])
if (!dryRun && output('git', ['rev-parse', 'HEAD']) !== output('git', ['rev-parse', 'origin/main'])) {
	fail('main is not in sync with origin/main. Pull or push first.')
}

const since = option('--since') ?? tryOutput('git', ['describe', '--tags', '--abbrev=0', '--match', 'release-*'])
if (!since) {
	fail('No previous release-* tag found. Pass --since <commit> for the last published version.')
}
console.log(`Changes since ${since}`)

// 2. Build and test
step('Building the plugin')
run('pnpm', ['run', 'build'])
if (!flag('--skip-tests')) {
	step('Running unit tests')
	run('pnpm', ['run', 'test:unit'])
	step('Running UI tests')
	run('pnpm', ['run', 'test:ui'])
}

// 3. Release notes
const iconsAt = (ref) => JSON.parse(output('git', ['show', `${ref}:src/icons.json`]))
const oldIcons = iconsAt(since)
const newIcons = JSON.parse(fs.readFileSync(path.join(root, 'src/icons.json'), 'utf8'))
const filledCount = (data) => data.icons.filter((icon) => icon.filled).length

const iconLine = oldIcons.version === newIcons.version
	? null
	: `Tabler Icons updated from v${oldIcons.version} to v${newIcons.version}: ${newIcons.icons.length} icons`
		+ (filledCount(newIcons) ? `, ${filledCount(newIcons)} of them also filled` : '')
		+ ` (${newIcons.icons.length - oldIcons.icons.length >= 0 ? '+' : ''}${newIcons.icons.length - oldIcons.icons.length}).`

// One entry per change on main: a merged pull request or a direct commit.
// A change counts as user-facing when it touches src/ (other than icon data,
// which the line above covers); tests, scripts, CI and docs are listed apart.
const commits = output('git', ['log', '--first-parent', '--reverse', '--format=%H%x1f%s%x1f%b%x1e', `${since}..HEAD`])
	.split('\x1e')
	.map((entry) => entry.trim())
	.filter(Boolean)
	.map((entry) => {
		const [hash, subject, body] = entry.split('\x1f')
		const merge = subject.match(/^Merge pull request #(\d+)/)
		// Merge commits made in the GitHub UI may have no body; ask GitHub for the title then.
		const title = merge
			? (body.split('\n')[0].trim() || tryOutput('gh', ['pr', 'view', merge[1], '--json', 'title', '--jq', '.title']) || subject)
			: subject.replace(/\s*\(#\d+\)$/, '')
		const number = merge ? merge[1] : (subject.match(/\(#(\d+)\)$/) || [])[1]
		const files = output('git', ['diff', '--name-only', `${hash}^1`, hash]).split('\n').filter(Boolean)
		const userFacing = files.some((file) => file.startsWith('src/') && file !== 'src/icons.json')
		return { title, number, userFacing }
	})

const userChanges = commits.filter((c) => c.userFacing).map((c) => `- ${c.title}`)
const internalChanges = commits.filter((c) => !c.userFacing).map((c) => `- ${c.title}${c.number ? ` (#${c.number})` : ''}`)

let notes = [iconLine, ...userChanges].filter(Boolean).join('\n')

step('Draft release notes')
console.log(notes || '(no user-facing changes)')
if (internalChanges.length) {
	step('Internal changes, not included in the notes')
	console.log(internalChanges.join('\n'))
}

if (dryRun) {
	console.log('\nDry run: nothing was copied, opened or tagged.')
	process.exit(0)
}

// The split above is a heuristic based on changed files, and pull request
// titles are written for developers, so the draft is opened for editing.
if (!flag('--no-edit') && process.stdin.isTTY) {
	const file = path.join(os.tmpdir(), `tabler-icons-figma-release-notes-${Date.now()}.txt`)
	fs.writeFileSync(file, notes + '\n')
	const editor = process.env.VISUAL || process.env.EDITOR
	step('Edit the release notes, then save and close the editor')
	if (editor) {
		execFileSync(editor, [file], { stdio: 'inherit', shell: true })
	} else if (process.platform === 'darwin') {
		execFileSync('open', ['-W', '-t', file])
	} else {
		execFileSync('vi', [file], { stdio: 'inherit' })
	}
	notes = fs.readFileSync(file, 'utf8').trim()
	fs.rmSync(file)
	console.log(notes)
}

// 4. Clipboard and Figma
if (process.platform === 'darwin') {
	execFileSync('pbcopy', { input: notes })
	console.log('\nThe release notes are in your clipboard.')
	if (tryOutput('open', ['-a', 'Figma']) === null) {
		console.log('Could not open the Figma app; open it manually.')
	}
}

step('Publish in Figma')
console.log([
	'1. In the Figma desktop app, open Plugins > Manage plugins.',
	'2. Next to Tabler Icons, choose Publish new version.',
	'   If it is missing, choose Locate local version and pick manifest.json in this repository.',
	'3. Paste the release notes and publish.',
].join('\n'))

// 5. Tag
const date = new Date().toISOString().slice(0, 10)
let tag = `release-${date}`
for (let i = 2; tryOutput('git', ['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]) !== null; i++) {
	tag = `release-${date}-${i}`
}

if (!flag('--yes')) {
	if (!process.stdin.isTTY) {
		console.log(`\nNot tagging: no terminal to confirm in. Run with --yes to tag ${tag}.`)
		process.exit(0)
	}
	const prompt = readline.createInterface({ input: process.stdin, output: process.stdout })
	const answer = await prompt.question(`\nPublished the new version in Figma? Tag this commit as ${tag} [y/N] `)
	prompt.close()
	if (!/^y(es)?$/i.test(answer.trim())) {
		console.log('Not tagged. Run the script again after publishing.')
		process.exit(0)
	}
}

run('git', ['tag', '-a', tag, '-m', `Figma plugin release ${date}\n\n${notes}`])
run('git', ['push', 'origin', tag])
console.log(`\nTagged and pushed ${tag}.`)
