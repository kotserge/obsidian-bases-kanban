# Feature 4: Uncategorized Column

## Goal

Handle cards that match the filter but have no value for the group-by property by placing them in an "Uncategorized" column.

## What this does

- Cards missing the group-by property are collected into an "Uncategorized" column
- This column appears at the first position, before all other columns
- The column is only shown when at least one such card exists
- When all uncategorized cards gain a group-by value, the column disappears

## Acceptance criteria

- Cards without a group-by value appear in an "Uncategorized" column
- The column is positioned first
- The column is hidden when no uncategorized cards exist
- Removing the group-by value from a card's frontmatter moves it to this column

## Dependencies

- Feature 3 (card rendering)
