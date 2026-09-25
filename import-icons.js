#!/usr/bin/env node

'use strict'

const fs = require('node:fs')

// Every Tabler outline icon shares the same root <svg> attributes. Only the inner
// markup is stored in icons.json; src/svg.ts rebuilds the root element at runtime.
// If Tabler ever changes these attributes, this script fails instead of silently
// producing icons that render differently.
const EXPECTED_ROOT_ATTRIBUTES = [
	'xmlns="http://www.w3.org/2000/svg"',
	'width="24"',
	'height="24"',
	'viewBox="0 0 24 24"',
	'fill="none"',
	'stroke="currentColor"',
	'stroke-width="2"',
	'stroke-linecap="round"',
	'stroke-linejoin="round"',
]

const extractSvgBody = (iconName, svg) => {
	const match = svg
		.replace(/\n/g, '')
		.replace(/>\s+</g, '><')
		.match(/^\s*<svg([^>]*)>(.*)<\/svg>\s*$/)

	if (!match) {
		throw new Error(`Icon "${iconName}": could not parse SVG`)
	}

	const rootAttributes = match[1]
		.replace(/\s*class="[^"]*"/, '')
		.trim()
		.split(/\s+/)
		.join(' ')

	if (rootAttributes !== EXPECTED_ROOT_ATTRIBUTES.join(' ')) {
		throw new Error(`Icon "${iconName}": unexpected <svg> attributes: ${rootAttributes}`)
	}

	return match[2]
		.replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s?\/>/, '')
		.replace(/\s+\/>/g, '/>')
}

const normalizeTags = (tags) => (tags || [])
	.filter((tag) => tag !== null && tag !== '')
	.map(String)

const iconsPkg = require('./node_modules/@tabler/icons/package.json')

const generateIconsJSON = (jsonFile, filename) => {
	const files = JSON.parse(fs.readFileSync(jsonFile))

	const icons = Object.keys(files).map((iconName) => {
		const iconData = files[iconName]
		const svg = fs.readFileSync(`./node_modules/@tabler/icons/icons/outline/${iconName}.svg`).toString()

		return {
			name: iconName,
			category: iconData.category,
			tags: normalizeTags(iconData.tags),
			body: extractSvgBody(iconName, svg),
		}
	})

	fs.writeFileSync(filename, JSON.stringify({ version: iconsPkg.version, icons }))
}

generateIconsJSON('./node_modules/@tabler/icons/icons.json', './src/icons.json')
