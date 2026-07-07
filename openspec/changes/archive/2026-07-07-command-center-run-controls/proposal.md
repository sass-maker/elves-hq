# Command Center Run Controls

## Why

The command-center start screen now shows captured Codex/run output, but starting or stopping work still requires leaving the terminal grid and opening the detailed inspector. In this product model, a task room is the terminal. The founder should be able to send an elf into that terminal or stop a running terminal directly from the terminal pane.

## What Changes

- Add compact terminal-pane controls for starting read-only Codex, worktree Codex, and dry-run modes.
- Add a stop control for rooms with an active running run.
- Keep output in the same terminal pane through existing run-log polling.
- Keep the detailed terminal inspector/workbench available for deeper inspection and gates.

## Out Of Scope

- New daemon endpoints.
- Production deploy actions.
- Committing, pushing, merging, or applying diffs from the command center.
- Free-form terminal emulation.

## Verification

- `openspec validate command-center-run-controls --strict`
- `pnpm check`
