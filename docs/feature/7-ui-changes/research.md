# Feature 7: UI Changes — Research

## Reference Comparison

- **Current UI:** `docs/feature/7-ui-changes/current.png`
- **Target UI:** `docs/assets/kanban-simple-example.png`

---

## Column Component

### Already Present
- Dark rounded background (`background-secondary`, `border-radius: radius-m`)
- Header with title + item count
- Horizontal flex layout with gap between columns (`size-4-4`)
- Fixed column width (`272px`)
- Scrollable card area (`overflow-y: auto`)

### Differences from Target
1. **Card gap too small** — Current gap between cards is `size-4-1` (~4px). Target shows more breathing room between cards, closer to `size-4-2` (~8px).
2. **Column item padding too tight** — Current padding on `.kanban-column-items` is `0 size-4-2 size-4-2`. Target has more uniform padding on all sides, including top padding after the header.
3. **Column header padding** — Current is `size-4-2 size-4-3` (8px 12px). Target headers appear to have slightly more generous padding, roughly `size-4-3` all around (12px).
4. **No column top-padding for cards area** — The first card sits flush against the header with no top spacing. Target shows a small gap between header and first card.
5. **Columns stretch to full height** — Current columns fill the entire board height because `.kanban-column-items` uses `flex: 1`. In the target, columns are content-sized (shrink-wrap their cards) and only grow up to a maximum height, becoming scrollable when they exceed it. This requires removing `flex: 1` from `.kanban-column-items`, and adding a `max-height` to the column or its items container so it scrolls when cards overflow.

---

## Card Component

### Already Present
- Rounded card background (`background-primary`, `border-radius: radius-s`)
- Card title in bold (`font-semibold`)
- Click to open file
- Drag and drop support
- Properties rendered below title

### Differences from Target
1. **Card padding too tight** — Current is `size-4-2 size-4-3` (8px 12px). Target cards have more internal breathing room, approximately `size-4-3` (12px) on all sides.
2. **No card border/separation** — Current cards have no border. Target cards show subtle visual separation from the column background, likely a faint border (e.g., `1px solid` with a low-opacity color like `var(--background-modifier-border)`).
3. **Property label visible** — Current shows property labels (e.g., "tags", "summary") as text next to values. In the target, tag-type properties display as standalone colored pill badges without a visible label prefix. The label adds visual clutter not present in the target.
4. **Property layout direction** — Current renders each property as a horizontal row (`flex, align-items: baseline`). Target shows tag pills wrapping in a horizontal flow. The current column-direction layout for `.kanban-card-properties` is correct for mixed property types, but the inner `.kanban-card-property` row shows the label inline which doesn't match.

---

## Typography / Text Decoration

### Already Present
- Card title uses `font-ui-small` + `font-semibold` — matches target
- Column title uses `font-ui-small` + `font-semibold` — matches target
- Column count uses `text-muted` — matches target
- Property labels use `text-muted` — matches target

### Differences from Target
1. **Property label visibility** — Target hides property labels for tag-type values; only the rendered value (pill badges) is shown. Current always shows both label and value.

---

## Summary of Changes Needed

| Area | What | Current | Target |
|------|------|---------|--------|
| Column height | `.kanban-column` height behavior | Stretches to fill board (`flex: 1` on items) | Content-sized (shrink-wrap cards), scrollable at a max height |
| Card gap | `.kanban-column-items` gap | `size-4-1` (4px) | `size-4-2` (8px) |
| Card area top padding | `.kanban-column-items` padding-top | `0` | `size-4-1` or `size-4-2` |
| Card padding | `.kanban-card` padding | `size-4-2 size-4-3` | `size-4-3` all sides |
| Card border | `.kanban-card` border | none | `1px solid var(--background-modifier-border)` |
| Column header padding | `.kanban-column-header` padding | `size-4-2 size-4-3` | `size-4-3` all sides |
| Property gap | `.kanban-card-properties` gap | `size-4-1` (4px) | `size-4-2` (8px) |
| Property label | `.kanban-card-property-label` | always visible | hidden (only show rendered value) |

---

## Files to Modify

- `styles.css` — adjust margins, paddings, gap, add card border
- `src/components/Card.svelte` — hide property labels, show only rendered values

## Out of Scope

- Column collapse/expand arrows (present in target but not in acceptance criteria)
- Card attachment icons / comment counts (target-specific features, not in acceptance criteria)
- Colored tag pill styling (rendered by Obsidian's Bases `value.renderTo()`, not our concern)
