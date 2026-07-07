# Dashboard Terminal Creation

## Why

The V0 product is a dashboard of Codex terminal drawers. A founder should not need to drop into the older task-room/workbench pane just to create the next terminal. The dashboard needs a small, quiet creation flow that creates a terminal drawer directly from the main surface.

## What Changes

- Add a compact terminal creation panel on the command-center dashboard.
- Let the founder choose project, title, elf, and playbook from existing workspace data.
- Reuse the existing `POST /api/rooms` creation path.
- Select the created terminal drawer after creation so it appears in the dashboard.

## Out of Scope

- New daemon routes.
- New task lifecycle semantics.
- Starting a Codex run automatically after creation.
- Multi-step task planning or autonomous task generation.

## Impact

- `apps/control-ui/src/App.tsx` command-center props and dashboard UI.
- `openspec/specs/fleet-dashboard/spec.md`.
- `PROJECT_STATUS.md`.
