# Resizable Terminal Drawers

## Why

The simplified V0 product is a dashboard of Codex terminal drawers. The drawers currently look like terminals, but their layout is still mostly fixed. The founder should be able to resize terminals based on what needs attention: make an active Codex run large, keep idle drawers small, and keep stuck/ready drawers visible without opening the workbench.

## What Changes

- Add per-terminal drawer sizing on the command-center dashboard.
- Let the founder drag a drawer resize handle to change its grid width and height.
- Snap drawer sizes to dashboard grid columns/rows so the screen stays orderly.
- Persist drawer sizes locally in browser storage.
- Keep focused terminal mode, run controls, ask answering, and color-by-state behavior unchanged.

## Out of Scope

- New backend persistence.
- New layout or drag-and-drop dependencies.
- Freeform overlapping windows.
- Changing run execution, Codex invocation, logs, gates, asks, or artifacts.

## Impact

- `apps/control-ui/src/App.tsx` command-center layout state and terminal drawer rendering.
- `openspec/specs/fleet-dashboard/spec.md`.
- `PROJECT_STATUS.md`.
