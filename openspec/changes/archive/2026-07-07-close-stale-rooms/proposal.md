# close-stale-rooms

## Why

V0 rooms can be approved, rejected, snoozed, retried, or killed, but a founder also needs a quiet way to close stale or no-longer-relevant rooms without implying the work was approved or rejected.

## What Changes

- Add a `close` founder decision action.
- Mark the room `done`, clear open asks, persist a low-risk decision, and append a room log.
- Expose the action in the room command picker.

## Out of Scope

- Deleting room history.
- Cleaning generated worktrees automatically.
- Changing approval gate enforcement for approve/apply flows.

## Verification

- `pnpm check`
