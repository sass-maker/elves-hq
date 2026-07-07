# Guard Run Launch

## Why

Manual product folders make path correctness critical. A Codex run must never silently inspect or edit Elves HQ itself because a product path is missing or invalid. The daemon should fail closed before creating unsafe non-dry runs, and the cockpit should show the same blocker beside launch actions.

## What Changes

- Add daemon preflight checks before starting non-dry room runs.
- Require an existing product directory for Codex read-only runs.
- Require an existing git repository for worktree-backed runs.
- Remove fallback-to-Elves-HQ-root behavior for non-dry run modes.
- Disable blocked room action buttons when folder inspection proves the selected product cannot support that mode.

## Out Of Scope

- Auto-repairing product paths.
- Creating git repositories.
- Running installs or package scripts.
