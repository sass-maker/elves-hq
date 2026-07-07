# Add Room Slider

## Why

The room board currently truncates to the first six rooms and hides the rest behind a note. That is not good enough for a local cockpit meant to run many elf rooms. The founder should be able to move through rooms without a noisy scrollbar or losing the selected room detail.

## What Changes

- Replace the fixed six-room slice with a paged React room deck.
- Show previous/next controls, current page, and total room count.
- Keep product filtering and status sorting intact.
- Keep selected room detail stable while sliding through the room deck.

## Out Of Scope

- Drag-and-drop room ordering.
- Persisted custom room order.
- New UI dependency or carousel package.
- Mobile redesign beyond preserving the existing responsive layout.
