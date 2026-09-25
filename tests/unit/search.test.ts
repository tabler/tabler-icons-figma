import { describe, expect, it } from 'vitest'

import { icons } from '../../src/icons.json'
import { filledIcons, searchIcons } from '../../src/use-search'

const names = (list: Array<{ name: string }>) => list.map((icon) => icon.name)

describe('filledIcons', () => {
	it('contains exactly the icons with a filled variant', () => {
		expect(filledIcons.length).toBeGreaterThan(0)
		expect(filledIcons.every((icon) => typeof icon.filled === 'string')).toBe(true)
		expect(filledIcons.length).toBe(icons.filter((icon) => 'filled' in icon).length)
	})
})

describe('searchIcons', () => {
	it('returns every outline icon for an empty query', () => {
		expect(searchIcons('', '', 'outline')).toHaveLength(icons.length)
	})

	it('returns only icons with a filled variant in filled mode', () => {
		const result = searchIcons('', '', 'filled')

		expect(result).toHaveLength(filledIcons.length)
		expect(result.every((icon) => icon.filled !== undefined)).toBe(true)
	})

	it('treats a whitespace-only query as empty', () => {
		expect(searchIcons('   ', '', 'outline')).toHaveLength(icons.length)
	})

	it('ranks an exact name match first and trims the query', () => {
		expect(searchIcons('  heart ', '', 'outline')[0].name).toBe('heart')
	})

	it('filters by category', () => {
		const result = searchIcons('', 'Arrows', 'outline')

		expect(result.length).toBeGreaterThan(0)
		expect(result.every((icon) => icon.category === 'Arrows')).toBe(true)
	})

	it('combines query, category and style', () => {
		const result = searchIcons('arrow', 'Arrows', 'filled')

		expect(result.length).toBeGreaterThan(0)
		expect(result.every((icon) => icon.category === 'Arrows' && icon.filled !== undefined)).toBe(true)
	})

	it('returns nothing for a category without filled icons in filled mode', () => {
		expect(searchIcons('', 'Zodiac', 'filled')).toEqual([])
		expect(searchIcons('', 'Zodiac', 'outline').length).toBeGreaterThan(0)
	})

	it('matches icons by tag', () => {
		const tagged = icons.find((icon) => icon.name === 'heart')!
		const tag = tagged.tags.find((t) => !tagged.name.includes(t) && t.length > 3)!

		expect(names(searchIcons(tag, '', 'outline'))).toContain('heart')
	})

	it('returns nothing for a query that matches no icon', () => {
		expect(searchIcons('zzzzqqqq', '', 'outline')).toEqual([])
	})
})
