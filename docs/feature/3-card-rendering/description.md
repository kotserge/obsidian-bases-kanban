# Feature 3: Card Rendering

## Goal

Render cards inside their respective columns, displaying the properties configured in Bases.

## What this does

- Place each file (card) in the column matching its group-by property value
- Display the card's title (filename)
- Show whichever properties the user has selected in the Bases properties configuration
- Cards within a column are ordered according to the Bases sort configuration

## Acceptance criteria

- Cards appear in the correct column based on their group-by property value
- Card title is visible
- Configured properties are displayed on each card
- Card order within a column matches the Bases sort
- Changing the Bases sort or properties updates the cards

## Dependencies

- Feature 2 (column rendering)
