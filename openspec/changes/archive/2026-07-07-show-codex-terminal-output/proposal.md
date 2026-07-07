# Show Codex Terminal Output

## Why

The command-center start screen looks like terminals, but it currently reads too much like a dashboard summary. The founder expects those panes to behave as actual room terminals: showing what Codex is doing from captured stdout/stderr, with room metadata as supporting chrome.

## What Changes

- Poll latest run records for the command-center rooms.
- Fetch captured `logs.txt` output for each latest run.
- Render terminal panes from raw run output first, falling back to room evidence only when no run log exists.
- Improve the terminal font stack for a calmer, more credible terminal feel.

## Out Of Scope

- Full terminal emulation.
- WebSocket streaming.
- New daemon endpoints.
- Changing Codex run behavior.

## Verification

- `openspec validate show-codex-terminal-output --strict`
- `pnpm check`
