# Feature 3: Card Rendering — Research

## What already exists (from Features 1 & 2)

### `src/board-view.ts`
- `BoardView` extends `BasesView`, type `"dev.kotchourko.obsidian.kanban"`.
- `onDataUpdated()` transforms `this.data.groupedData` into `ColumnData[]` and pushes it via `setBoardState()`.
- Currently extracts only `key`, `hasKey`, and `entryCount` from each group — **entries themselves are discarded**.
- Has access to `this.data` (`BasesQueryResult`), `this.config` (`BasesViewConfig`), `this.app` (`App`), and `this.allProperties` (`BasesPropertyId[]`).

### `src/board-state.svelte.ts`
- `ColumnData` interface: `{ key: string; hasKey: boolean; entryCount: number }` — **no entry/card data**.
- `BoardState` interface: `{ columns: ColumnData[]; hasGrouping: boolean }`.
- Reactive `$state` with `getBoardState()` / `setBoardState()`.

### `src/components/Board.svelte`
- Renders `Column` components for each entry in `state.columns`.
- Handles "no grouping" and "no data" empty states.

### `src/components/Column.svelte`
- Receives a `ColumnData` prop.
- Renders column header (title + count).
- `kanban-column-items` div is empty with a `<!-- Card rendering in Feature 3 -->` placeholder.

### `styles.css`
- `.kanban-column-items` already exists: flex column, gap, padding, `overflow-y: auto`, `flex: 1`.
- **No card styles exist.**

### `src/main.ts`
- Registers `BoardView` with `registerBasesView`. No changes needed.

---

## Obsidian API surface relevant to cards

### `BasesEntry`
```ts
class BasesEntry implements FormulaContext {
    file: TFile;                                        // The markdown file
    getValue(propertyId: BasesPropertyId): Value | null; // Read a property value
}
```
- `file` gives access to the filename (via `file.basename`) for card titles.
- `getValue()` retrieves the value of any property by its ID.

### `BasesQueryResult`
```ts
class BasesQueryResult {
    data: BasesEntry[];                   // Flat, sorted entries
    get groupedData(): BasesEntryGroup[]; // Entries grouped by group-by property
    get properties(): BasesPropertyId[];  // Visible properties (user-configured)
}
```
- `properties` returns the list of properties the user has selected to display. This directly maps to the acceptance criterion "configured properties are displayed on each card".
- `data` contains entries in the Bases sort order; `groupedData` groups them by the group-by property while preserving sort order within each group.

### `BasesEntryGroup`
```ts
class BasesEntryGroup {
    key?: Value;
    entries: BasesEntry[];  // Already sorted by Bases sort config
    hasKey(): boolean;
}
```
- `entries` within each group are already sorted — no additional sorting needed.

### `Value`
```ts
abstract class Value {
    abstract toString(): string;
    abstract isTruthy(): boolean;
    renderTo(el: HTMLElement, ctx: RenderContext): void;
}
```
- `renderTo()` renders the value into a DOM element using Obsidian's native rendering. This handles all value types (strings, numbers, dates, lists, links, checkboxes, etc.) with proper formatting.
- `toString()` is a fallback for simple text display.

### `RenderContext`
```ts
class RenderContext implements HoverParent {
    hoverPopover: HoverPopover | null;
}
```
- Available on `this.app.renderContext` (since 1.10.0).
- Required parameter for `Value.renderTo()`.
- Enables hover previews on rendered links.

### `BasesViewConfig`
```ts
class BasesViewConfig {
    getOrder(): BasesPropertyId[];           // Visible properties in display order
    getDisplayName(propertyId): string;      // Human-friendly property name
    getSort(): BasesSortConfig[];            // Sort configuration
}
```
- `getOrder()` returns properties in the order the user configured. This determines which properties appear on each card and in what order.
- `getDisplayName()` provides human-readable labels for property names (e.g. `"note.status"` → `"status"`).

