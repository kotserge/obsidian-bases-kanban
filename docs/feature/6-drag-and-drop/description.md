# Feature 6: Drag and Drop Between Columns

## Goal

Allow cards to be dragged between columns, updating the group-by property in the card's frontmatter.

## What this does

- Cards can be picked up and dragged to a different column
- Dropping a card in a new column updates the group-by property in that file's frontmatter to match the target column's value
- The Bases sort configuration determines the card's position in the new column after the drop
- Visual feedback during drag (e.g. drag ghost, drop target highlighting)

## Acceptance criteria

- A card can be dragged from one column to another
- The file's frontmatter is updated with the new group-by value after drop
- The card appears in the correct sorted position in the target column
- Visual feedback is shown during the drag operation
- Works on both desktop and mobile

## Dependencies

- Feature 3 (card rendering)
