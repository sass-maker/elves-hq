# Design

## Approach

Use local React state in the cockpit to track the active room deck page. Split the already-filtered, already-sorted `visibleRooms` list into fixed-size pages and render them in a translated flex track. This gives the user an explicit slide container without adding a dependency.

## Behavior

- The deck page resets when the selected product filter changes.
- If a selected room is opened from Needs Me, Elf FM, or another action, the deck page moves to the page containing that room.
- Previous/next buttons are disabled at the ends.
- Empty room sets show a quiet empty state.

## UI

The room deck stays inside the current task-room panel. It uses compact controls, lucide icons, and existing `RoomCard` components. The room detail pane remains the inspection surface; the slider is for organization and navigation only.