### `BasesPropertyId`
```ts
type BasesPropertyId = `${BasesPropertyType}.${string}`;
// BasesPropertyType = 'note' | 'file' | 'formula'
```
- Property IDs are prefixed with their source type.
- `parsePropertyId(id)` splits into `{ type, name }`.

---

## Rendering strategy: `Value.renderTo()` vs `toString()`

Two approaches for rendering property values on cards:

**Option A: `Value.renderTo()` (recommended)**
- Uses Obsidian's native rendering pipeline.
- Handles all value types correctly: dates formatted per user locale, links with hover previews, checkboxes, tags with colors, lists rendered properly.
- Requires a DOM element and `RenderContext` — this means the rendering must happen in Svelte's `{#snippet}` or via an action, since `renderTo()` is imperative DOM manipulation.
- Svelte action (`use:renderValue`) is the cleanest integration: the action receives the `Value` and `RenderContext`, calls `renderTo()` on the element.

**Option B: `Value.toString()`**
- Simple string display. Easy to use in Svelte templates.
- Loses all rich formatting: dates as raw strings, links as plain text (no hover), no checkbox rendering, no tag colors.
- Only suitable for a minimal MVP that doesn't need to match Obsidian's native look.

**Decision: Use `Value.renderTo()`** — the acceptance criteria say "display configured properties", which implies they should render with Obsidian's native formatting. Using `renderTo()` gives us correct rendering for free, and a Svelte action keeps the integration clean.

---

## Data flow: API → Svelte components

Currently `onDataUpdated()` maps groups to `ColumnData` (key + count only). For cards, we need to pass the actual `BasesEntry` objects and the list of visible properties to the Svelte components.

### What needs to flow through
1. **Entry data per column** — each column needs its `BasesEntry[]` array.
2. **Visible properties** — `this.data.properties` (the property IDs the user configured to display).
3. **Property display names** — `this.config.getDisplayName(propertyId)` for labeling.
4. **RenderContext** — `this.app.renderContext` for `Value.renderTo()`.

### Challenge: `BasesEntry` is a class instance, not a plain object
The Obsidian docs note: "This object will be replaced with a new result set when changes to the vault or Bases config occur, so views should not keep a reference to it."

This means we should not store `BasesEntry` references across `onDataUpdated()` calls. Since `onDataUpdated()` pushes a complete new state via `setBoardState()`, and Svelte re-renders from that state, this is naturally handled — each call replaces the entire state.

However, passing class instances (with methods like `getValue()`) through `$state` requires care. `$state` in Svelte 5 creates deep reactive proxies by default. Wrapping `BasesEntry` instances in `$state` would proxy them, which could interfere with their internal methods.

**Solution: Use `$state.raw()`** instead of `$state()` for the board state. `$state.raw()` stores values without deep proxying — updates still trigger reactivity (on reassignment), but the stored objects remain untouched. This is appropriate since we replace the entire state on each `onDataUpdated()` call anyway.

---

## Card data shape

Transform each `BasesEntry` into a card-friendly structure:

```ts
interface CardData {
    id: string;               // Unique identifier (file path)
    title: string;            // Card title (file basename)
    properties: CardProperty[]; // Visible properties with values
}

interface CardProperty {
    id: BasesPropertyId;      // Property ID
    name: string;             // Display name
    value: Value | null;      // The value (null if not set on this entry)
}
```

**Alternative: Pass `BasesEntry` directly** and let `Card.svelte` call `getValue()`.

Tradeoffs:
- **Pre-extracted (`CardData`)**: Svelte components are pure — they receive plain data and render it. `board-view.ts` handles all API interaction. But this means `board-view.ts` must know about `RenderContext` and pass it separately.
- **Pass `BasesEntry` directly**: Simpler data flow — less transformation in `onDataUpdated()`. But Svelte components become coupled to the Obsidian API.

**Decision: Pass `BasesEntry` directly** to keep the data flow simple. The `Card` component will call `entry.getValue()` for each visible property. The property list and render context are board-level concerns, passed alongside.

---

## What needs to be built

### 1. Extend `BoardState` and `ColumnData`

