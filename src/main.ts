import { on, showUI } from '@create-figma-plugin/utilities'

export default function () {
	showUI({
		width: 300,
		height: 400
	})

	function handleSubmit(data: { name: string, svg: string }) {
		const icon = figma.createNodeFromSvg(data.svg)

		icon.name = `tabler-icon-${data.name}`
		icon.x = Math.round(figma.viewport.center.x)
		icon.y = Math.round(figma.viewport.center.y)

		figma.currentPage.selection = [icon]
	}

	on('SUBMIT', handleSubmit)
}
