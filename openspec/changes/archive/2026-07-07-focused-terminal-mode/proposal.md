# Terminal Drawer Dashboard

## Why

The product should be simpler than the earlier cockpit framing: one dashboard with multiple terminal drawers, each running or supervising a Codex elf for a local project task. The terminal is the primary object. Its color communicates whether it is working, waiting, failed/stuck, ready, or idle. The dense inspector/workbench is secondary.

The current command-center already has room-backed terminals with captured Codex output, run controls, and inline ask answering. The next step is to make that interaction model explicit: terminals can be focused/resized without turning into a different screen.

## What Changes

- Treat each task room as a terminal drawer in the command-center dashboard.
- Add a focused terminal mode that lets the founder expand one terminal drawer into a large single terminal.
- Keep captured output, `$` instructions, read/build/dry/stop controls, and ask answering available in focused mode.
- Keep a compact terminal rail for switching between Codex terminal drawers while focused.
- Keep the full inspector/workbench reachable as a secondary action.

## Out of Scope

- New daemon routes or persistence.
- True interactive PTY streaming.
- New terminal emulator dependency.
- Changing run execution, worktree, gate, or ask persistence semantics.
- Building marketing/dashboard/analytics surfaces.

## Impact

- `apps/control-ui/src/App.tsx` command-center state and layout.
- `openspec/specs/fleet-dashboard/spec.md`.
- `PROJECT_STATUS.md`.
