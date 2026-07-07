# page-command-center-terminals

## Why

The local command center can now have dozens of active rooms. Rendering every active room as a terminal drawer at once makes the first screen information-dense again and undermines the calm terminal command-center direction.

## What Changes

- Add a paged terminal canvas to the command-center dashboard.
- Keep all active rooms represented in the terminal set, but show one calm page at a time.
- Preserve existing terminal drawer resizing, focus mode, run controls, ask answering, and decision actions.

## Out of Scope

- New room filters or saved views.
- Changing room status semantics.
- Deleting or auto-closing existing rooms.

## Verification

- `pnpm check`
- `openspec validate --all --strict`
- Local UI and daemon smoke checks
