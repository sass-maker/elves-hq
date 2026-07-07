# Design

## Approach

Resizable drawers are implemented as a snapped CSS grid in the command center. Each visible terminal drawer gets a local layout `{ cols, rows }`, where `cols` spans the 12-column terminal canvas and `rows` spans fixed dashboard row units. A bottom-right drag handle updates the room's layout while preserving grid alignment.

## Layout

- Multi-terminal dashboard: 12-column grid, fixed row units.
- Default primary drawer: larger.
- Secondary drawers: medium.
- Needs/intervention drawer: tall enough to stay readable.
- Focused mode: unchanged; it remains a single large terminal with a rail.

## Persistence

- Store drawer layouts in `localStorage`.
- Scope by room id because the dashboard is local-first and rooms are durable local objects.
- Clamp loaded and dragged sizes so old or invalid values cannot break the layout.

## UI Rules

- The resize handle must be quiet and not add another CTA-heavy control.
- The terminal body remains the primary content.
- Drawer color continues to come from existing room/run/ask/gate state.
- No fake progress or simulated terminal output is introduced.

## Verification

- `openspec validate resizable-terminal-drawers --strict`
- `pnpm check`
- local dev smoke for UI and daemon availability
