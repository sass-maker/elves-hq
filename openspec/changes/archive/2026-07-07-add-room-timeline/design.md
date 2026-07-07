# Design

## UI Shape

Add a fifth workbench tab: `Timeline`. The tab renders recent events in reverse chronological/priority order with:

- source label
- timestamp when available
- short title
- supporting summary
- tone derived from evidence status

The room header and action panel remain above the workbench, so the timeline does not take over the room.

## Data Source

Timeline items are derived in the React app from the existing `Room` and `ElfRun[]` payloads:

- open asks
- artifacts
- decisions
- notes
- logs
- recent runs

The implementation caps the rendered item count to keep the room calm. Logs remain available in the Logs tab for full detail.

## Behavior

The selected tab state remains per-room using the existing `roomWorkbenchTabsById` map. If a room has no evidence yet, the timeline shows an empty state.
