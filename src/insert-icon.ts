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

	if (data.outlineStroke && icon.children.some(hasVisibleFill)) {
		outlineWithFilledParts(icon)
		return icon
	}

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

// Some outline icons also have filled parts (the quarter in percentage-25, the
// top layer in stack-forward). outlineStroke() on the flattened icon covers only
// the strokes, so those parts were lost. Merging them back with flatten or a
// boolean union changes their shape (holes where shapes overlap, open subpaths
// dropped), so the filled parts stay as separate fill-only vectors next to the
// outlined strokes. The result looks the same as the SVG.
function outlineWithFilledParts(icon: FrameNode) {
	const children = icon.children.filter((child): child is VectorNode => child.type === 'VECTOR')
	const stroked = children.filter(hasVisibleStroke)

	for (const child of children.filter(hasVisibleFill)) {
		const fillOnly = hasVisibleStroke(child) ? child.clone() : child
		fillOnly.strokes = []
		icon.appendChild(fillOnly)
	}

	for (const child of children) {
		if (!stroked.includes(child) && !hasVisibleFill(child)) {
			child.remove()
		}
	}

	if (stroked.length > 0) {
		const flattened = figma.flatten(stroked, icon)
		const outlined = flattened.outlineStroke()

		if (outlined) {
			flattened.remove()
			icon.insertChild(0, outlined)
		}
	}
}

function hasVisibleFill(node: SceneNode): boolean {
	return 'fills' in node && node.fills !== figma.mixed && node.fills.some((paint) => paint.visible !== false)
}

function hasVisibleStroke(node: SceneNode): boolean {
	return 'strokes' in node && node.strokes.some((paint) => paint.visible !== false)
}
