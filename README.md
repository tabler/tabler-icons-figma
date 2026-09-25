# Tabler Icons for Figma

Figma and FigJam plugin that lets you search the [Tabler Icons](https://tabler.io/icons) set and insert any icon on the canvas as a vector.

Plugin page: https://www.figma.com/community/plugin/1169807996149376642

## How it works

- Search over icon names, tags and categories (fuzzy matching via Fuse.js).
- Filter by category and pick the stroke width (thin, light, normal).
- Click an icon to place it in the centre of the viewport as a flattened vector named `tabler-icon-<name>`.
- Optionally paste icons as outlined fills instead of strokes.

All SVG data is bundled into the plugin at build time, so the plugin needs no network access.

## Project layout

```
src/main.ts        plugin sandbox: receives SUBMIT events and creates nodes via the Figma API
src/ui.tsx         plugin UI (Preact + @create-figma-plugin/ui)
src/use-search.ts  Fuse.js search hook
src/ui.css         UI styles
src/svg.ts         rebuilds a full <svg> from an icon body and stroke width
src/icons.json     generated: version + name/category/tags/body for every outline icon
import-icons.js    generates src/icons.json from the @tabler/icons package
```

The plugin is built with [Create Figma Plugin](https://yuanqing.github.io/create-figma-plugin/). The manifest is generated from the `figma-plugin` section of `package.json`.

## Development

Requirements: Node.js 22+ and pnpm.

```
pnpm install
pnpm run build    # typecheck + minified build into build/, generates manifest.json
pnpm run watch    # rebuild on change
```

To load the plugin in Figma: open the desktop app, run `Import plugin from manifest…` from Quick Actions and pick the generated `manifest.json`.

## Updating icons

`src/icons.json` is generated from the `@tabler/icons` package and must be regenerated whenever that dependency changes. CI fails if the file is out of sync.

```
pnpm run icons
```

This upgrades `@tabler/icons` to the latest version, regenerates `src/icons.json`, builds the plugin, and commits and pushes the result as `update icons to vX.Y.Z`. To only regenerate the file without committing:

```
pnpm run icons:generate
```

Only the `outline` icon variant is imported. To keep the bundle small, `icons.json` stores only the markup inside each `<svg>`; the shared root attributes live in `src/svg.ts`. The import script fails if Tabler changes those root attributes, so the two stay in sync.

## Notes

- TypeScript must stay on 5.x: the typecheck step in `@create-figma-plugin/build` uses the compiler API, which TypeScript 7 does not expose.
- `pnpm-workspace.yaml` allows the `esbuild` postinstall script, which pnpm 10+ blocks by default.
