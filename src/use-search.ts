import Fuse from 'fuse.js'
import { useState, useEffect } from 'preact/hooks'

import { icons } from './icons.json'

function useSearch(query: string, category: string) {
	const values = Object.values(icons)
	const [results, setResults] = useState(values)

	const filterResult = new Fuse(values, {
		threshold: 0.2,
		keys: ['name', 'tags', 'category']
	})

	useEffect(() => {
		if (query.trim()) {
			setResults(filterResult.search(query.trim()).map(result => result.item).filter(icon => category === '' || icon.category == category))
		} else {
			setResults(values.filter(icon => category === '' || icon.category == category))
		}
	}, [query, category])

	return results
}

export default useSearch
