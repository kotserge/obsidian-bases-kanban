# Feature 3: Card Rendering — Implementation Plan

## Context

Feature 2 established column rendering but discards the actual entries — only `entryCount` is passed through. This feature renders cards inside columns, displaying the file title and user-configured properties using Obsidian's native `Value.renderTo()`.

## Implementation order

1. `src/board-state.svelte.ts` (modify)
2. `src/board-view.ts` (modify)
3. `src/components/Card.svelte` (create)
4. `src/components/Column.svelte` (modify)
5. `src/components/Board.svelte` (modify)
6. `styles.css` (modify)

---

## Step 1: Modify `src/board-state.svelte.ts`

Add card context types, extend `ColumnData` with entries, switch to `$state.raw()`.

```ts
import type { BasesEntry, BasesPropertyId, RenderContext } from "obsidian";

export interface CardContext {
    properties: BasesPropertyId[];
    displayNames: Map<BasesPropertyId, string>;
    renderContext: RenderContext;
}

export interface ColumnData {
    key: string;
    hasKey: boolean;
    entries: BasesEntry[];   // was: entryCount: number
}

export interface BoardState {
    columns: ColumnData[];
    hasGrouping: boolean;
    cardContext: CardContext | null;
}

let boardState = $state<BoardState>({ columns: [], hasGrouping: false, cardContext: null });
```

- `CardContext` is shared across all cards (properties list, display names, render context).
- `entryCount` removed — derive from `entries.length` where needed.

---

## Step 2: Modify `src/board-view.ts`

Pass entries and card context in `onDataUpdated()`.

```ts
onDataUpdated(): void {
    const groups = this.data.groupedData;

    const noGrouping =
        groups.length === 1 && groups[0] !== undefined && !groups[0].hasKey();

    if (noGrouping) {
        setBoardState({ columns: [], hasGrouping: false, cardContext: null });
        return;
    }

    const visibleProperties = this.data.properties;
    const displayNames = new Map<BasesPropertyId, string>();
    for (const prop of visibleProperties) {
        displayNames.set(prop, this.config.getDisplayName(prop));
    }

    const cardContext: CardContext = {
        properties: visibleProperties,
        displayNames,
        renderContext: this.app.renderContext,
    };

    const columns: ColumnData[] = groups.map((group) => ({
        key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
        hasKey: group.hasKey(),
        entries: group.entries,
    }));

    setBoardState({ columns, hasGrouping: true, cardContext });
}
```

Import `CardContext` type from `board-state.svelte`.

---

## Step 3: Create `src/components/Card.svelte`

New component for rendering a single card.

```svelte
<script lang="ts">
    import type { BasesEntry } from "obsidian";
    import type { CardContext } from "../board-state.svelte";

    let { entry, cardContext }: { entry: BasesEntry; cardContext: CardContext } = $props();

    function renderValue(node: HTMLElement, propertyId: string) {
        const value = entry.getValue(propertyId as any);
        if (value) {
            value.renderTo(node, cardContext.renderContext);
        }
    }
</script>

<div class="kanban-card">
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

- Title: `entry.file.basename`.
- Properties: iterate visible properties, skip null/falsy values.
- `use:renderValue` Svelte action calls `Value.renderTo()` imperatively.
- The action receives the `propertyId` as its parameter.

---

## Step 4: Modify `src/components/Column.svelte`

Render cards from entries, pass `cardContext` through.

```svelte
<script lang="ts">
    import type { ColumnData, CardContext } from "../board-state.svelte";
    import Card from "./Card.svelte";

    let { column, cardContext }: { column: ColumnData; cardContext: CardContext } = $props();
</script>

<div class="kanban-column">
    <div class="kanban-column-header">
        <span class="kanban-column-title">{column.key}</span>
        <span class="kanban-column-count">{column.entries.length}</span>
    </div>
    <div class="kanban-column-items">
        {#each column.entries as entry (entry.file.path)}
            <Card {entry} {cardContext} />
        {/each}
    </div>
</div>
```

- `entry.file.path` as the keyed-each identifier (unique per file).
- `entryCount` replaced with `column.entries.length`.

---

## Step 5: Modify `src/components/Board.svelte`

Pass `cardContext` from state to each `Column`.

```svelte
{#each state.columns as column (column.key)}
    <Column {column} cardContext={state.cardContext} />
{/each}
```

---

## Step 6: Modify `styles.css`

Add card styles after the existing column styles.

```css
.kanban-card {
    background-color: var(--background-primary);
    border-radius: var(--radius-s);
    padding: var(--size-4-2) var(--size-4-3);
}

.kanban-card-title {
    font-size: var(--font-ui-small);
    font-weight: var(--font-semibold);
    color: var(--text-normal);
    word-break: break-word;
}

.kanban-card-properties {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    margin-top: var(--size-4-1);
    font-size: var(--font-ui-smaller);
}

.kanban-card-property {
    display: flex;
    align-items: baseline;
    gap: var(--size-4-2);
}

.kanban-card-property-label {
    color: var(--text-muted);
    flex-shrink: 0;
}

.kanban-card-property-value {
    color: var(--text-normal);
    min-width: 0;
    overflow: hidden;
}
```

- All colors/spacing via Obsidian CSS variables for theme compatibility.
- Card uses `--background-primary` against column's `--background-secondary` for visual separation.
- `word-break: break-word` on title prevents overflow in the fixed-width column.

---

## Verification

1. `npm run build` — no type-check or bundle errors.
2. `npm run svelte-check` — no Svelte errors.
3. `npm run lint` — passes.
4. In Obsidian:
   - Open a Base with group-by configured and properties visible → cards appear in columns with titles and property values.
   - Each card shows the filename as title.
   - Configured properties render with Obsidian's native formatting (dates, links, tags, etc.).
   - Properties not set on a file are skipped (no empty rows).
   - No visible properties configured → cards show title only.
   - Change visible properties in Bases toolbar → cards update immediately.
   - Columns still scroll vertically when cards overflow.
