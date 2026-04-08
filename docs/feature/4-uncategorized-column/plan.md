# Plan: Uncategorized Column

## Overview

Two changes in `src/board-view.ts` inside `onDataUpdated()`: filter out an empty uncategorized column, and ensure it sorts first when present.

## Changes

### File: `src/board-view.ts`

#### Step 1: Filter out empty uncategorized column

After the `groups.map()` call (line 59-63), filter the resulting array to remove any uncategorized column with zero entries.

Current code:

```ts
const columns: ColumnData[] = groups.map((group) => ({
    key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
    hasKey: group.hasKey(),
    entries: group.entries,
}));
```

Replace with:

```ts
const columns: ColumnData[] = groups
    .map((group) => ({
        key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
        hasKey: group.hasKey(),
        entries: group.entries,
    }))
    .filter((col) => col.hasKey || col.entries.length > 0);
```

This keeps all keyed columns (even if empty — those represent valid group-by values) but removes the uncategorized column when it has no cards.

#### Step 2: Sort uncategorized column to first position

Chain a `.sort()` after the `.filter()` to place the uncategorized column (`hasKey === false`) before all keyed columns, while preserving the relative order of keyed columns.

Final code:

```ts
const columns: ColumnData[] = groups
    .map((group) => ({
        key: group.hasKey() ? (group.key?.toString() ?? "") : "Uncategorized",
        hasKey: group.hasKey(),
        entries: group.entries,
    }))
    .filter((col) => col.hasKey || col.entries.length > 0)
    .sort((a, b) => {
        if (a.hasKey === b.hasKey) return 0;
        return a.hasKey ? 1 : -1;
    });
```

The sort comparator: if both columns have the same `hasKey` value, preserve their original order (`0`). Otherwise, the one without a key (`hasKey: false`) goes first (`-1`).

Note: `Array.prototype.sort()` is not guaranteed to be stable in all environments, but there is at most one uncategorized column, so instability between keyed columns is the only concern. In practice, ES2019+ (our target is ES2018 but all Obsidian-supported runtimes use V8/JSC/SpiderMonkey which are stable) guarantees stable sort. If we want to be defensive, we can use index-preserving sort, but this is unnecessary here.

## Files changed

| File | Change |
|---|---|
| `src/board-view.ts` | Add `.filter()` and `.sort()` to the columns pipeline |

## Files not changed

- `board-state.svelte.ts` — data model already has `hasKey` field
- `Board.svelte` — renders whatever columns it receives
- `Column.svelte` — displays `column.key` as title, works as-is
- `Card.svelte` — no change
- `styles.css` — no visual distinction required
- `main.ts` — no lifecycle changes

## Acceptance criteria verification

| Criterion | How it's met |
|---|---|
| Cards without group-by value appear in "Uncategorized" column | Already implemented: `key: "Uncategorized"` when `!group.hasKey()` |
| Column is positioned first | `.sort()` places `hasKey: false` before all others |
| Column is hidden when no uncategorized cards exist | `.filter()` removes it when `entries.length === 0` |
| Removing group-by value moves card to this column | Handled by Bases — it re-groups and calls `onDataUpdated()` |
