# Design

## Approach

Add local React state for the room deck scope: `active` or `all`. Product filtering and status sorting remain the source of room ordering. The `active` scope excludes rooms whose status is `done`; the `all` scope includes every room in the selected product filter.

## Selection Behavior

If the currently selected room is visible in the current scope, keep it selected. If it is hidden by the Active scope, choose the first visible room. Switching to All makes done rooms available again without changing persisted room state.

## UI

Place a compact segmented control in the room deck header. Show counts for active and all rooms so the founder understands what is hidden without reading another panel.
