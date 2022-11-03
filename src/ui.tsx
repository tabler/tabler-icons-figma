import '!./ui.css'

import {
	Container,
	Divider,
	Bold,
	render,
	Text,
	Muted,
	VerticalSpace,
	SearchTextbox,
} from '@create-figma-plugin/ui'
import {
	emit,
} from '@create-figma-plugin/utilities'

import { h, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { version, icons } from './icons.json'
import useSearch from './use-search'

type Icon = {
	name: string,
	svg: string,
	category: string,
	tags: string[]
}

function IconButton({
	icon
}: {
	icon: Icon
}) {
	const handleClick = (name: string, svg: string) => {
		emit('SUBMIT', {
			name,
			svg
		})
	}

	return (
		<button
			key={icon.name}
			aria-label={icon.name}
			onClick={() => handleClick(icon.name, icon.svg)}
			class="icon-button"
			dangerouslySetInnerHTML={{__html: icon.svg}}
		>
		</button>
	)
}

function Plugin() {
	const [value, setValue] = useState<string>('')

	function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
		setValue(event.currentTarget.value)
	}

	const results = useSearch(value)

	return (
		<div>
			<div class="search">
				<SearchTextbox
					onInput={handleInput}
					placeholder={`Search ${icons.length} icons`}
					value={value}
				/>
				<Divider />
			</div>
			<Container space="small">
				<VerticalSpace space="small" />
				{value && (
					<div>
						<Text>
							<Bold>Search results for &quot;{value}&quot;:</Bold>
						</Text>
						<VerticalSpace space="small" />
					</div>
				)}
			</Container>
			<Container space="small">
				<div class="grid">
					{results.map(icon => (
						<IconButton icon={icon} />
					))}
				</div>
				<VerticalSpace space="medium" />
				<Text>
					<Muted>Tabler Icons v{version}</Muted>
				</Text>
				<VerticalSpace space="medium" />
			</Container>
		</div>
	)
}

export default render(Plugin)
