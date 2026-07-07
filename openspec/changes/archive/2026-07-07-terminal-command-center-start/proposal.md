# Terminal Command Center Start

## Why

The current cockpit opens as a dense operational dashboard. That exposes many useful controls, but it makes the first screen noisy and harder to understand at a glance. The founder wants the product to feel like a calm local command room: terminal panes for active elf rooms, one obvious intervention pane, and fewer visible CTAs.

## What Changes

- Make the default cockpit entry surface a dark terminal command center.
- Render room-backed terminal panes using real products, elves, statuses, logs, artifacts, asks, decisions, and runs.
- Keep a visually distinct intervention pane for rooms that need founder judgment.
- Preserve the existing room detail/control surface when a terminal pane is opened.

## Out Of Scope

- New daemon data model.
- New agent drivers.
- Real terminal emulation.
- Cloud, auth, Telegram, or production deploy paths.

## Verification

- `openspec validate terminal-command-center-start --strict`
- `pnpm check`
