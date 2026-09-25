#!/usr/bin/env node
// Builds a test payload that exercises src/insert-icon.ts against a real Figma
// file through the Figma MCP server (`upload_assets` + `use_figma`).
//
// The Plugin API sandbox used by `use_figma` has no network access and each
// script is limited to 50,000 characters, so the test code and all icon data
// are packed into a PNG (in a private `tbTs` chunk). The PNG is uploaded to the
// file, and a small loader script reads it back and runs the tests.
//
//   node scripts/figma-tests.mjs
//
// Writes .figma-tests/payload.png and .figma-tests/loader.js. See README.md.

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const outDir = path.join(root, '.figma-tests')

function transpile(file) {
	const source = fs.readFileSync(path.join(root, file), 'utf8')
	const { outputText } = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, removeComments: true },
	})
	if (/^\s*import\s/m.test(outputText)) {
		throw new Error(`${file} has imports; the test payload only supports standalone modules`)
	}
	return outputText.replace(/^export\s+/gm, '').replace(/^\s*export\s*\{\s*\};?\s*$/gm, '').trim()
}

const sources = ['src/insert-icon.ts', 'src/svg.ts']
const iconsJson = fs.readFileSync(path.join(root, 'src/icons.json'), 'utf8')
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12)

let commit = 'unknown'
try {
	commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
	if (execSync('git status --porcelain -- src', { cwd: root }).toString().trim()) commit += '-dirty'
} catch {}

const meta = {
	generatedAt: new Date().toISOString(),
	commit,
	iconsVersion: JSON.parse(iconsJson).version,
	sources: Object.fromEntries([...sources, 'src/icons.json'].map((f) => [f, sha(fs.readFileSync(path.join(root, f), 'utf8'))])),
}

