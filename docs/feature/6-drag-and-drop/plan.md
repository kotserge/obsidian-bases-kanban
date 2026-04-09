# Feature 6: Drag and Drop Between Columns — Implementation Plan

## Overview

Seven files change (one new). Cards become draggable via the HTML Drag and Drop API. Columns act as drop targets. Dropping a card on a different column updates the group-by property in the file's frontmatter via `processFrontMatter`. Bases re-queries automatically, placing the card in its new column at the correct sorted position. Desktop only for v1.

## Step 1: Create drag state module

**File:** `src/drag-state.svelte.ts` (new)

A small reactive module to track the in-progress drag. Separate from board state because drag state is transient UI state, not Bases data.

```typescript
import type { TFile } from "obsidian";

interface DragState {
    file: TFile;
    sourceColumnKey: string;
}

let dragState = $state<DragState | null>(null);

export function getDragState(): DragState | null {
    return dragState;
}

export function setDragState(state: DragState | null): void {
    dragState = state;
}
```

**Why track `sourceColumnKey`:** To detect same-column drops (no-op) and to skip highlighting the source column as a drop target.

## Step 2: Add `moveCard` callback to `CardContext`

**File:** `src/board-state.svelte.ts`

Add `moveCard` to the `CardContext` interface.

```typescript
export interface CardContext {
    properties: BasesPropertyId[];
    displayNames: Map<BasesPropertyId, string>;
    renderContext: RenderContext;
    openFile: (file: TFile, newTab: boolean) => void;
    moveCard: (file: TFile, targetColumnKey: string, targetHasKey: boolean) => void;
}
```

**Why `targetHasKey`:** Distinguishes dropping onto a real column (set property) vs. Uncategorized (delete property). The column key string alone can't distinguish "Uncategorized" as a label from a column actually named "Uncategorized".

## Step 3: Create the `moveCard` callback in `BoardView`

**File:** `src/board-view.ts`

Add `parsePropertyId` to the import. Create the callback in `onDataUpdated()`.

```typescript
import { type QueryController, type BasesPropertyId, type TFile, BasesView, parsePropertyId } from "obsidian";
```

Inside `onDataUpdated()`, after the existing `openFile` callback:

```typescript
const moveCard = (file: TFile, targetColumnKey: string, targetHasKey: boolean): void => {
    const groupByPropId = this.config.getAsPropertyId("groupBy");
    if (!groupByPropId) return;
    const { type, name } = parsePropertyId(groupByPropId);
    if (type !== "note") return;
    void this.app.fileManager.processFrontMatter(file, (fm) => {
        if (targetHasKey) {
            fm[name] = targetColumnKey;
        } else {
            delete fm[name];
        }
    });
};
```

Add `moveCard` to the `cardContext` object:

```typescript
const cardContext: CardContext = {
    properties: visibleProperties,
    displayNames,
    renderContext: this.app.renderContext,
    openFile,
    moveCard,
};
```

**Notes:**
- `getAsPropertyId("groupBy")` is the best available API for resolving the group-by property. If it returns `null`, drag silently does nothing — safe degradation.
- `type !== "note"` guard: formula/file properties can't be written via `processFrontMatter`. Silently bail out.
- `void` the promise — `processFrontMatter` writes async, and `onDataUpdated()` will fire when Bases re-queries.
- Dropping on Uncategorized (`targetHasKey === false`) deletes the property from frontmatter.

## Step 4: Make cards draggable

**File:** `src/components/Card.svelte`

Add `draggable="true"` and `ondragstart`/`ondragend` handlers. Import and use the drag state module.

```svelte
<script lang="ts">
    import type { BasesEntry } from "obsidian";
    import type { CardContext } from "../board-state.svelte";
    import { setDragState } from "../drag-state.svelte";

    let { entry, cardContext, columnKey }: {
        entry: BasesEntry;
        cardContext: CardContext;
        columnKey: string;
    } = $props();

    let isDragging = $state(false);

    function handleClick(event: MouseEvent) {
        cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            cardContext.openFile(entry.file, event.ctrlKey || event.metaKey);
        }
    }

    function handleDragStart(event: DragEvent) {
        if (!event.dataTransfer) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", entry.file.path);
        isDragging = true;
        setDragState({ file: entry.file, sourceColumnKey: columnKey });
    }

    function handleDragEnd() {
        isDragging = false;
        setDragState(null);
    }

    function renderValue(node: HTMLElement, propertyId: string) {
        const value = entry.getValue(propertyId as any);
        if (value) {
            value.renderTo(node, cardContext.renderContext);
        }
    }
</script>

<div
    class="kanban-card"
    class:is-dragging={isDragging}
    role="button"
    tabindex="0"
    draggable="true"
    onclick={handleClick}
    onkeydown={handleKeydown}
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
>
    <!-- card content unchanged -->
</div>
```

