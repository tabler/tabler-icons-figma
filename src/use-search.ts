import Fuse from 'fuse.js'
import { useState, useEffect } from 'preact/hooks'

type Icon = {
	name: string,
	tags: string[]
}

type Icons = Icon[]

const icons: Icons = [
	{
		name: "activity",
		tags: ["pulse", "health", "action", "motion"]
	},
	{
		name: "airplay",
		tags: ["stream", "cast", "mirroring"]
	},
	{
		name: "alert-circle",
		tags: ["warning", "alert", "danger"]
	},
	{
		name: "alert-octagon",
		tags: ["warning", "alert", "danger"]
	}
]

console.log('icons', Object.values(icons));

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
