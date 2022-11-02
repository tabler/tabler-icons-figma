import {
	Button,
	Columns,
	Container,
	Divider,
	Bold,
	render,
	Text,
	Muted,
	TextboxNumeric,
	VerticalSpace,
	SearchTextbox,
} from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h, JSX } from 'preact'
import { useCallback, useState } from 'preact/hooks'

import { CloseHandler, CreateRectanglesHandler } from './types'

const version = '1.109.0'

function Plugin() {
	const [count, setCount] = useState<number | null>(5)
	const [countString, setCountString] = useState('5')

	const handleCreateRectanglesButtonClick = useCallback(
		function () {
			if (count !== null) {
				emit<CreateRectanglesHandler>('CREATE_RECTANGLES', count)
			}
		},
		[count]
	)
	const handleCloseButtonClick = useCallback(function () {
		emit<CloseHandler>('CLOSE')
	}, [])

	const [value, setValue] = useState<string>('')

	function handleInput(event: JSX.TargetedEvent<HTMLInputElement>) {
		const newValue = event.currentTarget.value
		console.log(newValue)
		setValue(newValue)
	}

	return (
		<div>
			<div
				style={{
					position: 'sticky',
					top: 0,
					background: 'var(--figma-color-bg)'
				}}
			>
				<SearchTextbox
					onInput={handleInput}
					placeholder="Search 2900 icons"
					value={value}
				/>
				<Divider />
			</div>
			<Container space="small">
				<VerticalSpace space="small" />
				{ value && (
					<div>
						<Text>
							<Bold>Search results for &quot;{ value }&quot;:</Bold>
						</Text>
						<VerticalSpace space="small" />
					</div>
				)}
			</Container>
			<Container space="small">
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(6, 1fr)',
						gridGap: 'var(--space-extra-small)',
					}}
				>
					{[...Array(1000)].map((x, i) =>
						<div style={{ background: '#fafafa', textAlign: 'center' }}>{i}</div>
					)}
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
