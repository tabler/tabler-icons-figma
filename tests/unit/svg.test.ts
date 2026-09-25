import { describe, expect, it } from 'vitest'

import { buildFilledSvg, buildOutlineSvg } from '../../src/svg'

describe('buildOutlineSvg', () => {
	it('wraps the body in Tabler outline root attributes with the given stroke width', () => {
		const svg = buildOutlineSvg('<path d="M1 1"/>', '1.5')

		expect(svg).toBe(
			'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1"/></svg>',
		)
	})
})

describe('buildFilledSvg', () => {
	it('wraps the body in Tabler filled root attributes without any stroke', () => {
		const svg = buildFilledSvg('<path d="M1 1"/>')

		expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1"/></svg>')
		expect(svg).not.toContain('stroke')
	})
})
