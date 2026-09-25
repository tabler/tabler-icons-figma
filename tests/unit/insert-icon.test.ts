import { beforeEach, describe, expect, it, vi } from 'vitest'

import { insertIcon } from '../../src/insert-icon'

// A small stand-in for the parts of the Figma Plugin API that insertIcon uses.
// It tracks the node tree and which paints each node carries, which is enough
// to check how insertIcon combines paths. Real geometry is covered by the Figma
// tests in scripts/figma-tests.mjs.

type FakePaint = { type: 'SOLID', color: { r: number, g: number, b: number }, visible?: boolean }

const BLACK: FakePaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }
const HIDDEN: FakePaint = { ...BLACK, visible: false }

class FakeFrame {
	readonly type = 'FRAME'
	name = ''
	x = 0
	y = 0
	children: Array<FakeVector> = []

	appendChild(node: FakeVector) {
		this.insertChild(this.children.length, node)
	}

	insertChild(index: number, node: FakeVector) {
		node.parent?.detach(node)
		node.parent = this
		this.children.splice(index, 0, node)
	}

	detach(node: FakeVector) {
		this.children = this.children.filter((child) => child !== node)
	}
}

class FakeVector {
	readonly type = 'VECTOR'
	parent: FakeFrame | null = null
	removed = false

	constructor(public label: string, public fills: Array<FakePaint> = [], public strokes: Array<FakePaint> = []) {}

	remove() {
		this.parent?.detach(this)
		this.parent = null
		this.removed = true
	}

	clone() {
		const copy = new FakeVector(`${this.label} copy`, [...this.fills], [...this.strokes])
		this.parent?.appendChild(copy)
		return copy
	}

	outlineStroke() {
		if (!this.strokes.some((paint) => paint.visible !== false)) {
			return null
		}
		const outline = new FakeVector(`outline(${this.label})`, [BLACK], [])
		this.parent?.appendChild(outline)
		return outline
	}
}

const stroked = (label: string) => new FakeVector(label, [], [BLACK])
const filled = (label: string) => new FakeVector(label, [BLACK], [])
const filledAndStroked = (label: string) => new FakeVector(label, [BLACK], [BLACK])

let svgChildren: Array<FakeVector>

const figmaMock = {
	mixed: Symbol('mixed'),
	createNodeFromSvg: vi.fn((_svg: string) => {
		const frame = new FakeFrame()
		for (const child of svgChildren) frame.appendChild(child)
		return frame
	}),
	flatten: vi.fn((nodes: Array<FakeVector>, parent: FakeFrame) => {
		const merged = new FakeVector(
			`flat(${nodes.map((n) => n.label).join(',')})`,
			nodes.flatMap((n) => n.fills),
			// Flattened paths share one stroke style, taken from the first stroked path.
			nodes.flatMap((n) => n.strokes).slice(0, 1),
		)
		for (const node of [...nodes]) node.remove()
		parent.appendChild(merged)
		return merged
	}),
}

const labels = (frame: FakeFrame) => frame.children.map((child) => child.label)
const insert = (outlineStroke: boolean) =>
	insertIcon({ name: 'test', svg: '<svg/>', outlineStroke }, { x: 10.4, y: -3.6 }) as unknown as FakeFrame

beforeEach(() => {
	vi.stubGlobal('figma', figmaMock)
	figmaMock.createNodeFromSvg.mockClear()
	figmaMock.flatten.mockClear()
})

describe('insertIcon', () => {
	it('names the frame after the icon and rounds its position', () => {
		svgChildren = [stroked('a')]
		const frame = insert(false)

		expect(figmaMock.createNodeFromSvg).toHaveBeenCalledWith('<svg/>')
		expect(frame.name).toBe('tabler-icon-test')
		expect(frame.x).toBe(10)
		expect(frame.y).toBe(-4)
	})

	it('flattens all paths into one vector and keeps its strokes', () => {
		svgChildren = [stroked('a'), stroked('b'), filledAndStroked('dot')]
		const frame = insert(false)

		expect(labels(frame)).toEqual(['flat(a,b,dot)'])
		expect(frame.children[0].strokes).toHaveLength(1)
	})

	it('replaces the strokes with an outline when pasting as outline', () => {
		svgChildren = [stroked('a'), stroked('b')]
		const frame = insert(true)

		expect(labels(frame)).toEqual(['outline(flat(a,b))'])
		expect(frame.children[0].strokes).toEqual([])
	})

	it('keeps the flattened vector when there is no stroke to outline', () => {
		svgChildren = [new FakeVector('invisible', [], [HIDDEN])]
		const frame = insert(true)

		expect(labels(frame)).toEqual(['flat(invisible)'])
	})

	describe('pasting an icon with filled parts as outline', () => {
		it('outlines the stroked paths and keeps each filled path as a fill-only vector', () => {
			const fill = filled('quarter')
			svgChildren = [stroked('circle'), fill, filledAndStroked('dot')]
			const frame = insert(true)

			expect(labels(frame)).toEqual(['outline(flat(circle,dot))', 'quarter', 'dot copy'])
			expect(frame.children[1]).toBe(fill)
			expect(frame.children.every((child) => child.strokes.length === 0)).toBe(true)
			expect(frame.children.every((child) => child.fills.length > 0)).toBe(true)
		})

		it('never flattens filled paths together with strokes', () => {
			svgChildren = [stroked('circle'), filled('quarter')]
			insert(true)

			expect(figmaMock.flatten).toHaveBeenCalledTimes(1)
			expect(figmaMock.flatten.mock.calls[0][0].map((n: FakeVector) => n.label)).toEqual(['circle'])
		})

		it('does not flatten anything when no path is stroked', () => {
			svgChildren = [filled('a'), filled('b')]
			const frame = insert(true)

			expect(figmaMock.flatten).not.toHaveBeenCalled()
			expect(labels(frame)).toEqual(['a', 'b'])
		})

		it('ignores hidden fills when deciding whether an icon has filled parts', () => {
			svgChildren = [stroked('a'), new FakeVector('ghost', [HIDDEN], [])]
			const frame = insert(true)

			expect(labels(frame)).toEqual(['outline(flat(a,ghost))'])
		})
	})
})
