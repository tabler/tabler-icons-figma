import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: 'tests/ui',
	timeout: 10_000,
	forbidOnly: !!process.env.CI,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		...devices['Desktop Chrome'],
		// Size of the plugin window set in src/main.ts.
		viewport: { width: 300, height: 400 },
	},
})
