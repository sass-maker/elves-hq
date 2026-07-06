# Design: Local Task Rooms V0

## Core Object

The room is the core unit. A room belongs to one product and one task. It contains elf status, log lines, asks, artifacts, decisions, and documentation.

## UI Layout

- Left pane: project list and fleet status counts.
- Middle pane: room board grouped by urgency/status.
- Right pane: selected room detail with task context, elf status, asks, logs, artifacts, and notes.
- Panes use browser-native resize affordances so the founder can reshape the workspace quickly.

## Status Model

Statuses are literal and artifact-backed:

- `working`: current run is producing logs or artifacts.
- `asking`: elf needs founder input.
- `blocked`: run cannot continue without external/context resolution.
- `failed`: run exited or repeated failure.
- `ready`: artifacts are ready for review.
- `done`: room was accepted or closed.
- `idle`: no active elf run.

## Visual Language

The UI can be charming, but it must stay operational. The elf animation is a status indicator, not proof of progress. Logs, asks, artifacts, and decisions remain the source of truth.

## Not In This Slice

- Real Codex process launch.
- SQLite persistence.
- Git worktree management.
- CodeVetter gate.
- Telegram.
- Hosted deployment.

