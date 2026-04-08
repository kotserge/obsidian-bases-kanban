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

**`<button>` vs `<a>` vs `<div role="button">`:**
- `<a>` is semantically correct for navigation but there's no real `href` (Obsidian vault paths aren't URLs), making it awkward.
- `<button>` provides built-in keyboard/screen-reader support but its default styles (border, background, font, text-align, sizing) conflict with the card's layout — property values and nested content render incorrectly inside a `<button>`.
- `<div role="button">` with `tabindex="0"` and a `keydown` handler requires slightly more code but preserves the existing card layout while providing full accessibility.

**Recommendation:** Use `<div role="button" tabindex="0">` with a `keydown` handler for Enter/Space. This provides:
- Keyboard focusability via `tabindex="0"`
- Enter and Space activation via explicit `keydown` handler
- Screen reader announcement as an interactive element via `role="button"`
- No layout side-effects — the card renders identically to before

## Files That Need Changes

| File | Change |
|---|---|
| `src/board-state.svelte.ts` | Add `onCardClick` callback to `CardContext` |
| `src/board-view.ts` | Create the callback using `this.app.workspace.openLinkText()` |
| `src/components/Card.svelte` | Add `role="button"`, `tabindex="0"`, click + keydown handlers |
| `styles.css` | Add `cursor: pointer` to `.kanban-card` |

## Risks / Considerations

- **Event propagation:** Future features (drag-and-drop) will also listen on the card. A click handler now is fine; drag-and-drop will need to distinguish click vs. drag later.
- **Mobile:** `openLinkText` works on mobile Obsidian. No Electron-only APIs needed.
- **No `this.register*` needed:** The click handler is managed by Svelte's lifecycle (destroyed on unmount), not a manual DOM listener.