Add entry data to the column state and board-level card rendering context:

```ts
interface CardContext {
    properties: BasesPropertyId[];  // Visible properties to display
    displayNames: Map<BasesPropertyId, string>;  // Property ID → display name
    renderContext: RenderContext;   // For Value.renderTo()
}

interface ColumnData {
    key: string;
    hasKey: boolean;
    entries: BasesEntry[];  // Replace entryCount with actual entries
}

interface BoardState {
    columns: ColumnData[];
    hasGrouping: boolean;
    cardContext: CardContext | null;  // null when no grouping
}
```

The `CardContext` is shared across all cards — no need to duplicate per card.

### 2. Create `Card.svelte` component

A card component rendering a single entry:
- Title: `entry.file.basename` (the filename without extension).
- Properties: iterate over `cardContext.properties`, call `entry.getValue(propertyId)`, render each value.
- Use a Svelte action for `Value.renderTo()` integration.

### 3. Update `Column.svelte`

- Iterate over `column.entries` and render a `Card` for each.
- Pass `cardContext` down (received from `Board.svelte`).
- Entry count in the header can be derived from `column.entries.length`.

### 4. Update `Board.svelte`

- Pass `cardContext` from `state` to each `Column`.

### 5. Update `board-view.ts` (`onDataUpdated`)

- Include `entries` in each `ColumnData`.
- Build `CardContext` from `this.data.properties`, `this.config.getDisplayName()`, and `this.app.renderContext`.

### 6. Update `board-state.svelte.ts`

- Change `$state` to `$state.raw()` to avoid deep proxying of `BasesEntry` instances.
- Update interfaces.

### 7. Add card CSS to `styles.css`

New classes:
- `.kanban-card` — card container (background, padding, border-radius, cursor).
- `.kanban-card-title` — card title text.
- `.kanban-card-properties` — properties container.
- `.kanban-card-property` — individual property row (label + value).
- `.kanban-card-property-label` — property name label.
- `.kanban-card-property-value` — property value container (target for `renderTo()`).

---

## Files to create or modify

| File | Action | Purpose |
|---|---|---|
| `src/board-state.svelte.ts` | **Modify** | Add `CardContext`, extend `ColumnData` with entries, switch to `$state.raw()` |
| `src/board-view.ts` | **Modify** | Pass entries and card context in `onDataUpdated()` |
| `src/components/Card.svelte` | **Create** | Render a single card with title and properties |
| `src/components/Board.svelte` | **Modify** | Pass `cardContext` to columns |
| `src/components/Column.svelte` | **Modify** | Render cards from entries |
| `styles.css` | **Modify** | Add card styles |

`src/main.ts` — no changes needed.

---

## Design decisions

1. **Card title**: Use `entry.file.basename` (filename without extension). This is the standard Obsidian convention — the filename IS the note title.
2. **Property rendering**: Use `Value.renderTo()` via a Svelte action for native Obsidian formatting. Null/missing values are skipped (not rendered).
3. **Property labels**: Show the display name (`config.getDisplayName()`) next to each value, so the user knows what each value represents.
4. **Card styling**: Minimal — white/dark background card with subtle border, matching the simple example from the design reference. Cards should look like clickable items but click-to-open is Feature 5.
5. **State management**: Use `$state.raw()` to avoid deep proxying `BasesEntry` class instances while still getting reactive updates on reassignment.
6. **Sort order**: Already handled by Bases — `group.entries` is pre-sorted, no additional work needed.

---

## Edge cases

1. **No visible properties configured**: Card shows only the title. No property section rendered.
2. **Property value is null**: Skip the property row entirely — don't show a label with an empty value.
3. **Empty columns (no entries)**: Column renders with header but no cards. Already handled by Feature 2.
4. **Many properties on a card**: Render all visible properties; the card grows vertically. Column has `overflow-y: auto` so it scrolls.
5. **Long property values**: Text values may be long. CSS should handle overflow (truncation or wrapping — wrapping is preferred for readability within the fixed column width).
