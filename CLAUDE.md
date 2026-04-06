# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An Obsidian community plugin that provides kanban board views. Cards are markdown files; boards are collections of files filtered by a `board-key` frontmatter property; lists (columns) are defined by a `list-key` frontmatter property. See `docs/overview.md` for the full design spec.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Watch mode development build (esbuild)
npm run build            # Type-check (tsc) + production build (minified)
npm run lint             # ESLint
npm run svelte-check     # Type-check Svelte components
npm run version          # Bump manifest.json and versions.json
```

No test framework is configured. Manual testing: copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/obsidian-kanban/`, reload Obsidian, enable in Settings → Community plugins.

## Build System

- **Bundler:** esbuild with `esbuild-svelte` plugin (`esbuild.config.mjs`)
- **Entry:** `src/main.ts` → `main.js` (CJS, ES2018 target)
- **UI framework:** Svelte 5 with TypeScript via `svelte-preprocess`
- **Linting:** ESLint flat config (`eslint.config.mts`) with `eslint-plugin-obsidianmd`
- **Formatting:** EditorConfig (tabs, 4-space width, LF, UTF-8)

## Architecture

The plugin class `ObsidianKanban` extends `Plugin` in `src/main.ts`. Keep this file minimal — lifecycle only (`onload`/`onunload`, command registration). Delegate feature logic to separate modules.

**Planned view hierarchy:**
```
BoardView (ItemView)
├── toolbar (filter by project, add column)
└── board-container
    ├── Column → Card[]
    └── ...
```

**Data model:**
- Markdown frontmatter is source of truth (`board-key`, `list-key`, `tags-key`)
- Plugin data stores per-board column ordering: `{ columnOrder: Record<string, string[]> }`
- Board settings map property names: `{ boardProperty: string, listProperty: string }`

## Key Conventions

- TypeScript strict mode enabled
- `isDesktopOnly: false` — must work on mobile; avoid Node/Electron-only APIs
- Split files at ~200-300 lines; single responsibility per module
- Use `this.register*` helpers for all listeners/intervals (cleanup on unload)
- Stable command IDs — never rename after release
- No network calls without explicit user-facing reason and documentation
- Release artifacts at repo root: `main.js`, `manifest.json`, `styles.css`

## CI

GitHub Actions (`.github/workflows/lint.yml`): runs `npm ci`, `npm run build`, `npm run lint` on Node 20.x and 22.x for pushes and PRs.
