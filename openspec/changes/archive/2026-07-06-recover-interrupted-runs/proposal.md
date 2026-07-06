# Change: Recover Interrupted Runs

## Why

The local daemon persists run records, but a daemon restart can leave an `elf_runs.status = running` row with no live child process. The cockpit would then imply work is still active even though the elf is gone. That violates the no-fake-progress rule.

## What Changes

- Reconcile any persisted running runs when the daemon starts.
- Mark those runs failed with a null exit code.
- Mark affected rooms failed with a restart/interruption summary.
- Append a room log entry so the founder can inspect, retry, or reject.

## Non-Goals

- Resuming the original child process.
- Restoring terminal sessions.
- Killing external processes by PID.
- Changing the run status enum.

## Impact

- Startup becomes safer after local restarts.
- Interrupted rooms show up in Needs Me through existing failed-room logic.
- No schema change or new dependency.
