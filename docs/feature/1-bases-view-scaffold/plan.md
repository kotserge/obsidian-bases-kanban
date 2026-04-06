# Feature 1: BasesView Scaffold — Implementation Plan

## Context

The plugin currently has a bare `ObsidianKanban` class with empty lifecycle methods and a fully configured build system (esbuild + Svelte 5 + TypeScript). Nothing renders yet. This feature registers a custom Bases view that shows an empty board container, establishing the foundation for columns, cards, and drag-and-drop in later features.

## Implementation order

1. `manifest.json` (modify)
2. `src/components/Board.svelte` (create)
3. `src/board-view.ts` (create)
4. `src/main.ts` (modify)
5. `styles.css` (modify)

---

## Step 1: Bump `manifest.json`

Change `minAppVersion` from `"0.15.0"` to `"1.10.0"`. Required because `BasesView` and `registerBasesView` were introduced in 1.10.0.

---

## Step 2: Create `src/components/Board.svelte`

A minimal Svelte 5 component — pure markup, no script block needed yet.

```svelte
<div class="kanban-board">
	<div class="kanban-board-empty">
		No data
	</div>
</div>
```

- `kanban-board` is the top-level flex container that will hold columns later.
- `kanban-board-empty` is a placeholder shown until data rendering is implemented.
- CSS lives in `styles.css` (not component-scoped) to integrate with Obsidian theming.

---

## Step 3: Create `src/board-view.ts`

The `BoardView` class extends `BasesView` and mounts the Svelte component.

```ts
import { type QueryController, BasesView } from "obsidian";
import { mount, unmount } from "svelte";
import Board from "./components/Board.svelte";

const VIEW_TYPE = "dev.kotchourko.obsidian.kanban";

export class BoardView extends BasesView {
	type = VIEW_TYPE;

	private containerEl: HTMLElement;
	private boardComponent: Record<string, unknown> | null = null;

	constructor(controller: QueryController, containerEl: HTMLElement) {
		super(controller);
		this.containerEl = containerEl;
	}

	override onload(): void {
		this.boardComponent = mount(Board, { target: this.containerEl });
	}

	override onunload(): void {
		if (this.boardComponent) {
			unmount(this.boardComponent);
			this.boardComponent = null;
		}
		this.containerEl.empty();
	}

	onDataUpdated(): void {
		// Stub — will render columns/cards in later features.
	}
}

export { VIEW_TYPE };
```

Key details:
- `VIEW_TYPE` is a named export so `main.ts` can reference the same constant.
- `import { type QueryController, ... }` — `type` keyword satisfies `verbatimModuleSyntax` since `QueryController` is only used as a type.
- `mount()` returns an opaque object; `Record<string, unknown>` is a safe type until exports are needed.
- `containerEl.empty()` uses Obsidian's `HTMLElement` extension as a safety net after `unmount()`.
- `onDataUpdated()` is a no-op stub satisfying the abstract method.

---

## Step 4: Modify `src/main.ts`

Register the view in `onload()`. Warn if Bases isn't enabled.

```ts
import { Plugin } from "obsidian";
import { BoardView, VIEW_TYPE } from "./board-view";

export default class ObsidianKanban extends Plugin {
	async onload() {
		const registered = this.registerBasesView(VIEW_TYPE, {
			name: "Kanban",
			icon: "square-kanban",
			factory: (controller, containerEl) => {
				return new BoardView(controller, containerEl);
			},
		});

		if (!registered) {
			console.warn("obsidian-kanban: failed to register Bases view");
		}
	}

	onunload() {}
}
```

- `main.ts` stays minimal — lifecycle only, no business logic.
- No manual cleanup needed in `onunload()`: `registerBasesView` is managed by the Plugin lifecycle; individual `BoardView` instances clean up via their own `onunload()`.

---

## Step 5: Modify `styles.css`

Replace the placeholder with minimal board container styles.

```css
.kanban-board {
	display: flex;
	flex-direction: row;
	gap: var(--size-4-2);
	height: 100%;
	overflow-x: auto;
	padding: var(--size-4-2);
}

.kanban-board-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	color: var(--text-muted);
	font-size: var(--font-ui-medium);
}
```

- Uses Obsidian CSS variables (`--size-4-2`, `--text-muted`, `--font-ui-medium`) for theme compatibility.
- `overflow-x: auto` enables horizontal scrolling for future columns.
- `height: 100%` fills the Bases container.

---

## Verification

1. `npm run build` — no type-check or bundle errors.
2. `npm run svelte-check` — no Svelte errors.
3. `npm run lint` — passes.
4. In Obsidian (1.10.0+):
   - Enable the plugin.
   - Open/create a Bases file.
   - Click the view switcher in the Bases toolbar — "Kanban" appears with the `square-kanban` icon.
   - Select it — "No data" appears centered in muted text below the toolbar.
   - Bases toolbar controls (filter, group, sort, properties) remain functional.
   - Dev console shows no errors.
   - Disable/re-enable the plugin — no leaked DOM or listeners.
