# Research: Uncategorized Column

## Summary

The uncategorized column feature is **almost entirely implemented already**. The data model, state management, and rendering all handle the uncategorized case. What remains is ensuring correct **ordering** (uncategorized first) and **conditional visibility** (hidden when empty).

## What Already Exists

### Data model (`src/board-state.svelte.ts`)

- `ColumnData` has a `hasKey: boolean` field (line 11) that distinguishes uncategorized columns from named ones. This was designed with this feature in mind.

### Data mapping (`src/board-view.ts`)

- `onDataUpdated()` (line 36) already handles the ungrouped case:
  - Line 59-63: Maps each `BasesGroupedData` group to a `ColumnData`. When `group.hasKey()` is false, sets `key: "Uncategorized"` and `hasKey: false`.
  - This means uncategorized cards are already collected into a column with the label "Uncategorized".

### Rendering (`src/components/Board.svelte`, `Column.svelte`, `Card.svelte`)

- `Board.svelte` iterates `state.columns` with `{#each}` and renders a `Column` for each, including the uncategorized one.
- `Column.svelte` displays `column.key` as the title, which will show "Uncategorized" for the ungrouped column.
- `Card.svelte` renders identically regardless of whether the parent column is uncategorized.

### Styles (`styles.css`)

- No special styling exists for the uncategorized column. The current column styles apply uniformly.

## What Is Missing

### 1. Column ordering: uncategorized first

**Current behavior:** The column order matches whatever order Bases returns from `this.data.groupedData`. There is no sorting logic. The Bases API may or may not place the no-key group first.

**Required:** The uncategorized column (where `hasKey === false`) must appear at index 0, before all keyed columns.

**Location:** `src/board-view.ts`, in the `onDataUpdated()` method, after the `groups.map()` call (line 59). A sort/partition step is needed to move the `hasKey: false` column to the front.

### 2. Conditional visibility: hide when empty

**Current behavior:** If Bases returns a group with `hasKey() === false` but zero entries, it would still produce a `ColumnData` with an empty `entries` array, and `Board.svelte` would render an empty "Uncategorized" column.

**Required:** The uncategorized column should only appear when it has at least one card. When all cards gain a group-by value, the column should disappear.

**Location:** `src/board-view.ts`, in `onDataUpdated()`. Filter out the uncategorized column when `entries.length === 0`. Alternatively, this could be done in `Board.svelte` with a reactive filter, but filtering at the data-mapping layer is cleaner.

### 3. Visual distinction (optional, not in requirements)

The overview doc (`docs/overview.md`, line 65) shows `Column("Uncategorized")` as a distinct column in the architecture diagram but does not specify any visual differentiation (e.g., muted title, italic label, different background). The request does not require this either, so no styling changes are needed.

## Bases API Behavior Notes

- `this.data.groupedData` returns `BasesGroupedData[]` where each group has:
  - `hasKey(): boolean` - whether the group has a key value
  - `key` - the group key (may be undefined/null when `hasKey()` is false)
  - `entries: BasesEntry[]` - the cards in this group
- When a card's frontmatter lacks the group-by property entirely, Bases places it in a group where `hasKey()` returns false. This is already handled.
- The order of groups from Bases is not guaranteed to place the no-key group first.

## Implementation Scope

Two small changes in `src/board-view.ts` within `onDataUpdated()`:

1. **Filter:** Remove uncategorized column when it has zero entries.
2. **Sort/partition:** Ensure uncategorized column is first in the array.

No changes needed to:
- `board-state.svelte.ts` (data model already supports this)
- `Board.svelte` (rendering already handles arbitrary column order)
- `Column.svelte` (displays whatever `column.key` says)
- `Card.svelte` (no change)
- `styles.css` (no visual distinction required)
- `main.ts` (no lifecycle changes)

Estimated diff: ~5-10 lines in one file.
