# Terminal Decision Actions

## Why

The terminal dashboard now shows color-coded state and can create/run Codex terminal drawers. But important state transitions still require opening the older workbench or Needs Me queue. For the simplified V0, the drawer should be actionable where the state is visible: ready drawers should allow approve/request-fix, and failed or blocked drawers should allow retry/request-fix/open inspection.

## What Changes

- Attach matching decision items to every terminal drawer, not only the intervention drawer.
- Show compact terminal-level decision buttons when a drawer has a ready, failed, blocked, or review-needed decision.
- Reuse the existing room decision action endpoint.
- Keep ask-answer options higher priority than generic decision actions.

## Out of Scope

- New daemon routes.
- New decision types.
- Replacing the full workbench or gate panels.
- Bypassing existing approval guards.

## Impact

- `apps/control-ui/src/App.tsx` terminal dashboard props and drawer footer actions.
- `openspec/specs/fleet-dashboard/spec.md`.
- `PROJECT_STATUS.md`.
