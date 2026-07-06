# elves-hq - PROJECT STATUS

Last updated: 2026-07-06

## Why / What

Elves HQ is a local-first founder cockpit for running Codex elves across a product fleet. It replaces terminal babysitting with project-wise task rooms where elves work, ask for help, stream logs, produce artifacts, and wait for founder judgment before risky actions.

**Users:** Sarthak first: an AI-native founder/operator managing many local fleet repos with Codex and adjacent coding agents.

**IN scope for V0:** local product registry, project-wise task list, task rooms, elf assignment/status, room asks, logs, artifacts, decision actions, resizable room UI, tasteful elf workbench animation, local-only operation.

**OUT of scope for V0:** cloud hosting, auth, public API, widgets, billing, production deploys, Telegram, metrics integrations, marketing automation, feedback ingestion, multi-user workspaces, and generic multi-agent adapters.

## Dependencies

### External

- Node.js 22+
- pnpm
- Browser runtime for the local cockpit
- Built-in Node SQLite (`node:sqlite`)
- Planned: local Codex CLI and git worktrees

### Internal

- Fleet registry seed from `../saas-maker/foundry.projects.json`
- Fleet product conventions from `../AGENTS.md`
- Planned CodeVetter review gate from `../codevetter`

## Timeline

- 2026-07-06 - Project created as a fresh local-first replacement direction for SaaS Maker's original operating-cockpit ambition.
- 2026-07-06 - V0 OpenSpec change `local-task-rooms-v0` started.
- 2026-07-06 - Local daemon and root SQLite store added for persisted workspace/room data and room notes.

## Products

- Local cockpit: `apps/control-ui`
- Local daemon: `apps/local-daemon`
- Shared model package: `packages/core`

## Features (shipped)

- Initial V0 local cockpit scaffold with seeded project/task-room data.
- Local daemon exposes `GET /api/health`, `GET /api/workspace`, `POST /api/rooms/:id/notes`, `GET /api/rooms/:id/runs`, `POST /api/rooms/:id/runs/start`, and `POST /api/runs/:id/kill`.
- SQLite persistence stores projects, elves, tasks, rooms, logs, asks, artifacts, decisions, and notes in ignored local `data/elves.db`.
- Room runs support local dry runs and read-only Codex inspection, stream stdout/stderr into room logs, persist run records, support kill, and enforce a default runtime cap.
- Worktree-backed runs create isolated branches/worktrees under ignored `runs/<run-id>/worktree`, capture `git diff` patches to `runs/<run-id>/diff.patch`, and attach ready diff artifacts to the room.
- Write-capable Codex mode is available only inside isolated worktrees; it is not used for direct repo writes.
- Check gates run inside the isolated worktree, capture output to `runs/<run-id>/check.log`, and attach pass/fail test artifacts to the room.

## Todo / Planned / Deferred / Blocked

1. Wire product import from `../saas-maker/foundry.projects.json`.
2. Add retry controls that restart from the latest room context.
3. Add CodeVetter as a review gate after the room loop is useful.
4. Add cleanup controls for old worktrees once review is resolved.
5. Add a proper room/task creation flow instead of seeded rooms only.

### Deferred

- Telegram escalation.
- Product memory and playbooks.
- Metrics, feedback, marketing, and portfolio recommendation layers.
- Cloud sync or hosted SaaS mode.

### Blocked

- None.
