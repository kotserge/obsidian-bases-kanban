# Feature 6: Drag and Drop Between Columns — Research

## What Already Exists

### Card component (`src/components/Card.svelte`)
- Renders a `<div class="kanban-card" role="button" tabindex="0">` with click/keydown handlers
- Receives `entry: BasesEntry` and `cardContext: CardContext` as props
- `entry.file` is a `TFile` — needed to identify which file's frontmatter to update
- `entry.getValue(propertyId)` returns a `Value | null` for any property
- **No drag attributes** (`draggable`, `ondragstart`, etc.) are present
- **No drag-related state** exists anywhere in the codebase

### Column component (`src/components/Column.svelte`)
- Renders `<div class="kanban-column">` with a header and an items container (`kanban-column-items`)
- Iterates over `column.entries` with `{#each}`, keyed by `entry.file.path`
- `column.key` holds the group value as a string (e.g., "In Progress", "Uncategorized")
- `column.hasKey` distinguishes real groups from the uncategorized group
- **No drop zone handling** — no `ondragover`, `ondrop`, or drop target highlighting

### Board component (`src/components/Board.svelte`)
- Renders columns in a horizontal flex layout
- No drag-and-drop coordination or shared drag state

### Board state (`src/board-state.svelte.ts`)
- `ColumnData` has `key: string`, `hasKey: boolean`, `entries: BasesEntry[]`
- `CardContext` holds `properties`, `displayNames`, `renderContext`, `openFile`
- **No drag/drop callbacks or state** in `CardContext` or `BoardState`

### Board view (`src/board-view.ts`)
- `BoardView` extends `BasesView`, which provides `this.app: App` and `this.config: BasesViewConfig`
- `this.app.fileManager.processFrontMatter()` is available for frontmatter updates
- `this.data.groupedData` provides the grouped entries; groups are rebuilt on every `onDataUpdated()` call
- The group-by property name is **not directly exposed** by the Bases API (see below)
- `openFile` callback already exists in `CardContext` — the pattern of passing `BoardView` callbacks through context is established

### Styles (`styles.css`)
- `.kanban-card` has `cursor: pointer` — no drag-specific cursor
- No styles for drag ghost, drop target highlighting, or drag-over states

### Obsidian API surface

#### Frontmatter updates
`app.fileManager.processFrontMatter(file, fn)` (line 2499 of obsidian.d.ts):
- Takes a `TFile` and a synchronous callback that mutates a frontmatter object
- Returns a `Promise<void>`
- This is the standard way to update frontmatter — it handles YAML serialization and file writing
- Example: `app.fileManager.processFrontMatter(file, (fm) => { fm['status'] = 'Done'; })`

#### Getting the group-by property name
This is the **key challenge**. The Bases API does not expose a dedicated `getGroupBy()` method on `BasesViewConfig`. What's available:
- `BasesViewConfig.get(key: string): unknown` — generic config getter. The group-by config is stored under the key `"groupBy"` in `BasesConfigFileView`, so `this.config.get("groupBy")` may return the groupBy configuration object. The exact shape is not documented (typed as empty `{}` in the .d.ts).
- `BasesViewConfig.getAsPropertyId(key: string): BasesPropertyId | null` — converts a config value to a `BasesPropertyId`. Calling `this.config.getAsPropertyId("groupBy")` could return the group-by property ID directly if the config stores it as a property reference.
- `parsePropertyId(propertyId: BasesPropertyId): BasesProperty` — splits a `BasesPropertyId` (e.g., `"note.status"`) into `{ type: "note", name: "status" }`. The `name` field is the frontmatter key.
- `BasesEntryGroup.key?: Value` — the value for this group (e.g., `"In Progress"`), but not the property name.

**Recommended approach to get the group-by property name:**
1. Call `this.config.getAsPropertyId("groupBy")` to get the `BasesPropertyId` (e.g., `"note.status"`)
2. Call `parsePropertyId(propertyId)` to extract `{ type: "note", name: "status" }`
3. Use `name` as the frontmatter key when calling `processFrontMatter`

**Risk:** `getAsPropertyId("groupBy")` is undocumented for this key. If it returns `null`, the fallback is `this.config.get("groupBy")` and parsing the result manually. This needs to be verified at runtime during implementation.

#### Data flow after frontmatter update
After `processFrontMatter` modifies the file, Obsidian's vault watchers detect the change, the Bases query re-evaluates, and `onDataUpdated()` fires with new `groupedData`. The card will automatically appear in the correct column at its sorted position. **No manual DOM manipulation or state patching is needed** — the reactive data flow handles it.

## What Is Missing

### 1. Drag initiation on Card
The `<div class="kanban-card">` needs `draggable="true"` and an `ondragstart` handler. The drag data should encode the file path and source column key so the drop handler knows what moved and from where.

**HTML Drag and Drop API vs. pointer events:**
- **HTML DnD API** (`draggable`, `dragstart`, `dragover`, `drop`): Native browser support, built-in drag ghost image, works across elements. Straightforward for column-to-column moves where we don't need custom reordering within a column.
- **Pointer events** (manual `pointerdown`/`pointermove`/`pointerup`): More control over visual feedback, required for reordering within a column, but significantly more complex (manual hit testing, scroll handling, coordinate tracking).

**Decision:** Use the HTML Drag and Drop API. Desktop only for v1 — mobile touch support deferred. The acceptance criteria only require moving between columns (sort is handled by Bases), so we don't need within-column reordering. The native API provides drag ghost and drop zones with minimal code.

