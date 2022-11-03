import { on, showUI } from '@create-figma-plugin/utilities'

export default function () {
	showUI({
		width: 300,
		height: 400
	})

	function handleSubmit(data: { name: string, svg: string }) {
		console.log(data)

		const icon = figma.createNodeFromSvg(data.svg)

		icon.name = `tabler-icon-${data.name}`
		icon.x = figma.viewport.center.x
		icon.y = figma.viewport.center.y

		figma.currentPage.selection = [icon]
	}

	on('SUBMIT', handleSubmit)
}
