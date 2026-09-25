// Root attributes shared by every Tabler outline icon. import-icons.js verifies
// this when generating icons.json and stores only the markup inside <svg>.
export function buildSvg(body: string, strokeWidth: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
}
