# Feature 2: Column Rendering — Implementation Plan

## Context

Feature 1 established the `BoardView` scaffold: a `BasesView` subclass that mounts a static `Board.svelte` placeholder. `onDataUpdated()` is a no-op. This feature wires up the grouped data from the Bases API and renders it as columns.

## Implementation order

1. `src/board-state.svelte.ts` (create)
2. `src/components/Column.svelte` (create)
3. `src/components/Board.svelte` (modify)
4. `src/board-view.ts` (modify)
5. `styles.css` (modify)

---

## Step 1: Create `src/board-state.svelte.ts`

Reactive state module bridging the plain-TS `BoardView` class and Svelte components.

```ts
export interface ColumnData {
    key: string;
    hasKey: boolean;
    entryCount: number;
}

export interface BoardState {
    columns: ColumnData[];
    hasGrouping: boolean;
}

let boardState = $state<BoardState>({ columns: [], hasGrouping: false });

export function getBoardState(): BoardState {
    return boardState;
}

export function setBoardState(state: BoardState): void {
    boardState = state;
}
```

- `ColumnData` — one column's display data, derived from `BasesEntryGroup`.
- `hasGrouping` — `false` when no group-by is configured (triggers the "no grouping" message).
- `getBoardState()` returns the reactive `$state` object — Svelte components reading it will re-render on changes.
- `setBoardState()` is called from `board-view.ts` (plain TS) to push new data.

---

## Step 2: Create `src/components/Column.svelte`

A single column with a header. Card rendering is deferred to Feature 3.

```svelte
<script lang="ts">
    import type { ColumnData } from "../board-state.svelte";

    let { column }: { column: ColumnData } = $props();
</script>

<div class="kanban-column">
    <div class="kanban-column-header">
        <span class="kanban-column-title">{column.key}</span>
        <span class="kanban-column-count">{column.entryCount}</span>
    </div>
    <div class="kanban-column-items">
        <!-- Card rendering in Feature 3 -->
    </div>
</div>
```

- Props via Svelte 5 `$props()` rune.
- `kanban-column-title` shows the group-by value.
- `kanban-column-count` shows how many entries are in the group (visible confirmation until cards land).
- `kanban-column-items` is the empty container where cards will be rendered later.

---

## Step 3: Modify `src/components/Board.svelte`

Replace static placeholder with reactive rendering.

```svelte
<script lang="ts">
    import { getBoardState } from "../board-state.svelte";
    import Column from "./Column.svelte";

    const state = $derived(getBoardState());
</script>

<div class="kanban-board">
    {#if !state.hasGrouping}
        <div class="kanban-board-empty">
            Group by a property to create columns
        </div>
    {:else if state.columns.length === 0}
        <div class="kanban-board-empty">
            No data
        </div>
    {:else}
        {#each state.columns as column (column.key)}
            <Column {column} />
        {/each}
    {/if}
</div>
```

Three states:
1. **No grouping configured** → "Group by a property to create columns"
2. **Grouping configured but no data** → "No data"
3. **Columns exist** → render `Column` for each group

The `(column.key)` keyed each block ensures Svelte can efficiently update when columns change.

---

## Step 4: Modify `src/board-view.ts`

Implement `onDataUpdated()` to transform API data and push it to the reactive state.

```ts
import { type QueryController, BasesView } from "obsidian";
import { mount, unmount } from "svelte";
import Board from "./components/Board.svelte";
import { setBoardState, type ColumnData } from "./board-state.svelte";

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
            void unmount(this.boardComponent);
            this.boardComponent = null;
        }
        this.containerEl.empty();
    }

    onDataUpdated(): void {
        const groups = this.data.groupedData;

        const noGrouping = groups.length === 1 && !groups[0].hasKey();

        if (noGrouping) {
            setBoardState({ columns: [], hasGrouping: false });
            return;
        }

        const columns: ColumnData[] = groups.map((group) => ({
            key: group.key?.toString() ?? "",
            hasKey: group.hasKey(),
            entryCount: group.entries.length,
        }));

        setBoardState({ columns, hasGrouping: true });
    }
}

export { VIEW_TYPE };
```

Key details:
- `noGrouping` detection: single group with `hasKey() === false` means no group-by is configured.
- Each `BasesEntryGroup` maps to a `ColumnData` with the key stringified via `Value.toString()`.
- Groups where `hasKey()` is `false` (entries missing the group-by property) are still included — Feature 4 will add "Uncategorized" labeling.

---

## Step 5: Modify `styles.css`

Add column styles below the existing board styles.

```css
.kanban-column {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: var(--kanban-column-width, 272px);
    background-color: var(--background-secondary);
    border-radius: var(--radius-m);
}

.kanban-column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-4-2) var(--size-4-3);
    font-size: var(--font-ui-small);
    font-weight: var(--font-semibold);
}

.kanban-column-title {
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.kanban-column-count {
    color: var(--text-muted);
    font-weight: var(--font-normal);
    margin-left: var(--size-4-2);
}

.kanban-column-items {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    padding: 0 var(--size-4-2) var(--size-4-2);
    overflow-y: auto;
    flex: 1;
}
```

- `--kanban-column-width` CSS variable with 272px default — configurable per design decision.
- `flex-shrink: 0` prevents columns from collapsing; horizontal scroll on `.kanban-board` handles overflow.
- All spacing/color via Obsidian CSS variables for theme compatibility.
- `.kanban-column-items` has `overflow-y: auto` for vertical scrolling when cards (Feature 3) exceed column height.

---

## Verification

1. `npm run build` — no type-check or bundle errors.
2. `npm run svelte-check` — no Svelte errors.
3. `npm run lint` — passes.
4. In Obsidian:
   - Open a Base with **no group-by** → board shows "Group by a property to create columns".
   - Configure **group-by** on a property (e.g., `status`) → columns appear with headers matching distinct values.
   - Each column header shows the group value and entry count.
   - Columns scroll horizontally when they exceed the board width.
   - Change the group-by property → columns update immediately.
   - Empty base (no matching entries) with group-by → empty board, no columns, "No data" message.
