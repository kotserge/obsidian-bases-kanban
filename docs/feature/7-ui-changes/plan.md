# Feature 7: UI Changes — Implementation Plan

## Overview

Two files to modify: `styles.css` (spacing, borders, column sizing) and `src/components/Card.svelte` (hide property labels). All changes are CSS-only except one Svelte template change.

---

## Step 1: Column height — shrink-wrap with max-height

Currently columns stretch to fill the board because `.kanban-column-items` has `flex: 1`. Remove that and cap the column height so it scrolls when content overflows.

### `styles.css` — `.kanban-column`

Add `align-self: flex-start` so the column doesn't stretch in the cross-axis of the board's row layout, and add `max-height: 100%` so it stays within the board bounds.

```css
/* before */
.kanban-column {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    width: var(--kanban-column-width, 272px);
    background-color: var(--background-secondary);
    border-radius: var(--radius-m);
}

/* after */
.kanban-column {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    align-self: flex-start;
    max-height: 100%;
    width: var(--kanban-column-width, 272px);
    background-color: var(--background-secondary);
    border-radius: var(--radius-m);
}
```

### `styles.css` — `.kanban-column-items`

Remove `flex: 1` (no longer needed — column sizes to content). Keep `overflow-y: auto` so scrolling kicks in when the column hits its max-height.

```css
/* before */
.kanban-column-items {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    padding: 0 var(--size-4-2) var(--size-4-2);
    overflow-y: auto;
    flex: 1;
}

/* after */
.kanban-column-items {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
    padding: var(--size-4-2) var(--size-4-2) var(--size-4-2);
    overflow-y: auto;
}
```

Note: this also applies the card gap and top-padding fixes from Steps 2 and 3.

---

## Step 2: Card gap between cards

Increase gap in `.kanban-column-items` from `size-4-1` to `size-4-2`.

Already handled in Step 1 snippet above (`gap: var(--size-4-2)`).

---

## Step 3: Card area top padding

Add `padding-top` to `.kanban-column-items` so the first card doesn't sit flush against the header.

Already handled in Step 1 snippet above (`padding: var(--size-4-2) var(--size-4-2) var(--size-4-2)`).

---

## Step 4: Column header padding

Increase from `size-4-2 size-4-3` to `size-4-3` all around.

### `styles.css` — `.kanban-column-header`

```css
/* before */
.kanban-column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-4-2) var(--size-4-3);
    font-size: var(--font-ui-small);
    font-weight: var(--font-semibold);
}

/* after */
.kanban-column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-4-3);
    font-size: var(--font-ui-small);
    font-weight: var(--font-semibold);
}
```

---

## Step 5: Card padding + border

Increase card padding to `size-4-3` all sides and add a subtle border.

### `styles.css` — `.kanban-card`

```css
/* before */
.kanban-card {
    cursor: pointer;
    background-color: var(--background-primary);
    border-radius: var(--radius-s);
    padding: var(--size-4-2) var(--size-4-3);
}

/* after */
.kanban-card {
    cursor: pointer;
    background-color: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    padding: var(--size-4-3);
}
```

---

## Step 6: Property gap

Increase gap between properties from `size-4-1` to `size-4-2`.

### `styles.css` — `.kanban-card-properties`

```css
/* before */
.kanban-card-properties {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
    margin-top: var(--size-4-1);
    font-size: var(--font-ui-smaller);
}

/* after */
.kanban-card-properties {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-2);
    margin-top: var(--size-4-2);
    font-size: var(--font-ui-smaller);
}
```

---

## Step 7: Hide property labels

Remove the label text from card properties — show only the rendered value.

### `src/components/Card.svelte`

Remove the `<span class="kanban-card-property-label">` element entirely.

```svelte
<!-- before -->
<div class="kanban-card-property">
    <span class="kanban-card-property-label">
        {cardContext.displayNames.get(propertyId) ?? ""}
    </span>
    <span class="kanban-card-property-value" use:renderValue={propertyId}>
    </span>
</div>

<!-- after -->
<div class="kanban-card-property">
    <span class="kanban-card-property-value" use:renderValue={propertyId}>
    </span>
</div>
```

### `styles.css` — cleanup

Remove the now-unused `.kanban-card-property-label` rule and simplify `.kanban-card-property`:

```css
/* remove entirely */
.kanban-card-property-label {
    color: var(--text-muted);
    flex-shrink: 0;
}

/* simplify — no longer need baseline alignment for two items */
/* before */
.kanban-card-property {
    display: flex;
    align-items: baseline;
    gap: var(--size-4-2);
}

/* after */
.kanban-card-property {
    display: flex;
    align-items: baseline;
}
```

---

## Change Summary

| File | Lines affected | What changes |
|------|---------------|--------------|
| `styles.css` | `.kanban-column` | Add `align-self: flex-start`, `max-height: 100%` |
| `styles.css` | `.kanban-column-header` | Padding `size-4-2 size-4-3` → `size-4-3` |
| `styles.css` | `.kanban-column-items` | Remove `flex: 1`, gap `size-4-1` → `size-4-2`, add top padding |
| `styles.css` | `.kanban-card` | Padding `size-4-2 size-4-3` → `size-4-3`, add border |
| `styles.css` | `.kanban-card-properties` | Gap `size-4-1` → `size-4-2`, margin-top `size-4-1` → `size-4-2` |
| `styles.css` | `.kanban-card-property` | Remove gap (only one child now) |
| `styles.css` | `.kanban-card-property-label` | Delete rule (unused) |
| `src/components/Card.svelte` | Line 50-52 | Remove `<span class="kanban-card-property-label">` element |
