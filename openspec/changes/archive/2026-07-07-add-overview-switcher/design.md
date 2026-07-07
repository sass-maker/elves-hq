# Design

## Approach

Add local React state for `OverviewPanel` in the cockpit. Render a small segmented control above the overview area and conditionally render the selected panel.

Panel options:

- `needs`: current Needs Me queue.
- `fm`: current Elf FM panel.
- `backlog`: current product task backlog.
- `brief`: current Daily Brief panel.

## Behavior

The switcher is presentation-only. Existing panel actions continue to call the same handlers. Counts in the switcher are derived from the same data already loaded into the app.

## UI

Use existing dark controls and badges. The switcher sits above the room deck, replacing the stacked overview panels with one open surface.
