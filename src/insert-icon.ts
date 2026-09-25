// Logic for turning an icon SVG into a Figma node. Kept free of UI and viewport
// concerns so the exact same code can be exercised against a real Figma file
// (see scripts/figma-tests.mjs).

export type InsertIconData = {
	name: string
	svg: string
	outlineStroke: boolean
}

export function insertIcon(data: InsertIconData, position: { x: number, y: number }): FrameNode {
	const icon = figma.createNodeFromSvg(data.svg)

	icon.name = `tabler-icon-${data.name}`
	icon.x = Math.round(position.x)
	icon.y = Math.round(position.y)

	const flattened = figma.flatten(icon.children, icon)

	if (data.outlineStroke) {
		const stroke = flattened.outlineStroke()

		if (stroke) {
			flattened.remove()
			icon.appendChild(stroke)
		}
	}

	return icon
}
