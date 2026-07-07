# Design

## Daemon Guard

Before creating a run record, `startRoomRun` checks the selected product path:

- `dry-run`: allowed even if the product folder is missing because it is simulated local output.
- `codex-readonly`: requires the product path to exist and be a directory.
- `worktree-dry-run` and `codex-worktree`: require the product path to exist, be a directory, and be a git repository.

If preflight fails, the daemon throws before creating a run record. The room gets a warning log so the founder can see what blocked launch.

## UI Guard

The room action panel uses product folder inspection to disable read/worktree actions when the selected product cannot support them. Unknown inspection should not block launch by itself; the daemon remains authoritative.
