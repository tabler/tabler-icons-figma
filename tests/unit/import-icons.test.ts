import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { parseSvgBody, normalizeTags } = require('../../import-icons.js')

const outlineSvg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="icon icon-tabler icons-tabler-outline icon-tabler-heart"
>
  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  <path d="M19.5 12.572l-7.5 7.428" />
  <path d="M12 3v1" fill="currentColor" />
</svg>
`

const filledSvg = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="currentColor"
  class="icon icon-tabler icons-tabler-filled icon-tabler-heart"
>
  <path stroke="none" d="M0 0h24v24H0z" fill="none" />
  <path d="M6.979 3.074z" />
</svg>
`

describe('parseSvgBody', () => {
	it('returns the inner markup of an outline icon without the background path', () => {
		expect(parseSvgBody('heart', 'outline', outlineSvg)).toBe(
			'<path d="M19.5 12.572l-7.5 7.428"/><path d="M12 3v1" fill="currentColor"/>',
		)
	})

	it('returns the inner markup of a filled icon', () => {
		expect(parseSvgBody('heart', 'filled', filledSvg)).toBe('<path d="M6.979 3.074z"/>')
	})

	it('rejects root attributes that differ from the expected template', () => {
		const changed = outlineSvg.replace('stroke-width="2"', 'stroke-width="1.5"')

		expect(() => parseSvgBody('heart', 'outline', changed)).toThrow(/unexpected <svg> attributes/)
	})

	it('rejects a filled icon checked against the outline template', () => {
		expect(() => parseSvgBody('heart', 'outline', filledSvg)).toThrow(/unexpected <svg> attributes/)
	})

	it('rejects markup that is not a single svg element', () => {
		expect(() => parseSvgBody('broken', 'outline', '<g></g>')).toThrow(/could not parse SVG/)
	})
})

describe('normalizeTags', () => {
	it('turns numbers into strings and drops empty values', () => {
		expect(normalizeTags(['error', 404, null, '', 0])).toEqual(['error', '404', '0'])
	})

	it('handles missing tags', () => {
		expect(normalizeTags(undefined)).toEqual([])
	})
})
