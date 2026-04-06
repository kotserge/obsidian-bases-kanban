# Overview

This plugin registers a custom Bases view that renders a kanban board. It does not introduce its own configuration for which properties to use — instead, it maps the primitive functions of [Bases](https://obsidian.md/help/bases) (filtering, grouping, sorting, properties) to kanban concepts.

## Concept

The kanban board is built entirely from Bases primitives:

| Bases primitive | Kanban concept | Effect |
|---|---|---|
| **Filter** | Board | Defines the collection of markdown files shown on the board |
| **Group** (under sort) | Lists / Columns | The group-by property determines which list each card belongs to |
| **Sort** (under sort) | Card order | Determines the order of cards within each list |
| **Properties** | Card display | Determines which fields are shown on each card |

This means:
- A **board** is not a fixed entity — it is the result of whatever filter the user has configured in Bases
- **Lists** are induced by the distinct values of the group-by property across the filtered files
- **Card ordering** is determined by the Bases sort configuration
- **Card content** (summary, tags, etc.) is determined by which properties the user has chosen to display

## Functionality

### Lists
- An "Uncategorized" list appears at the first position when cards exist that have no value for the group-by property

### Cards
- Can be dragged between lists (updates the group-by property in the card's frontmatter; Bases sort determines the new position)
- Clicking a card opens the respective file
- Display whichever properties the user has configured in Bases

### Cards without group-by value
- Cards matching the filter but missing the group-by property appear in the "Uncategorized" list
- Cards not matching the filter are excluded entirely

## Data Model

### Markdown Files

Markdown files in the vault are the source of truth. The frontmatter structure is not prescribed by this plugin — it depends entirely on the user's Bases configuration. For example, a user might configure:

- Filter on `project = "my-project"` → defines the board
- Group by `status` → defines lists like "Backlog", "In Progress", "Done"
- Sort by `priority` descending → orders cards within each list
- Show properties `summary`, `tags` → displayed on each card

```yaml
---
project: my-project
status: In Progress
priority: 1
summary: Implement drag and drop
tags:
  - frontend
  - ux
---
```

## View Architecture

```
BoardView (extends BasesView)
├── toolbar (provided by Bases — filter/group/sort/properties controls)
└── board-container
    ├── Column("Uncategorized")  ← only when ungrouped cards exist
    ├── Column("Backlog")
    │   ├── Card(note1.md)
    │   └── Card(note2.md)
    ├── Column("In Progress")
    │   └── Card(note3.md)
    └── Column("Done")
        └── Card(note4.md)
```

Build this with Svelte — the community standard for Obsidian plugins, compiles to vanilla JS with no runtime overhead.

## API Reference

- BasesView API: https://docs.obsidian.md/Reference/TypeScript+API/BasesView

## UI / UX

We go for a simple design, such as in ![simple](media/kanban-simple-example.png).

### Examples

Some examples are illustrated below, how other projects structure boards and lists.

![simple](media/kanban-simple-example.png)

![trello](media/kanban-trello-example.png)

![jira](media/kanban-jira-example.png)
