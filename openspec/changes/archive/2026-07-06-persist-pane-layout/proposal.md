# Persist Pane Layout

## Why

The V0 cockpit is meant to be a local command room where task rooms can be organized and resized easily. The current browser-native pane resizing is hard to discover, does not persist, and can leave the layout feeling accidental. The founder should be able to tune the fleet/rooms/selected-room balance and keep that layout across reloads.

## What Changes

- Add explicit cockpit layout controls for fleet, room-list, and selected-room pane widths.
- Persist pane sizing in local browser storage.
- Add a reset action that restores the default command-room layout.
- Keep the behavior local to the UI; no daemon API or database change.

## Out Of Scope

- Drag handles between panes.
- Multiple named saved layouts.
- Mobile-specific layout editing.
