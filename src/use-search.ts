import Fuse from 'fuse.js'
import { useMemo } from 'preact/hooks'

import { icons } from './icons.json'

// The icon list is static, so the search index is built once when the module loads.
const fuse = new Fuse(icons, {
	threshold: 0.2,
	keys: ['name', 'tags', 'category']
})

function useSearch(query: string, category: string) {
	return useMemo(() => {
		const q = query.trim()
		const matches = q ? fuse.search(q).map(result => result.item) : icons

		return category === '' ? matches : matches.filter(icon => icon.category === category)
	}, [query, category])
}

export default useSearch
