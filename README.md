# Tabler Icons for Figma

Figma and FigJam plugin that lets you search the [Tabler Icons](https://tabler.io/icons) set and insert any icon on the canvas as a vector.

Plugin page: https://www.figma.com/community/plugin/1169807996149376642

## How it works

- Search over icon names, tags and categories (fuzzy matching via Fuse.js).
- Switch between outline and filled icons. Filled mode shows only the icons that have a filled variant.
- Filter by category and pick the stroke width (thin, light, normal) for outline icons.
- Click an icon to place it in the centre of the viewport as a flattened vector named `tabler-icon-<name>`, or `tabler-icon-<name>-filled` for filled icons.
- Optionally paste outline icons as outlined fills instead of strokes.

All SVG data is bundled into the plugin at build time, so the plugin needs no network access.

## Project layout

```
src/main.ts        plugin sandbox: receives SUBMIT events and creates nodes via the Figma API
src/ui.tsx         plugin UI (Preact + @create-figma-plugin/ui)
src/use-search.ts  Fuse.js search hook
src/ui.css         UI styles
src/svg.ts         rebuilds a full <svg> from an icon body (outline with stroke width, or filled)
src/icons.json     generated: version + name/category/tags/body, plus filled body where available
import-icons.js    generates src/icons.json from the @tabler/icons package
```

The plugin is built with [Create Figma Plugin](https://yuanqing.github.io/create-figma-plugin/). The manifest is generated from the `figma-plugin` section of `package.json`.

## Development

Requirements: Node.js 22+ and pnpm.

```
pnpm install
pnpm run build    # typecheck + minified build into build/, generates manifest.json
pnpm run watch    # rebuild on change
pnpm run test:unit   # unit tests (Vitest)
```

Unit tests in `tests/unit/` cover the SVG builders, icon search, SVG parsing in `import-icons.js`, and how `insertIcon` combines paths, using a small stand-in for the Figma API.

To load the plugin in Figma: open the desktop app, run `Import plugin from manifest…` from Quick Actions and pick the generated `manifest.json`.

## UI tests

The plugin UI is tested in a browser with Playwright. `tests/ui/harness.html` loads the built `build/ui.js` at the plugin window size, stubs the Figma theme colours and records the messages the UI sends to the plugin sandbox.

```
pnpm run build
pnpm exec playwright install chromium   # first run only
pnpm run test:ui
```

CI runs these tests on every push and pull request.

## Testing icon insertion in Figma

`src/insert-icon.ts` holds the code that turns an SVG into a Figma node. It can be run against a real Figma file through the [Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559) (`upload_assets` and `use_figma` tools), for example from Claude Code.

The `use_figma` sandbox has no network access and limits each script to 50,000 characters, so the test code and all icon data are packed into a PNG:

```
pnpm run test:figma
```

This writes two files to `.figma-tests/`:

- `payload.png` contains the transpiled `src/insert-icon.ts` and `src/svg.ts`, the icon data and the test runner, in a private PNG chunk.
- `loader.js` is a short script that finds the newest payload image on the current page, reads it and runs the tests.

To run the tests:

1. Upload `payload.png` to a test file with `upload_assets`.
2. Edit `OPTIONS` at the top of `loader.js` and run it with `use_figma`.

| `OPTIONS` | What it does |
|---|---|
| `{ mode: 'smoke', set: 'special' }` | Outline icons with extra path attributes such as filled dots or opacity |
| `{ mode: 'smoke', set: 'filled', start, count }` | Filled icons |
| `{ mode: 'smoke', set: 'outline', start, count }` | All outline icons, as strokes and pasted as outline |
| `{ mode: 'smoke', set: 'outline', names: [...] }` | Only the named icons |
| `{ mode: 'visual', names: [...] }` | A grid of icons in every variant, next to the SVG imported without flattening |

Smoke tests create each icon off-canvas, check it and remove it. They return the issues found and a count of result shapes. About 1,300 outline icons fit in one call of roughly 30 seconds. The payload records the commit and source hashes it was built from.

## Updating icons

`src/icons.json` is generated from the `@tabler/icons` package and must be regenerated whenever that dependency changes. CI fails if the file is out of sync.

```
pnpm run icons
```

This runs `scripts/update-icons.mjs`. If a newer `@tabler/icons` release exists, it:

1. creates a branch `update-icons-vX.Y.Z` (the working tree must be clean),
2. installs the new version and regenerates `src/icons.json`,
3. builds the plugin and runs the unit and UI tests,
4. prints how many outline and filled icons were added or removed,
5. commits the result as `update icons to vX.Y.Z`, pushes the branch and opens a pull request with that summary.

If the icons are already up to date, it does nothing.

| Option | Effect |
|---|---|
| `--check` | Only report whether an update is available |
| `--no-pr` | Stop after committing on the new branch |
| `--skip-tests` | Skip the unit and UI tests |
| `--version X.Y.Z` | Use a specific version instead of the latest, pinned exactly |

Options go after `--`, for example `pnpm run icons -- --check`.

To only regenerate the file without committing:

```
pnpm run icons:generate
```

Both the `outline` and `filled` variants are imported; `filled` is present only for icons that have one. To keep the bundle small, `icons.json` stores only the markup inside each `<svg>`; the shared root attributes for each style live in `src/svg.ts`. The import script fails if Tabler changes those root attributes, so the two stay in sync.

## Notes

- TypeScript must stay on 5.x: the typecheck step in `@create-figma-plugin/build` uses the compiler API, which TypeScript 7 does not expose.
- `pnpm-workspace.yaml` allows the `esbuild` postinstall script, which pnpm 10+ blocks by default.