### 2. Drop target handling on Column
Each column needs to accept drops via `ondragover` (with `preventDefault()` to allow drop) and `ondrop`. The column should:
- Visually indicate it's a valid drop target (e.g., background color change, border highlight) via `ondragenter`/`ondragleave`
- On drop, trigger the frontmatter update

### 3. Drag state management
A shared drag state is needed so that:
- The Board knows a drag is in progress (to coordinate visual feedback)
- The drop target column knows what file is being dragged
- The card being dragged can be visually distinguished (opacity, elevation)

**Options:**
- **A) Svelte reactive state in `board-state.svelte.ts`** — add a `dragState` alongside `boardState`. Simple, follows existing pattern.
- **B) Separate drag module** — a new `drag-state.svelte.ts` file. Keeps drag logic isolated from board data.

**Recommendation:** Option B. Drag state is transient UI state, not board data. A separate module keeps concerns clean and the board state file focused on data from Bases.

### 4. Frontmatter update callback
Similar to how `openFile` is passed through `CardContext`, a `moveCard` callback is needed:
- Signature: `(file: TFile, targetColumnKey: string) => void`
- Created in `BoardView` with access to `this.app.fileManager` and the group-by property name
- Passed through context to the drag system

The callback implementation:
```
async moveCard(file: TFile, targetColumnKey: string): Promise<void> {
    const groupByPropId = this.config.getAsPropertyId("groupBy");
    if (!groupByPropId) return;
    const { name } = parsePropertyId(groupByPropId);
    await this.app.fileManager.processFrontMatter(file, (fm) => {
        fm[name] = targetColumnKey;
    });
}
```

After this call, `onDataUpdated()` will fire automatically with the card in its new column.

### 5. Handling the "Uncategorized" column
- **Dragging FROM Uncategorized:** The card has no group-by value. Dropping it in a real column should set the property for the first time.
- **Dragging TO Uncategorized:** Should remove/clear the group-by property. Use `delete fm[name]` in `processFrontMatter`.
- **Uncategorized → Uncategorized:** No-op, should be ignored.
- **Same column → Same column:** No-op, should be ignored.

### 6. Click vs. drag disambiguation
Cards currently have click handlers for opening files (Feature 5). With the HTML DnD API, the browser handles this naturally — a `dragstart` event suppresses the subsequent `click` event. However, we should verify this behavior and add a guard if needed (e.g., a flag set in `ondragstart` and checked in `onclick`).

### 7. Visual feedback
Required visual states:
- **Dragging card:** Reduced opacity on the original card position (browser applies this to the drag ghost automatically with HTML DnD)
- **Drag ghost:** Provided natively by the HTML DnD API (browser clones the dragged element)
- **Valid drop target:** Column highlight (background color change) when dragging over a column via `ondragenter`/`ondragleave`
- **Invalid/no-op:** No highlight when hovering over the source column

### 8. CSS additions needed
```css
/* Card being dragged */
.kanban-card.is-dragging { opacity: 0.5; }

/* Column accepting a drop */
.kanban-column.is-drop-target { background-color: var(--background-modifier-hover); }
```

## Files That Need Changes

| File | Change |
|---|---|
| `src/board-state.svelte.ts` | Add `moveCard` callback to `CardContext` |
| `src/board-view.ts` | Create `moveCard` callback using `processFrontMatter` + group-by property; import `parsePropertyId` |
| `src/components/Card.svelte` | Add pointer event handlers for drag initiation; disambiguate click vs. drag |
| `src/components/Column.svelte` | Add drop target detection and visual feedback |
| `src/components/Board.svelte` | Coordinate drag state |
| `src/drag-state.svelte.ts` | **New file** — shared reactive drag state (dragging file, source column) |
| `styles.css` | Add `.is-dragging`, `.is-drop-target` styles |

## Open Questions

1. **`getAsPropertyId("groupBy")` validity:** Does `this.config.getAsPropertyId("groupBy")` actually return the group-by property ID? This needs runtime verification. If it returns `null`, we need to explore `this.config.get("groupBy")` and parse the result.

2. **Uncategorized target value:** Decided — use `delete fm[name]` to remove the property entirely. Matches semantics (card has no value for the group-by property).

3. **Animation:** Deferred to a later feature (visual polish pass).

## Risks / Considerations

- **Mobile compatibility:** Deferred — v1 is desktop only (HTML DnD API). Mobile touch support will be added in a future iteration.
- **Performance:** `processFrontMatter` triggers a file write → vault change → Bases re-query → `onDataUpdated()`. This is a full reactive cycle. Acceptable for v1 — single card moves will be fast enough.
- **Event propagation with click-to-open:** The drag system must cleanly suppress the existing click handler when a drag occurs. If not handled correctly, dropping a card will also open the fithe HTML Drag and Drop APIle.
- **Concurrent edits:** If the file is open in an editor and the user drags its card, `processFrontMatter` and the editor could conflict. Obsidian's `processFrontMatter` handles this safely by reading/writing through the vault API, which coordinates with open editors.
- **Group-by on non-`note` properties:** If the group-by property is a `formula` or `file` type (not frontmatter), we cannot update it via `processFrontMatter`. We should check `parsePropertyId(propId).type === "note"` and only allow drag-and-drop for frontmatter properties. Display a notice if the user tries to drag when the group-by is a formula/file property.
