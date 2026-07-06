# Design

## Approach

Use local React state keyed by room id to track the active workbench tab. A small segmented control sits under the action card. Each tab renders existing data already available in `RoomDetail`:

- `Logs`: current terminal-style room logs.
- `Artifacts`: existing artifact rows.
- `Notes`: existing founder note editor plus saved notes.
- `Memory`: existing product memory section picker/editor.

The goal is to reduce vertical scanning, not to hide critical state. The always-visible top portion still shows task title, status, ask, acceptance criteria, gates, and actions.

## Verification

- `pnpm check`
- Browser smoke: switch through all four tabs and verify each panel renders expected content.
