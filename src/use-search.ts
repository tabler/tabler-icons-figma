import Fuse from 'fuse.js'
import { useMemo } from 'preact/hooks'

import { icons } from './icons.json'
import { IconStyle } from './svg'

// The icon list is static, so the search index is built once when the module loads.
const fuse = new Fuse(icons, {
	threshold: 0.2,
	keys: ['name', 'tags', 'category']
})

export const filledIcons = icons.filter((icon) => icon.filled !== undefined)

function useSearch(query: string, category: string, style: IconStyle) {
	return useMemo(() => {
		const q = query.trim()
		const matches = q
			? fuse.search(q).map(result => result.item)
			: style === 'filled' ? filledIcons : icons

		return matches.filter(icon =>
			(style === 'outline' || icon.filled !== undefined) &&
			(category === '' || icon.category === category)
		)
	}, [query, category, style])
}

export default useSearch
