# Feature 5: Click to Open — Implementation Plan

## Overview

Four files change. A navigation callback is added to `CardContext`, created in `BoardView` using `app.workspace.openLinkText()`, consumed in `Card.svelte` via a `<button>` element. Modifier keys (Ctrl/Cmd) open in a new tab, matching standard Obsidian link behavior.

## Step 1: Add navigation callback to `CardContext`

**File:** `src/board-state.svelte.ts`

Add a `TFile` import and an `openFile` callback to the `CardContext` interface.

```typescript
import type { BasesEntry, BasesPropertyId, RenderContext, TFile } from "obsidian";

export interface CardContext {
	properties: BasesPropertyId[];
	displayNames: Map<BasesPropertyId, string>;
	renderContext: RenderContext;
	openFile: (file: TFile, newTab: boolean) => void;
}
```

**Why `openFile(file, newTab)` instead of `openFile(file, paneType)`:** The Card component only needs to express a binary intent — same leaf or new tab. Exposing `PaneType` to the UI layer leaks Obsidian API details into Svelte. The `BoardView` translates `newTab: true` → `"tab"` internally.

**Why not `MouseEvent` as the parameter:** Keeping the callback signature declarative (`file` + `newTab`) means the Card owns the event interpretation (which modifier keys matter), and the callback owns the navigation. Clean separation.

## Step 2: Create the callback in `BoardView`

**File:** `src/board-view.ts`

Add `TFile` to the import and create the `openFile` callback in `onDataUpdated()`.

```typescript
import { type QueryController, type BasesPropertyId, type TFile, BasesView } from "obsidian";
```

Inside `onDataUpdated()`, after building `displayNames`:

```typescript
const openFile = (file: TFile, newTab: boolean): void => {
    void this.app.workspace.openLinkText(
        file.path,
        "",
        newTab ? "tab" : false,
    );
};

const cardContext: CardContext = {
    properties: visibleProperties,
    displayNames,
    renderContext: this.app.renderContext,
    openFile,
};
```

**Notes:**
- `openLinkText` returns a `Promise<void>` — we `void` it since there's nothing to await or handle on failure.
- `sourcePath: ""` is correct because `file.path` is already a full vault-relative path.
- `false` for the third argument means "open in the current leaf" (Obsidian default).
- The arrow function captures `this.app` via closure — no need to store `app` separately.

## Step 3: Add click and keyboard handlers to Card

**File:** `src/components/Card.svelte`

Add `role="button"`, `tabindex="0"`, a click handler, and a keydown handler for Enter/Space. The element stays as a `<div>` — using `<button>` causes layout issues with nested card content (property values render incorrectly due to button default styles).

```svelte
<script lang="ts">
	import type { BasesEntry } from "obsidian";
	import type { CardContext } from "../board-state.svelte";

	let { entry, cardContext }: { entry: BasesEntry; cardContext: CardContext } = $props();

	function handleClick(event: MouseEvent) {
		cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
		}
	}

	function renderValue(node: HTMLElement, propertyId: string) {
		const value = entry.getValue(propertyId as any);
		if (value) {
			value.renderTo(node, cardContext.renderContext);
		}
	}
</script>

<div class="kanban-card" role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeydown}>
	<div class="kanban-card-title">{entry.file.basename}</div>
	{#if cardContext.properties.length > 0}
		<div class="kanban-card-properties">
			{#each cardContext.properties as propertyId}
				{@const value = entry.getValue(propertyId)}
				{#if value && value.isTruthy()}
					<div class="kanban-card-property">
						<span class="kanban-card-property-label">
							{cardContext.displayNames.get(propertyId) ?? ""}
						</span>
						<span class="kanban-card-property-value" use:renderValue={propertyId}>
						</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
```

**Accessibility via `role="button"` + `tabindex="0"`:**
- `tabindex="0"` makes the div keyboard focusable
- `role="button"` tells screen readers it's an interactive element
- Explicit `keydown` handler for Enter/Space (buttons get this for free, divs do not)
- `event.preventDefault()` on Space prevents page scroll

**Modifier key logic:**
- `event.metaKey` is Cmd on macOS, `event.ctrlKey` is Ctrl on Windows/Linux
- Checking both covers all platforms
- Matches standard Obsidian link behavior (Ctrl/Cmd+click → new tab)

## Step 4: Cursor style

**File:** `styles.css`

Add `cursor: pointer` to indicate clickability. No other style changes needed — the element remains a `<div>`.

```css
.kanban-card {
	cursor: pointer;
	background-color: var(--background-primary);
	border-radius: var(--radius-s);
	padding: var(--size-4-2) var(--size-4-3);
}
```

## Execution Order

Steps 1–4 can be implemented in a single pass since they are small, interdependent changes. The build must pass after all four are applied together — they are not independently valid (step 2 won't type-check without step 1, step 3 references the callback from step 1).

## Verification

1. `npm run build` — type-check + production build
2. `npm run lint` — ESLint
3. `npm run svelte-check` — Svelte type checking
4. Manual testing in Obsidian:
   - Click a card → opens the file in the current leaf
   - Ctrl/Cmd+click a card → opens in a new tab
   - Tab key navigates between cards
   - Enter/Space on a focused card opens the file
