# Feature 2: Column Rendering

## Goal

Render columns from the Bases group-by configuration. Each distinct value of the group-by property becomes a column on the board.

## What this does

- Read the group-by configuration from the Bases view
- For each distinct group value, render a column with a header showing the group name
- Columns should be laid out horizontally and scroll when they overflow the board container
- When no group-by is configured, the board should indicate that grouping is required

## Acceptance criteria

- Columns appear matching the distinct values of the group-by property
- Column headers display the group value
- Horizontal scrolling works when columns exceed the board width
- Changing the group-by property in the Bases toolbar updates the columns

## Dependencies

- Feature 1 (BasesView scaffold)
