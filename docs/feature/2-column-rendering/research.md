# Feature 2: Column Rendering — Research

## What already exists (from Feature 1)

### `src/board-view.ts`
- `BoardView` extends `BasesView`, type `"dev.kotchourko.obsidian.kanban"`.
- Stores `containerEl` (the DOM node below the Bases toolbar).
- `onload()` mounts `Board.svelte` into `containerEl` using Svelte 5 `mount()`.
- `onunload()` calls `unmount()` and `containerEl.empty()`.
- `onDataUpdated()` is a **no-op stub** — this is the primary method we need to implement.
- Exposes `this.data` (a `BasesQueryResult`) and `this.config` (a `BasesViewConfig`) — both inherited from `BasesView`. These are the source of group-by data.

### `src/components/Board.svelte`
- Static markup only: `<div class="kanban-board"><div class="kanban-board-empty">No data</div></div>`.
- No `<script>` block, no props, no reactivity.

### `styles.css`
- `.kanban-board` — flex row container with horizontal scroll, full height, gap and padding.
- `.kanban-board-empty` — centered muted placeholder text.
- **No column styles exist.**

### `src/main.ts`
- Registers `BoardView` with `registerBasesView`. Minimal — no changes needed for this feature.

---

## Obsidian API surface relevant to columns

### Data flow
Bases calls `onDataUpdated()` whenever the query results, filters, grouping, or sorting change. At that point:
- `this.data` holds the latest `BasesQueryResult`.
- `this.data.groupedData` returns `BasesEntryGroup[]` — the grouped entries.
- `this.config` holds the current `BasesViewConfig`.

### `BasesQueryResult.groupedData: BasesEntryGroup[]`
- Returns entries grouped by the group-by property configured in the Bases toolbar.
- **If no group-by is configured**, returns a single group with an empty key (no `key` value, `hasKey()` returns `false`).
- Sort and limit are already applied.

### `BasesEntryGroup`
```ts
class BasesEntryGroup {
    key?: Value;           // Group key value (undefined/NullValue if no group-by value)
    entries: BasesEntry[]; // Entries in this group
    hasKey(): boolean;     // true iff key is non-null
}
```

### `Value` (abstract)
```ts
abstract class Value {
    abstract toString(): string;    // String representation of the value
    abstract isTruthy(): boolean;   // Truthiness check
    renderTo(el: HTMLElement, ctx: RenderContext): void; // Render into DOM
}
```
- `NullValue` — represents a missing/null value. Has a static `NullValue.value` singleton.
- `StringValue`, `NumberValue`, etc. — concrete subtypes for different property types.
- `toString()` is the simplest way to get a display string for column headers.

### `BasesViewConfig`
- `getDisplayName(propertyId): string` — human-friendly name for a property (relevant for future "grouped by X" labels, not directly for column headers).
- No direct method to check "is group-by configured" — we infer this from the structure of `groupedData`: if there is exactly one group and `hasKey()` is false, there is no meaningful grouping.

---

## Detecting "no group-by configured"

The acceptance criteria state: "When no group-by is configured, the board should indicate that grouping is required."

How to detect this from the API:
- `this.data.groupedData` returns a single `BasesEntryGroup` with `hasKey() === false` when no group-by is set.
- **Edge case**: a single group with `hasKey() === true` means all entries share one group value — this IS a valid group-by and should render one column, not the "no grouping" state.
- **Edge case**: empty data (no entries matching the filter) with group-by configured — `groupedData` may be an empty array. This should still render as a valid (empty) board, not the "grouping required" message.

Reliable heuristic: show the "grouping required" message when `groupedData.length === 1 && !groupedData[0].hasKey()`. In all other cases, render columns.

---

## What needs to be built

### 1. Pass reactive data from `BoardView` to `Board.svelte`

Currently `Board.svelte` receives no props. We need to pass grouped data from `onDataUpdated()` into the Svelte component reactively. Two approaches:

**Recommended: Svelte 5 runes via a `.svelte.ts` module**
- Create a `board-state.svelte.ts` file that holds `$state` and exports a setter function.
- `board-view.ts` (plain `.ts`, can't use runes directly) imports the setter and calls it in `onDataUpdated()`.
- `Board.svelte` imports the reactive state and renders from it.
- The esbuild-svelte plugin already compiles `.svelte.ts` files.
- This is the idiomatic Svelte 5 pattern — `writable` stores are the Svelte 4 approach.

### 2. Create `Column.svelte` component

A new component rendering a single column:
- Receives: column header text, entry count (cards themselves are Feature 3).
- Renders: a column container with a header.
- For now, the column body can be empty or show a count — card rendering is Feature 3.

### 3. Update `Board.svelte`

Transform from static placeholder to reactive:
- Subscribe to the data store.
- If "no group-by" state detected, show a message like "Group by a property to see columns".
- Otherwise, iterate over groups and render a `Column` for each.

### 4. Add column CSS to `styles.css`

New classes needed:
- `.kanban-column` — fixed-width vertical column, flex child of `.kanban-board`.
- `.kanban-column-header` — column title area with the group value name.

### 5. Implement `onDataUpdated()` in `BoardView`

Transform the grouped data from the API into a shape suitable for the Svelte components and push it through the store.

---

## Data transformation: API → Component

The `onDataUpdated()` method should transform `this.data.groupedData` into a simple structure for Svelte:

```ts
interface ColumnData {
    key: string;         // Display text for the column header (from Value.toString())
    hasKey: boolean;     // Whether this group has a real key (vs. uncategorized)
    entryCount: number;  // Number of entries (for placeholder display before Feature 3)
}
```

The "Uncategorized" column (groups where `hasKey() === false`) is Feature 4's concern. For this feature, we render all groups from `groupedData` as columns, using `group.key?.toString() ?? ""` for the header. Feature 4 will add special handling for the keyless group.

---

## Files to create or modify

| File | Action | Purpose |
|---|---|---|
| `src/board-view.ts` | **Modify** | Implement `onDataUpdated()`, create store, pass to Svelte |
| `src/components/Board.svelte` | **Modify** | Accept store prop, render columns or "no grouping" message |
| `src/components/Column.svelte` | **Create** | Single column component with header |
| `styles.css` | **Modify** | Add column styles |

`src/main.ts` — no changes needed.

---

## Design decisions

1. **Column width**: ~272px default, defined as a CSS variable (`--kanban-column-width`) so it can be made configurable later.
2. **Empty columns**: Render only what `groupedData` provides — no artificial column creation for missing group values.
3. **"No grouping" message**: "Group by a property to create columns" — actionable, concise, matches Obsidian's tone.
