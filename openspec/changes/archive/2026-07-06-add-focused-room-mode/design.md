# Design

## Approach

Add local UI state in `App` for `focusedRoomId`. When set, the main shell renders only the selected-room panel using a single-column full-width grid. The selected room remains sourced from existing workspace state, so live refresh, runs, asks, and previews continue to work.

`RoomDetail` receives `isFocused`, `onFocusRoom`, and `onExitFocusRoom`. The existing expand icon becomes a toggle:

- unfocused: `Expand room`
- focused: `Exit focused room`

The focused state is intentionally not persisted. It is a temporary attention mode, not a saved layout.

## Verification

- `pnpm check`
- Browser smoke: enter focused mode, confirm fleet/sidebar and room list are hidden, switch a workbench tab, exit focused mode, confirm three panes return.
