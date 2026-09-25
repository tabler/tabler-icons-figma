// Root attributes shared by every Tabler icon of a given style. import-icons.js
// verifies them when generating icons.json and stores only the markup inside <svg>.

export type IconStyle = 'outline' | 'filled'

export function buildOutlineSvg(body: string, strokeWidth: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}

export function buildFilledSvg(body: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">${body}</svg>`
}
