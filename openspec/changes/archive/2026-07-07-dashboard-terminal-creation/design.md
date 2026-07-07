# Design

## Approach

The dashboard creation panel reuses the existing `createRoom` behavior from `App`, but exposes a command-center-specific handler that accepts a small payload. The command center owns only local draft UI state; persistence still happens through the daemon and workspace refresh.

## UI

- Keep the panel collapsed by default.
- Use one quiet header action: `new terminal`.
- When open, show compact fields:
  - product
  - terminal title
  - elf
  - playbook
- Keep acceptance criteria optional and small.
- Do not add a modal, wizard, or extra page.

## Behavior

- Creating a terminal calls the existing room creation endpoint.
- On success, workspace state updates through the existing response handling.
- The created room becomes selected.
- The creation panel clears the title/criteria fields after success.

## Verification

- `openspec validate dashboard-terminal-creation --strict`
- `pnpm check`
- local dev smoke for UI and daemon availability
