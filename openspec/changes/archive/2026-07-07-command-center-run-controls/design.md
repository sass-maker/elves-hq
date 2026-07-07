# Design

## Approach

Reuse the existing UI run actions that call:

- `POST /api/rooms/:id/runs/start`
- `POST /api/runs/:id/kill`

The command center should not gain new privileged actions. It starts the same bounded room run modes already available in room detail:

- Read: `codex-readonly`
- Build: `codex-worktree`
- Dry: `dry-run`

The pane should disable start controls while a run is active and show Stop instead. After a start/stop, existing polling refreshes the run record and captured logs.

## UI

Controls live in the terminal pane footer as compact monospace buttons. They should be low-pressure and secondary to the terminal output:

- `read`
- `build`
- `dry`
- `stop` only when running

Opening the pane still enters the full terminal inspector/workbench for gates, artifacts, notes, memory, and decisions.

## Safety

Build mode still runs in an isolated worktree and cannot commit, push, deploy, migrate, access secrets, spend money, or message users.
