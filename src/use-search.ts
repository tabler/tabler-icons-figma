import Fuse from 'fuse.js'
import { useState, useEffect } from 'preact/hooks'

import { icons } from './icons.json'

function useSearch(query: string) {
	const values = Object.values(icons)
	const [results, setResults] = useState(values)

	const filterResult = new Fuse(values, {
		threshold: 0.2,
		keys: ['name', 'tags']
	})

	useEffect(() => {
		if (query.trim()) {
			setResults(filterResult.search(query.trim()).map(result => result.item))
		} else {
			setResults(values)
		}
	}, [query])

	return results
}

export default useSearch
