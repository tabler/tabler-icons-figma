import { expect, Page, test } from '@playwright/test'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { icons } from '../../src/icons.json'

// Run `pnpm run build` first: the tests load build/ui.js.
const harness = pathToFileURL(path.join(__dirname, 'harness.html')).href

const outlineCount = icons.length
const filledCount = icons.filter((icon) => 'filled' in icon).length

type SubmitMessage = ['SUBMIT', { name: string, svg: string, outlineStroke: boolean }]

async function sentMessages(page: Page): Promise<Array<SubmitMessage>> {
	return page.evaluate(() => (window as any).pluginMessages)
}

const search = (page: Page) => page.getByPlaceholder(/^Search \d+ icons$/)
const iconButtons = (page: Page) => page.locator('button.icon-button')
const styleOption = (page: Page, name: 'Outline' | 'Filled') => page.getByText(name, { exact: true })
const outlineCheckbox = (page: Page) => page.locator('input[type="checkbox"]')

// Dropdown menus stay in the DOM while closed, so open the dropdown first and
// then pick the option from its menu.
async function choose(page: Page, dropdown: 'category' | 'stroke', option: string) {
	await page.locator('[class*="_dropdown_"]').nth(dropdown === 'category' ? 0 : 1).click()
	await page.locator('[class*="_optionValue_"]').filter({ hasText: new RegExp(`^${option}$`) }).click()
}

test.beforeEach(async ({ page }) => {
	await page.goto(harness)
	await expect(iconButtons(page).first()).toBeVisible()
})

test('shows the first page of outline icons', async ({ page }) => {
	await expect(search(page)).toHaveAttribute('placeholder', `Search ${outlineCount} icons`)
	await expect(iconButtons(page)).toHaveCount(102)
	await expect(page.getByText(`and ${outlineCount - 102} more`)).toBeVisible()
})

test('header controls share the same height', async ({ page }) => {
	const searchBox = await search(page).boundingBox()
	const toggle = await page.locator('[class*="_segmentedControl_"]').boundingBox()
	expect(searchBox?.height).toBe(24)
	expect(toggle?.height).toBe(24)
	expect(searchBox?.y).toBe(toggle?.y)
})

test('search filters icons and Escape clears it', async ({ page }) => {
	await search(page).fill('heart')
	await expect(page.getByText('Icons matched "heart":')).toBeVisible()
	await expect(iconButtons(page).first()).toHaveAttribute('title', 'heart')

	await search(page).press('Escape')
	await expect(search(page)).toHaveValue('')
	await expect(page.getByText(/Icons matched/)).toHaveCount(0)
})

test('shows a message when nothing matches', async ({ page }) => {
	await search(page).fill('zzzzqqqq')
	await expect(iconButtons(page)).toHaveCount(0)
	await expect(page.getByText("Sorry, we don't have any icon to match your query.")).toBeVisible()
})

test('clicking an outline icon sends its SVG with the chosen stroke', async ({ page }) => {
	await search(page).fill('heart')
	await choose(page, 'stroke', 'Thin')
	await outlineCheckbox(page).click()
	await page.getByRole('button', { name: 'heart', exact: true }).click()

	const [event, data] = (await sentMessages(page)).at(-1)!
	expect(event).toBe('SUBMIT')
	expect(data.name).toBe('heart')
	expect(data.outlineStroke).toBe(true)
	expect(data.svg).toContain('stroke="currentColor"')
	expect(data.svg).toContain('stroke-width="1"')
})

test('filled mode lists only filled icons and sends filled SVGs', async ({ page }) => {
	await outlineCheckbox(page).click()
	await styleOption(page, 'Filled').click()

	await expect(search(page)).toHaveAttribute('placeholder', `Search ${filledCount} icons`)
	await expect(outlineCheckbox(page)).toBeDisabled()
	await expect(page.locator('[class*="_dropdown_"][class*="_disabled_"]')).toHaveCount(1)

	await search(page).fill('heart')
	await page.getByRole('button', { name: 'heart-filled', exact: true }).click()

	const [, data] = (await sentMessages(page)).at(-1)!
	expect(data.name).toBe('heart-filled')
	expect(data.outlineStroke).toBe(false)
	expect(data.svg).toContain('fill="currentColor"')
	expect(data.svg).not.toContain('stroke=')
})

test('switching to filled resets a category without filled icons', async ({ page }) => {
	await choose(page, 'category', 'Zodiac')
	await expect(page.getByText('Icons in category "Zodiac":')).toBeVisible()

	await styleOption(page, 'Filled').click()
	await expect(page.locator('[class*="_dropdown_"]').first()).toHaveText('All categories')
	await expect(page.getByText(/in category/)).toHaveCount(0)
})

test('switching styles keeps a category that has filled icons', async ({ page }) => {
	await choose(page, 'category', 'Arrows')
	await styleOption(page, 'Filled').click()
	await expect(page.getByText('Icons in category "Arrows":')).toBeVisible()
	await styleOption(page, 'Outline').click()
	await expect(page.getByText('Icons in category "Arrows":')).toBeVisible()
})
