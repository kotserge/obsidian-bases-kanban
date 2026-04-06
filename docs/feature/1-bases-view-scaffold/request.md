# Feature 1: BasesView Scaffold

## Goal

Register a custom Bases view that renders an empty board container. This is the foundation all other features build on.

## What this does

- Extend `BasesView` to create a `BoardView` class
- Register the view with Obsidian so it appears as a view option in Bases
- Render an empty board container element when the view is activated
- The Bases toolbar (filter, group, sort, properties) should be functional above the board container

## Acceptance criteria

- Opening a Base and switching to the kanban view shows an empty board container
- The Bases toolbar controls are visible and functional
- The plugin loads and unloads cleanly (no leaked listeners or DOM elements)

## Dependencies

None — this is the first story.
