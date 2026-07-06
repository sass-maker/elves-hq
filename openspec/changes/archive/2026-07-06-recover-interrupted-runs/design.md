# Design: Recover Interrupted Runs

## Startup Reconciliation

`WorkspaceStore` owns the SQLite connection and should reconcile state immediately after schema creation and seeding.

Algorithm:

1. Select all rows from `elf_runs` where `status = 'running'`.
2. For each row:
   - update the run to `failed`
   - set `ended_at` to the current timestamp
   - leave `exit_code` null
   - update the room to `failed`
   - append a warning log explaining the daemon restarted while the run was active

## Room State

Use existing `failed` room status so Needs Me and Daily Brief already classify it correctly.

## Auditability

The recovery must create a room log. It should not silently mutate history.