// Runs inside Figma. `figma` is the Plugin API global.
const runtime = String.raw`
const BLACK = (p) => p.type === 'SOLID' && p.color.r === 0 && p.color.g === 0 && p.color.b === 0
const visible = (paints) => paints.filter((p) => p.visible !== false)

// After figma.flatten, filled parts of an icon (for example a filled dot next to
// stroked outlines) live in vectorNetwork.regions. node.fills is then either
// empty or figma.mixed, so both places are inspected.
function fillsOf(v) {
	const mixed = v.fills === figma.mixed
	const own = mixed ? [] : visible(v.fills)
	const regions = ((v.vectorNetwork && v.vectorNetwork.regions) || []).filter((r) => r.fills && visible(r.fills).length)
	return { mixed, paints: [...own, ...regions.flatMap((r) => visible(r.fills))], filledRegions: regions.length }
}

function check(frame, expected) {
	const issues = []
	if (frame.type !== 'FRAME') issues.push('root is ' + frame.type)
	if (frame.name !== 'tabler-icon-' + expected.name) issues.push('name ' + frame.name)
	if (frame.width !== 24 || frame.height !== 24) issues.push('size ' + frame.width + 'x' + frame.height)
	if (visible(frame.fills).length) issues.push('frame has visible fill')
	const children = frame.children
	if (!children.length) return { issues: [...issues, 'no children'], signature: 'empty' }
	// Pasted as outline, icons with filled parts keep them as extra fill-only vectors.
	if (children.length !== 1 && !expected.outlineStroke) issues.push(children.length + ' children')
	const signatures = []
	for (const v of children) {
		if (v.type !== 'VECTOR') issues.push('child is ' + v.type)
		const fills = fillsOf(v)
		const strokes = visible(v.strokes)
		if (![...fills.paints, ...strokes].every(BLACK)) issues.push('non-black paint')
		if (expected.stroke) {
			if (!strokes.length) issues.push('missing stroke')
			else if (v.strokeWeight !== Number(expected.stroke)) issues.push('strokeWeight ' + String(v.strokeWeight))
		} else {
			if (strokes.length) issues.push('unexpected stroke')
			if (!fills.paints.length) issues.push('missing fill')
		}
		// A single straight line (minus, letter-i) legitimately has zero width or height.
		if (v.width <= 0 && v.height <= 0) issues.push('empty vector')
		if (v.x < -1 || v.y < -1 || v.x + v.width > 25 || v.y + v.height > 25) {
			issues.push('vector out of bounds ' + [v.x, v.y, v.width, v.height].map((n) => n.toFixed(1)).join(','))
		}
		signatures.push(v.type + ' fills:' + (fills.mixed ? 'mixed' : fills.paints.length ? 'yes' : 'no') + ' filledRegions:' + fills.filledRegions + ' strokes:' + strokes.length)
	}
	const signature = (children.length > 1 ? children.length + ' children: ' : '') + [...new Set(signatures)].join(' | ')
	return { issues, signature }
}

function variantsFor(icon, style, strokes) {
	if (style === 'filled') {
		return [{ key: 'filled', name: icon.name + '-filled', svg: buildFilledSvg(icon.filled), outlineStroke: false, stroke: null }]
	}
	const list = strokes.map((sw) => ({ key: 'outline-' + sw, name: icon.name, svg: buildOutlineSvg(icon.body, sw), outlineStroke: false, stroke: sw }))
	list.push({ key: 'outlined', name: icon.name, svg: buildOutlineSvg(icon.body, '2'), outlineStroke: true, stroke: null })
	return list
}

const isSpecial = (markup) => /<path (?!d="[^"]*"\/>)/.test(markup)

const SETS = {
	// Outline icons whose paths carry attributes other than d (fill, opacity, stroke).
	special: () => ICONS.filter((i) => isSpecial(i.body)).map((i) => [i, 'outline']),
	filled: () => ICONS.filter((i) => i.filled).map((i) => [i, 'filled']),
	outline: () => ICONS.map((i) => [i, 'outline']),
}

function smoke({ set = 'special', names, start = 0, count = Infinity, strokes = ['2'] }) {
	if (!SETS[set]) throw new Error('Unknown set ' + set + '. Use: ' + Object.keys(SETS).join(', '))
	const all = SETS[set]().filter(([icon]) => !names || names.includes(icon.name))
	const slice = all.slice(start, start + count)
	const issues = []
	const signatures = {}
	let tested = 0
	for (const [icon, style] of slice) {
		for (const variant of variantsFor(icon, style, strokes)) {
			let frame
			try {
				frame = insertIcon(variant, { x: -100000, y: -100000 })
				const result = check(frame, variant)
				const key = variant.key.replace(/^outline-.*/, 'outline') + ' -> ' + result.signature
				signatures[key] = (signatures[key] || 0) + 1
				if (result.issues.length) issues.push(icon.name + ' [' + variant.key + ']: ' + result.issues.join('; '))
			} catch (error) {
				issues.push(icon.name + ' [' + variant.key + ']: threw ' + String(error))
			} finally {
				if (frame && !frame.removed) frame.remove()
			}
			tested++
		}
	}
	return {
		set, start, end: start + slice.length, total: all.length, tested,
		issueCount: issues.length, issues: issues.slice(0, 40), signatures,
	}
}

async function visual({ names }) {
	const GRID_NAME = 'Insert test grid'
	for (const old of figma.currentPage.children.filter((n) => n.name === GRID_NAME)) old.remove()
	await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

	const picked = names
		? names.map((name) => ICONS.find((i) => i.name === name)).filter(Boolean)
		: [
			...ICONS.filter((i) => ['heart', 'star', 'user', 'settings', 'brand-github', 'arrow-right', 'bell', 'home'].includes(i.name)),
			...ICONS.filter((i) => isSpecial(i.body)).slice(0, 4),
			...ICONS.filter((i) => i.filled && isSpecial(i.filled)).slice(0, 2),
		]

	// "ref" columns show the SVG imported without flattening, for comparison.
	const COLUMNS = ['ref-outline', 'outline-1', 'outline-1.5', 'outline-2', 'outlined', 'ref-filled', 'filled']
	const grid = figma.createAutoLayout('VERTICAL', { name: GRID_NAME, itemSpacing: 8, paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16 })
	grid.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
	const others = figma.currentPage.children.filter((n) => n !== grid)
	grid.x = others.reduce((m, n) => Math.max(m, n.x + n.width), 0) + 200
	grid.y = 0

	const label = (text, width) => {
		const t = figma.createText()
		t.characters = text
		t.fontSize = 10
		t.resize(width, t.height)
		t.textAutoResize = 'HEIGHT'
		return t
	}
	const header = figma.createAutoLayout({ name: 'header', itemSpacing: 16, counterAxisAlignItems: 'CENTER' })
	header.fills = []
	header.appendChild(label('icon', 160))
	for (const c of COLUMNS) header.appendChild(label(c.replace(/^outline-/, 'w'), 48))
	grid.appendChild(header)

	const issues = []
	let tested = 0
	for (const icon of picked) {
		const row = figma.createAutoLayout({ name: icon.name, itemSpacing: 16, counterAxisAlignItems: 'CENTER' })
		row.fills = []
		row.appendChild(label(icon.name, 160))
		const variants = [
			...variantsFor(icon, 'outline', ['1', '1.5', '2']),
			...(icon.filled ? variantsFor(icon, 'filled', []) : []),
		]
		for (const key of COLUMNS) {
			const holder = figma.createFrame()
			holder.resize(48, 24)
			holder.fills = []
			const variant = variants.find((v) => v.key === key)
			const reference = key === 'ref-outline' ? buildOutlineSvg(icon.body, '2')
				: key === 'ref-filled' && icon.filled ? buildFilledSvg(icon.filled) : null
			if (reference) {
				const frame = figma.createNodeFromSvg(reference)
				frame.name = 'reference ' + icon.name
				holder.appendChild(frame)
				frame.x = 0
				frame.y = 0
			} else if (variant) {
				const frame = insertIcon(variant, { x: 0, y: 0 })
				const result = check(frame, variant)
				if (result.issues.length) issues.push(icon.name + ' [' + key + ']: ' + result.issues.join('; '))
				holder.appendChild(frame)
				frame.x = 0
				frame.y = 0
				tested++
			}
			row.appendChild(holder)
		}
		grid.appendChild(row)
	}
	return { gridId: grid.id, tested, issues }
}

async function run(options = {}) {
	const result = options.mode === 'visual' ? await visual(options) : smoke(options)
	return { meta: META, ...result }
}
`

