# elves-hq - PROJECT STATUS

Last updated: 2026-07-07

## Why / What

Elves HQ is a local-first founder cockpit for running Codex elves across a product fleet. It replaces terminal babysitting with project-wise task rooms where elves work, ask for help, stream logs, produce artifacts, and wait for founder judgment before risky actions.

**Users:** Sarthak first: an AI-native founder/operator managing many local fleet repos with Codex and adjacent coding agents.

**IN scope for V0:** local product registry, project-wise task list, task rooms, elf assignment/status, room asks, logs, artifacts, captured run prompts, editable local product memory, built-in playbooks, decision actions, fix-request retry context, local daily brief, check gates, CodeVetter review gate adapter, generated worktree cleanup controls, resizable room UI, tasteful elf workbench animation, local-only operation.

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
- CodeVetter review gate adapter. Use `CODEVETTER_COMMAND` for an external CLI; otherwise the daemon falls back to a deterministic local diff scan until the desktop review engine exposes a stable CLI.

## Timeline

- 2026-07-06 - Project created as a fresh local-first replacement direction for SaaS Maker's original operating-cockpit ambition.
- 2026-07-06 - V0 OpenSpec change `local-task-rooms-v0` started.
- 2026-07-06 - Local daemon and root SQLite store added for persisted workspace/room data and room notes.
- 2026-07-07 - Task-room creation, explicit elf assignment, isolated worktree runs, interrupted-run recovery, diff capture, captured prompts, editable local product memory, built-in playbooks, structured elf asks, room transcripts, fix-request retry context, local Daily Brief, check gates, CodeVetter gate adapter, generated worktree cleanup, a signal-backed Needs Me queue, founder decision actions, and blocking-gate approval guards landed in the local cockpit.

## Products

- Local cockpit: `apps/control-ui`
- Local daemon: `apps/local-daemon`
- Shared model package: `packages/core`

## Features (shipped)

- Initial V0 local cockpit scaffold with seeded project/task-room data.
- Local daemon exposes `GET /api/health`, `GET /api/workspace`, `GET /api/needs-me`, `GET /api/briefs/daily`, `GET /api/products/:id/memory`, `POST /api/products/:id/memory/:section`, `POST /api/rooms`, `POST /api/rooms/:id/notes`, `POST /api/rooms/:id/decision`, `GET /api/rooms/:id/runs`, `POST /api/rooms/:id/runs/start`, `POST /api/rooms/:id/transcript`, `GET /api/rooms/:id/transcript`, `GET /api/runs/:id/prompt`, and `POST /api/runs/:id/kill`.
- SQLite persistence stores projects, elves, tasks, rooms, logs, asks, artifacts, decisions, and notes in ignored local `data/elves.db`.
- Room runs support local dry runs and read-only Codex inspection, stream stdout/stderr into room logs, persist run records, support kill, and enforce a default runtime cap.
- Daemon startup reconciles persisted `running` runs as interrupted failures with warning logs, so restarted local sessions do not show fake active work.
- Room-aware run prompts are captured to `runs/<run-id>/prompt.md` and include acceptance criteria, founder notes, prior decisions, artifacts, and recent logs.
- Room runs can open founder asks by emitting `ELF_ASK: {"question":"...","options":["..."],"recommendation":"..."}`; valid asks set the room to `asking` and surface in Needs Me.
- Room transcripts generate local Markdown under `runs/room-transcripts/<room-id>.md`, include task/room evidence, attach as room artifacts, and can be previewed from the cockpit.
- Product memory is stored as ignored local Markdown under `memory/<product-slug>/`, editable in the room cockpit, and injected into generated run prompts.
- Built-in playbooks provide reusable workflows for small features, bugs, failing tests, diff review, safe refactors, and daily briefs; selected playbooks are persisted on rooms and injected into prompts.
- Request-fix and retry actions can carry the room draft note, so founder fix context is persisted and injected into the next run prompt.
- Worktree-backed runs create isolated branches/worktrees under ignored `runs/<run-id>/worktree`, capture `git diff` patches to `runs/<run-id>/diff.patch`, and attach ready diff artifacts to the room.
- Write-capable Codex mode is available only inside isolated worktrees; it is not used for direct repo writes.
- Check gates run inside the isolated worktree, capture output to `runs/<run-id>/check.log`, attach pass/fail test artifacts to the room, and mark rooms failed when the current check gate fails.
- CodeVetter gate runs against captured worktree diffs, writes reports to `runs/<run-id>/codevetter.md`, attaches review artifacts, and marks rooms failed when blocking findings are detected.
- Founder approval is blocked while the room has an unresolved current failed test or review gate.
- Worktree cleanup removes generated `runs/<run-id>/worktree` checkouts on demand, deletes daemon-created `elves/<room>/<run>` branches when Git considers them safely merged, and preserves captured diff, check, and review artifacts.
- Project-wise room creation is available from the cockpit and via `POST /api/rooms`, including explicit assigned elf selection.
- Fleet registry import from `../saas-maker/foundry.projects.json` is wired through the daemon and UI.
- Needs Me queue aggregates founder decisions from room asks, blocked/failed runs, failed gates, and ready artifacts via `GET /api/needs-me`.
- Daily Brief summarizes shipped, ready, blocked, failed, active, and recommended next actions from existing room signals via `GET /api/briefs/daily`.
- Founder decision actions approve, request fix, reject, snooze, and retry rooms with persisted decision records and queue updates.

## Todo / Planned / Deferred / Blocked

1. Replace the local CodeVetter fallback scan with the full CodeVetter CLI once that interface is stable.

### Deferred

- Telegram escalation.
- Metrics, feedback, marketing, and portfolio recommendation layers.
- Cloud sync or hosted SaaS mode.

### Blocked

- None.
