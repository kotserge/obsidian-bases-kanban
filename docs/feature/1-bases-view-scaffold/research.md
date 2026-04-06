# Feature 1: BasesView Scaffold — Research

## What already exists

### Plugin entry point (`src/main.ts`)
- Bare `ObsidianKanban` class extending `Plugin` with empty `onload`/`onunload`.
- No view registration, no commands, no imports beyond `Plugin`.

### Build system
- esbuild + esbuild-svelte pipeline is fully configured and working (`esbuild.config.mjs`).
- Svelte 5 with `svelte-preprocess` is set up; `tsconfig.json` includes `src/**/*.svelte`.
- `npm run dev` (watch) and `npm run build` (typecheck + minify) are ready to use.

### Styles (`styles.css`)
- Placeholder comment only — no actual CSS.

### Manifest (`manifest.json`)
- `minAppVersion` is `"0.15.0"` — **must be bumped to at least `"1.10.0"`** because `BasesView` and `registerBasesView` were introduced in 1.10.0.
- `isDesktopOnly: false` — correct per CLAUDE.md.

### Source files
- Only `src/main.ts` exists. No other modules, no Svelte components.

---

## Obsidian API surface for BasesView (from `obsidian.d.ts`)

### `Plugin.registerBasesView(viewId: string, registration: BasesViewRegistration): boolean`
- Registers a custom view type with Bases.
- Returns `false` if Bases is not enabled in the vault.
- Called during `onload()`.

### `BasesViewRegistration` (interface)
```ts
{
    name: string;               // Human-readable name (shown in Bases view selector)
    icon: IconName;             // Icon ID for the view selector
    factory: BasesViewFactory;  // Creates the view instance
    options?: () => ViewOption[];  // Optional config options in toolbar menu
}
```

### `BasesViewFactory`
```ts
type BasesViewFactory = (controller: QueryController, containerEl: HTMLElement) => BasesView;
```
- `controller`: the `QueryController` driving data updates — passed to `BasesView` constructor.
- `containerEl`: the DOM element **below the Bases toolbar** where the view renders. This is our board container's parent.

### `BasesView` (abstract class, extends `Component`)
```ts
abstract class BasesView extends Component {
    abstract type: string;              // Must match the viewId used in registerBasesView
    app: App;                           // Obsidian app reference
    config: BasesViewConfig;            // View configuration (filter, sort, properties, etc.)
    allProperties: BasesPropertyId[];   // All available properties
    data: BasesQueryResult;             // Latest query results (replaced on each update)

    protected constructor(controller: QueryController);
    abstract onDataUpdated(): void;     // Called when data changes — must re-render
    createFileForView(...): Promise<void>; // (1.10.2) Helper to create new notes
}
```

Key points:
- `Component` provides `onload()`, `onunload()`, `register()`, `registerEvent()`, `addChild()`, `removeChild()` — standard Obsidian lifecycle/cleanup.
- `onDataUpdated()` is the core callback. Bases calls it whenever filters/sort/grouping/data change.
- `data` is a `BasesQueryResult` with `.data` (flat), `.groupedData` (grouped by group-by property), and `.properties` (visible properties).

### `BasesQueryResult`
```ts
class BasesQueryResult {
    data: BasesEntry[];                 // Flat, sorted entries
    get groupedData(): BasesEntryGroup[];  // Entries grouped by group-by property
    get properties(): BasesPropertyId[];   // Visible properties
}
```

### `BasesEntryGroup`
```ts
class BasesEntryGroup {
    key?: Value;           // Group key (NullValue if entry has no group-by value)
    entries: BasesEntry[]; // Entries in this group
    hasKey(): boolean;     // true if key is non-null
}
```

### `BasesEntry`
```ts
class BasesEntry {
    file: TFile;                                    // The markdown file
    getValue(propertyId: BasesPropertyId): Value | null; // Read a property value
}
```

### `BasesViewConfig`
Provides access to user-configured display settings:
- `getOrder(): BasesPropertyId[]` — visible properties in display order
- `getSort(): BasesSortConfig[]` — sort configuration
- `getDisplayName(propertyId): string` — human-friendly property name
- `get(key): unknown` — read custom view options
- `set(key, value)` — store custom view config

---

## What needs to be built for this feature

### 1. `BoardView` class (new file: `src/board-view.ts`)
A concrete `BasesView` subclass:
- `type` set to `"dev.kotchourko.obsidian.kanban"`
- Constructor calling `super(controller)` and storing `containerEl`
- `onDataUpdated()` — for this scaffold story, a no-op or minimal placeholder
- `onload()` — mount a Svelte `Board` component into `containerEl`
- `onunload()` — unmount the Svelte component

### 2. View registration in `src/main.ts`
In `onload()`, call:
```ts
const registered = this.registerBasesView("dev.kotchourko.obsidian.kanban", {
    name: "Kanban",
    icon: "square-kanban",
    factory: (controller, containerEl) => new BoardView(controller, containerEl),
});
if (!registered) {
    console.warn("obsidian-kanban: Bases is not enabled in this vault.");
}
```

### 3. Bump `manifest.json` `minAppVersion`
From `"0.15.0"` to `"1.10.0"`.

### 4. Board container Svelte component (new file: `src/components/Board.svelte`)
Mount an empty `Board.svelte` component into `containerEl` — sets up the Svelte mounting pattern that later features (columns, cards) will build on.
- A `Board.svelte` component that renders `<div class="kanban-board"></div>`
- Mount/unmount logic in `BoardView.onload()`/`onunload()` using Svelte 5's `mount(Component, { target })` / `unmount(instance)` API

### 5. Basic CSS (`styles.css`)
Minimal styles for `.kanban-board` container (e.g., `display: flex; overflow-x: auto;`). Just enough to confirm the container is present.

---

## Summary

| Aspect | Status |
|---|---|
| Plugin class | Exists, empty |
| Build system (esbuild + Svelte) | Ready |
| `BasesView` subclass | **Missing** — needs `BoardView` |
| View registration (`registerBasesView`) | **Missing** — needs call in `onload()` |
| Board container (Svelte component) | **Missing** — needs `Board.svelte` |
| Styles | **Missing** — placeholder only |
| `manifest.json` `minAppVersion` | **Needs bump** to `1.10.0` |
| Cleanup on unload | **Missing** — needs Svelte unmount in `onunload()` |
