# Design

## Approach

Add local React state in `apps/control-ui/src/App.tsx` for:

- `RoomSignalFilter`
- `RoomSortOrder`

Derive organized rooms from the same `roomsForSelectedProduct` data already loaded in the cockpit. Apply the existing active/all scope first, then signal filter, then sort, then existing pagination.

## Signal Mapping

Use current room fields and existing status semantics:

- `needs`: unresolved asks or rooms marked `asking`.
- `working`: active run status or room status `working`.
- `ready`: ready room status or ready diff artifacts.
- `failed`: failed room status or failed gate artifacts.
- `blocked`: blocked room status.
- `idle`: done, idle, snoozed, or other non-active states.

The filter is derived from stored room signals and artifacts. It must not introduce fake progress.

## UI

Keep controls inside the existing Room Deck header area:

- A compact chip row for signal filters with counts.
- A select-style control for sort order.
- Existing active/all scope and previous/next paging remain available.

No new dependency is needed; use existing button styling and `cn`.
