# Research: Bug 1 — Property Rendering

## Reproduction path

1. Open a Bases kanban board with multiple properties enabled on cards (e.g. properties A, B, C all visible).
2. Disable property B via the Bases toolbar.
3. **Observed:** Property B remains visible; property C disappears — the *wrong* property was removed.
4. Re-enable property B.
5. **Observed:** Property B now renders twice on the card.

## Root cause

The bug originates in `src/components/Card.svelte:50`. The `{#each}` loop that renders card properties is **unkeyed**:

```svelte
{#each cardContext.properties as propertyId}
```

When Svelte 5 processes an unkeyed `{#each}` and the backing array changes, it reuses DOM elements **by index** rather than by identity. This causes a mismatch between which property a DOM node *displays* and which property it *should* display.

### Step-by-step breakdown

**Initial state** — properties array is `[A, B, C]`:
- DOM node 0 → action `renderValue` called with `A` → renders A
- DOM node 1 → action `renderValue` called with `B` → renders B
- DOM node 2 → action `renderValue` called with `C` → renders C

**After disabling B** — properties array becomes `[A, C]`:
- Svelte keeps 2 DOM nodes (matching new array length), destroys the 3rd.
- DOM node 0: parameter is now `A` (was `A`) → no change needed.
- DOM node 1: parameter is now `C` (was `B`) → Svelte calls the action's `update` method... **but `renderValue` returns nothing — no `update` method exists**.
- DOM node 2: **destroyed** — this was the node that originally rendered `C`.
- **Result:** User sees A and B. Property C is gone; property B persists incorrectly.

**After re-enabling B** — properties array becomes `[A, B, C]`:
- Svelte needs 3 DOM nodes, creates a new 3rd.
- DOM node 0: still shows A (correct).
- DOM node 1: originally rendered B, was never updated when it should have shown C, now parameter is B again — coincidentally "correct" visually.
- DOM node 2: newly created, action called with `C` → renders C.
- However, the `renderTo` Obsidian API **appends** child elements into the target node. If Svelte triggers a re-render cycle on the existing nodes (e.g. because `entry` reactivity updates the `{@const value}` binding), `renderValue` is re-invoked on a node that already has content from a prior render, causing **doubled content**.

### Contributing factor: no `destroy` on the action

The `renderValue` action (`Card.svelte:38-43`) returns `void` — no `update` and no `destroy`:

```typescript
function renderValue(node: HTMLElement, propertyId: string) {
    const value = entry.getValue(propertyId as any);
    if (value) {
        value.renderTo(node, cardContext.renderContext);
    }
}
```

This means:
- **No `update`:** When Svelte reuses a DOM node for a different property (due to index-based reuse), the rendered content is never refreshed.
- **No `destroy`:** When a node is removed, any resources allocated by `renderTo` are never cleaned up (potential memory leak, though not the user-visible symptom).

## Affected files

| File | Lines | Role |
|------|-------|------|
| `src/components/Card.svelte` | 50 | Unkeyed `{#each}` loop — primary cause |
| `src/components/Card.svelte` | 38-43 | `renderValue` action missing `update`/`destroy` — contributing factor |

## Data flow

```
BoardView.onDataUpdated()                  (board-view.ts:43)
  ├── reads this.data.properties           (board-view.ts:54)  — visible property IDs from Bases config
  ├── builds CardContext.properties         (board-view.ts:82-83)
  └── setBoardState(...)                   (board-view.ts:102)
        ↓ reactive state update
Board.svelte
  └── passes cardContext to Column
        └── passes cardContext to Card
              └── Card.svelte:50 — iterates cardContext.properties (UNKEYED)
                    └── Card.svelte:54 — use:renderValue={propertyId} (NO UPDATE/DESTROY)
```

When the user toggles a property in the Bases toolbar, Bases calls `onDataUpdated()` with updated `this.data.properties`. The new array flows through reactive state into Card, but the unkeyed each loop and action without lifecycle methods prevent proper DOM reconciliation.

## Fix approach

**Primary fix — add a key to the `{#each}` loop** (`Card.svelte:50`):

```svelte
{#each cardContext.properties as propertyId (propertyId)}
```

With a key, Svelte tracks DOM nodes by property identity instead of array index. When property B is removed, Svelte destroys B's specific DOM node and leaves A's and C's nodes untouched. This eliminates both the wrong-removal and the doubling symptoms.

**Secondary fix — return `update`/`destroy` from the action** (`Card.svelte:38-43`):

Even with keying, it is good practice to implement proper lifecycle methods on the action so that if `renderTo` content ever needs refreshing (e.g. the entry's value changes while the card is visible), the DOM node is cleared and re-rendered correctly. The `destroy` method should also clean up rendered content to avoid memory leaks.