const script = [
	transpile('src/insert-icon.ts'),
	transpile('src/svg.ts'),
	'const META = ' + JSON.stringify(meta),
	// Tags are not needed by the tests; non-ASCII characters are escaped so the
	// loader can decode the payload byte by byte.
	'const ICONS = ' + JSON.stringify(JSON.parse(iconsJson).icons.map(({ name, body, filled }) => ({ name, body, filled })))
		.replace(/[^\x00-\x7f]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')),
	runtime,
].join('\n\n')

if (/[^\x00-\x7f]/.test(script)) {
	throw new Error('Payload must be ASCII so the loader can decode it byte by byte')
}

// Minimal valid 1x1 PNG with the script in a private ancillary chunk.
function chunk(type, data) {
	const length = Buffer.alloc(4)
	length.writeUInt32BE(data.length)
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
	const crc = Buffer.alloc(4)
	crc.writeUInt32BE(zlib.crc32(body))
	return Buffer.concat([length, body, crc])
}
const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])
const png = Buffer.concat([
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	chunk('IHDR', ihdr),
	chunk('tbTs', Buffer.from(script, 'ascii')),
	chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 255, 255]))),
	chunk('IEND', Buffer.alloc(0)),
])

const loader = String.raw`// Loader for the Tabler Icons plugin test payload (scripts/figma-tests.mjs).
// Edit OPTIONS, then run with the use_figma tool on the page holding the payload image.
const OPTIONS = { mode: 'smoke', set: 'special', start: 0, count: 500 }

const decode = (bytes) => {
	let text = ''
	for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192))
	return text
}
const readPayload = async (hash) => {
	const bytes = await figma.getImageByHash(hash).getBytesAsync()
	let offset = 8
	while (offset < bytes.length) {
		const length = ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
		const type = decode(bytes.subarray(offset + 4, offset + 8))
		if (type === 'tbTs') return decode(bytes.subarray(offset + 8, offset + 8 + length))
		offset += 12 + length
	}
	return null
}

const candidates = figma.currentPage.findAll((n) => 'fills' in n && Array.isArray(n.fills) && n.fills.some((f) => f.type === 'IMAGE'))
let best = null
for (const node of candidates) {
	const source = await readPayload(node.fills.find((f) => f.type === 'IMAGE').imageHash)
	if (!source) continue
	const generatedAt = (source.match(/const META = \{"generatedAt":"([^"]+)"/) || [])[1] || ''
	if (!best || generatedAt > best.generatedAt) best = { node, source, generatedAt }
}
if (!best) throw new Error('No test payload image found on this page. Upload .figma-tests/payload.png first.')
best.node.name = 'Test payload ' + best.generatedAt
const run = new Function('figma', best.source + '\nreturn run')(figma)
return await run(OPTIONS)
`

fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, f))
fs.writeFileSync(path.join(outDir, 'payload.png'), png)
fs.writeFileSync(path.join(outDir, 'loader.js'), loader)
console.log(`.figma-tests/payload.png  ${(png.length / 1024).toFixed(0)} KB  commit ${commit}  icons v${meta.iconsVersion}`)
console.log(`.figma-tests/loader.js    ${loader.length} chars`)