**New prop `columnKey`:** The card needs to know which column it belongs to so it can set `sourceColumnKey` in the drag state. This is passed down from Column.

**`setData("text/plain", ...)`:** Required — DnD API needs at least one data type set or the drag won't start in some browsers. The file path is a reasonable payload.

**`effectAllowed = "move"`:** Signals that this is a move operation (not copy).

## Step 5: Pass `columnKey` from Column to Card

**File:** `src/components/Column.svelte`

Pass the column key to each Card.

```svelte
{#each column.entries as entry (entry.file.path)}
    <Card {entry} {cardContext} columnKey={column.key} />
{/each}
```

## Step 6: Add drop target handling to Column

**File:** `src/components/Column.svelte`

Add drag event handlers to the column element. Import drag state to check source column.

```svelte
<script lang="ts">
    import type { ColumnData, CardContext } from "../board-state.svelte";
    import { getDragState } from "../drag-state.svelte";
    import Card from "./Card.svelte";

    let { column, cardContext }: { column: ColumnData; cardContext: CardContext } = $props();

    let isDropTarget = $state(false);
    let dragOverCounter = 0;

    function handleDragOver(event: DragEvent) {
        const state = getDragState();
        if (!state || state.sourceColumnKey === column.key) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
    }

    function handleDragEnter(event: DragEvent) {
        const state = getDragState();
        if (!state || state.sourceColumnKey === column.key) return;
        event.preventDefault();
        dragOverCounter++;
        isDropTarget = true;
    }

    function handleDragLeave() {
        dragOverCounter--;
        if (dragOverCounter === 0) {
            isDropTarget = false;
        }
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragOverCounter = 0;
        isDropTarget = false;
        const state = getDragState();
        if (!state || state.sourceColumnKey === column.key) return;
        cardContext.moveCard(state.file, column.key, column.hasKey);
    }
</script>

<div
    class="kanban-column"
    class:is-drop-target={isDropTarget}
    ondragover={handleDragOver}
    ondragenter={handleDragEnter}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
>
    <div class="kanban-column-header">
        <span class="kanban-column-title">{column.key}</span>
        <span class="kanban-column-count">{column.entries.length}</span>
    </div>
    <div class="kanban-column-items">
        {#each column.entries as entry (entry.file.path)}
            <Card {entry} {cardContext} columnKey={column.key} />
        {/each}
    </div>
</div>
```

**`dragOverCounter` pattern:** `dragenter`/`dragleave` fire on every child element. A counter ensures we only clear the highlight when the pointer truly leaves the column, not when it moves between children.

**Same-column guard:** `state.sourceColumnKey === column.key` skips `preventDefault()` in `dragover`, which tells the browser this is not a valid drop target — the cursor shows "not allowed".

## Step 7: Add drag-and-drop styles

**File:** `styles.css`

```css
.kanban-card.is-dragging {
    opacity: 0.5;
}

.kanban-column.is-drop-target {
    background-color: var(--background-modifier-hover);
}
```

## Execution Order

Steps 1–7 form a single cohesive change — they are not independently valid. The build will only pass with all steps applied together. Recommended implementation order matches the step numbers (bottom-up: state → callback → UI → styles).

## Verification

1. `npm run build` — type-check + production build
2. `npm run lint` — ESLint
3. `npm run svelte-check` — Svelte type checking
4. Manual testing in Obsidian:
   - Drag a card from one column to another → card moves, frontmatter updated
   - Drag a card to the same column → no-op, no frontmatter change
   - Drag from Uncategorized to a column → property set in frontmatter
   - Drag from a column to Uncategorized → property removed from frontmatter
   - Click a card (no drag) → still opens the file
   - Ctrl/Cmd+click → still opens in new tab
   - Column highlights on drag-over, clears on drag-leave
   - Source column does not highlight
   - Card shows reduced opacity while being dragged
