# Feature 5: Click to Open — Research

## What Already Exists

### Card component (`src/components/Card.svelte`)
- Renders a `<div class="kanban-card">` with title and properties
- Receives `entry: BasesEntry` and `cardContext: CardContext` as props
- `entry.file` is a `TFile` (line 16 uses `entry.file.basename`)
- **No click handler** is attached to the card div

### Board view (`src/board-view.ts`)
- `BoardView` extends `BasesView`, which provides `this.app: App`
- `this.app` is already accessed (line 56: `this.app.renderContext`)
- `this.app.workspace` provides `openLinkText()` for navigation

### Card context (`src/board-state.svelte.ts`)
- `CardContext` interface holds `properties`, `displayNames`, and `renderContext`
- **Does not include** `app` or any navigation callback

### Styles (`styles.css`)
- `.kanban-card` has no `cursor` style — cards don't visually indicate clickability

## What Is Missing

### 1. Navigation callback
The Card component has no way to open a file. It needs a function that calls `app.workspace.openLinkText()`. The `app` reference lives in `BoardView` but is not passed through to Svelte components.

**Options to bridge the gap:**
- **A) Add a callback to `CardContext`** — e.g., `onCardClick: (file: TFile) => void`. The `BoardView` creates this callback with access to `this.app`, and it flows through the existing `cardContext` prop to every Card. Minimal changes, no new wiring.
- **B) Add `app` to `CardContext`** — pass the full `App` reference and let Card call `app.workspace.openLinkText()` directly. Leaks a large API surface into the UI layer.
- **C) Svelte context (`setContext`/`getContext`)** — set `app` at the Board mount point, retrieve in Card. More idiomatic Svelte but adds an invisible dependency.

**Recommendation:** Option A. A single callback keeps the API surface small and the Card component testable. The callback is created once in `BoardView.onDataUpdated()` and reused for all cards.

### 2. Click handler on Card
The `<div class="kanban-card">` needs an `onclick` handler that calls the navigation callback with `entry.file`.

### 3. Obsidian API call
`app.workspace.openLinkText(linktext, sourcePath, newLeaf?)`:
- `linktext`: the file path — `entry.file.path` works
- `sourcePath`: can be `""` (empty string) since we have an absolute vault path
- `newLeaf`: controls where the file opens. Passing `false` (default) replaces the current leaf. Passing `"tab"` opens in a new tab. The standard Obsidian behavior for clicking internal links is to open in the same leaf, with modifier keys (Ctrl/Cmd+click) for new tab. We should follow this convention.

### 4. Modifier-key handling
Standard Obsidian UX: plain click opens in current leaf, Ctrl/Cmd+click opens in a new tab. The click handler should check `event.ctrlKey || event.metaKey` and pass the appropriate `PaneType`.

### 5. Cursor style
`.kanban-card` needs `cursor: pointer` to indicate clickability.

### 6. Accessibility
The card is currently a plain `<div>`, which is not keyboard-navigable or announced as interactive by screen readers. Since the card's primary action is navigation, the appropriate semantic element is `<a>` (anchor) or a `<button>`. 

**`<button>` vs `<a>`:**
- `<a>` is semantically correct for navigation actions ("go to this file"). It gets keyboard focus, Enter activation, and "link" announcement for free. However, there's no real `href` to point to (Obsidian vault paths aren't URLs), so we'd use `href="#"` or `role="link"` on a non-anchor — both awkward.
- `<button>` is semantically correct for "perform an action" and gives us focus, Enter/Space activation, and "button" announcement with zero extra work. The action happens to be navigation, but from the DOM's perspective it's a JS-driven action.

**Recommendation:** Use `<button>` for the card wrapper. This provides:
- Keyboard focusability (no manual `tabindex` needed)
- Enter and Space activation (no manual `keydown` handler needed)
- Screen reader announcement as an interactive element
- Clean, minimal implementation with correct semantics

The existing `.kanban-card` styles will need a CSS reset for button defaults (border, background, text-align, font inheritance).

## Files That Need Changes

| File | Change |
|---|---|
| `src/board-state.svelte.ts` | Add `onCardClick` callback to `CardContext` |
| `src/board-view.ts` | Create the callback using `this.app.workspace.openLinkText()` |
| `src/components/Card.svelte` | Change `<div>` to `<button>`, add click handler |
| `styles.css` | Add `cursor: pointer` and button reset styles to `.kanban-card` |

## Risks / Considerations

- **Event propagation:** Future features (drag-and-drop) will also listen on the card. A click handler now is fine; drag-and-drop will need to distinguish click vs. drag later.
- **Mobile:** `openLinkText` works on mobile Obsidian. No Electron-only APIs needed.
- **No `this.register*` needed:** The click handler is managed by Svelte's lifecycle (destroyed on unmount), not a manual DOM listener.
