# Overview

This plug-in allows for kanban views in Obsidians Bases. The core idea is that each file is a card on a kanban board, where its board-key and list-key, defined by its frontmatter fields, dictates where these live. The scope of the board is then narrowed by filtering by the boards-key, as the selection of which project to view.

## Concept

Core concept:

- Cards are markdown files 
- A board is defined by the collection of markdown files induced by the filter used over the board-key
- Lists inside a board are defined be the set of list-keys inside the markdown file collection  

## Functionality

Core functionality:

- Boards
	- can be renamed (updates files property)
- Lists 
	- can be renamed (updates files property)
	- can be reordered inside the board
	- allow for creation of a new card / md file
- Cards
	- can be reordered inside the list
	- clicked open the respective file
	- show its tags

## Data Model

### Markdown Files

Markdown files in the vault are the source of truth for the kanban view, containing:

```yaml
---
<board-key>: project-string      	# which board this note belongs to
<list-key>: status-string      		# which column/list it sits in
<tags-key>:
	- tag-1
	- tag-2
---
```

### Board Settings

The plugin settings let the user configure which property is the board-key (`project`) and which is the list-key (`status`):

```ts
interface BoardSettings {
  boardProperty: string;   // e.g. "project"
  listProperty: string;    // e.g. "status"
}
```

### List Order

Per-board order lives in plugin data, keyed by the board identifier (the value of the `boardProperty` field):

interface PluginData {
  columnOrder: Record<string, string[]>;
  // e.g. { "my-project": ["Backlog", "In Progress", "Review", "Done"] }
}

## View Architecture

```
BoardView (ItemView)
├── toolbar (filter by project, add column, etc.)
└── board-container
    ├── Column("Backlog")
    │   ├── Card(note1.md)
    │   └── Card(note2.md)
    ├── Column("In Progress")
    │   └── Card(note3.md)
    └── Column("Done")
        └── Card(note4.md)
```

Build this with plain DOM or a lightweight reactive approach — Svelte is the community standard for Obsidian plugins (the official plugin template supports it), as it compiles to vanilla JS with no runtime overhead.

## UI / UX

We go for a simple desing, such as in ![simple](docs/media/kanban-simple-example.png).

### Examples

Some examples are illustrated below, how other project structure boards and lists. 

![simple](docs/media/kanban-simple-example.png)

![trello](docs/media/kanban-trello-example.png)

![jira](docs/media/kanban-jira-example.png)
