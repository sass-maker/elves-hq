# Design

## Approach

The React app keeps the existing room controls and local daemon flow, but adds a shell-level mode:

- `overview`: the new terminal command-center start screen.
- `room`: the existing detailed room cockpit.

The overview mode reads from the same `WorkspaceSeed`, `DecisionItem`, `ElfFmFeed`, `DailyBrief`, and room run state already loaded by the app. It does not create a separate dashboard model.

## Terminal Pane Mapping

Each terminal pane represents one room.

- Header: pseudo TTY id, room title, and product path.
- Body: recent room logs, artifacts, decisions, asks, and run metadata.
- Footer: assigned elf and literal room status.
- Tone: derived from room status, not decorative progress.

The right intervention pane prioritizes open decisions, asks, blocked rooms, failed rooms, and ready review rooms.

## Navigation

The start screen has a low-CTA left rail and top bar. Opening a terminal pane sets the selected room/product and switches into the existing room detail view. The detail view gets a simple “command center” exit path through the existing focus controls and the new shell mode.

## Risk

The main risk is turning real product state into decorative terminal theater. To avoid fake progress, every pane line must be derived from existing room evidence or explicit empty-state text.
