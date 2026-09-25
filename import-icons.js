#!/usr/bin/env node

'use strict'

const fs = require('node:fs')

// Every Tabler icon of a given style shares the same root <svg> attributes. Only
// the inner markup is stored in icons.json; src/svg.ts rebuilds the root element
// at runtime. If Tabler ever changes these attributes, this script fails instead
// of silently producing icons that render differently.
const EXPECTED_ROOT_ATTRIBUTES = {
	outline: [
		'xmlns="http://www.w3.org/2000/svg"',
		'width="24"',
		'height="24"',
		'viewBox="0 0 24 24"',
		'fill="none"',
		'stroke="currentColor"',
		'stroke-width="2"',
		'stroke-linecap="round"',
		'stroke-linejoin="round"',
	],
	filled: [
		'xmlns="http://www.w3.org/2000/svg"',
		'width="24"',
		'height="24"',
		'viewBox="0 0 24 24"',
		'fill="currentColor"',
	],
}

// Returns the markup inside the root <svg> element, without Tabler's invisible
// 24x24 background path.
const parseSvgBody = (iconName, style, svg) => {
	const match = svg
		.replace(/\n/g, '')
		.replace(/>\s+</g, '><')
		.match(/^\s*<svg([^>]*)>(.*)<\/svg>\s*$/)

	if (!match) {
		throw new Error(`Icon "${iconName}" (${style}): could not parse SVG`)
	}

	const rootAttributes = match[1]
		.replace(/\s*class="[^"]*"/, '')
		.trim()
		.split(/\s+/)
		.join(' ')

	if (rootAttributes !== EXPECTED_ROOT_ATTRIBUTES[style].join(' ')) {
		throw new Error(`Icon "${iconName}" (${style}): unexpected <svg> attributes: ${rootAttributes}`)
	}

	return match[2]
		.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s?\/>/, '')
		.replace(/\s+\/>/g, '/>')
}

const readSvgBody = (iconName, style) => parseSvgBody(
	iconName,
	style,
	fs.readFileSync(`./node_modules/@tabler/icons/icons/${style}/${iconName}.svg`).toString(),
)

const normalizeTags = (tags) => (tags || [])
	.filter((tag) => tag !== null && tag !== '')
	.map(String)

const generateIconsJSON = (jsonFile, filename) => {
	const iconsPkg = require('./node_modules/@tabler/icons/package.json')
	const files = JSON.parse(fs.readFileSync(jsonFile))

	const icons = Object.keys(files).map((iconName) => {
		const iconData = files[iconName]
		const icon = {
			name: iconName,
			category: iconData.category,
			tags: normalizeTags(iconData.tags),
			body: readSvgBody(iconName, 'outline'),
		}

		// Only about a fifth of the icons have a filled variant; the field is
		// omitted for the rest to keep the file small.
		if (iconData.styles && iconData.styles.filled) {
			icon.filled = readSvgBody(iconName, 'filled')
		}

		return icon
	})

	fs.writeFileSync(filename, JSON.stringify({ version: iconsPkg.version, icons }))
}

module.exports = { parseSvgBody, normalizeTags }

if (require.main === module) {
	generateIconsJSON('./node_modules/@tabler/icons/icons.json', './src/icons.json')
}
