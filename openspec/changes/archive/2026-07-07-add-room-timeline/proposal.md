# Add Room Timeline

## Why

Task rooms currently hold the right evidence, but the founder still has to scan separate runs, logs, asks, artifacts, decisions, and notes to understand what happened. V0 needs rooms to feel like live workspaces: a quick glance should reveal the latest meaningful activity without becoming a noisy feed.

## What Changes

- Add a compact Activity timeline to the selected room workbench.
- Build timeline items from existing room evidence: asks, artifacts, decisions, notes, logs, and recent runs.
- Keep logs as a separate detailed tab; the timeline is a curated overview of recent meaningful events.

## Out Of Scope

- New persistence tables.
- Cross-room global activity feed.
- Notifications or Telegram.
- Infinite history or full audit export.

## Verification

- `openspec validate add-room-timeline --strict`
- `pnpm check`
- Live daemon/UI smoke
