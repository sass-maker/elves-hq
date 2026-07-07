# elves-hq - PROJECT STATUS

Last updated: 2026-07-07

## Why / What

Elves HQ is a local-first founder cockpit for running Codex elves across a product fleet. It replaces terminal babysitting with project-wise task rooms where elves work, ask for help, stream logs, produce artifacts, and wait for founder judgment before risky actions.

**Users:** Sarthak first: an AI-native founder/operator managing many local fleet repos with Codex and adjacent coding agents.

**IN scope for V0:** manual local product/folder registry, bounded local folder browser, local product removal, editable product settings, product-first Fleet Pulse, compact overview switcher, room signal filters and sorting, project-wise task backlog with lightweight task lifecycle, task rooms, active/all room deck filtering, slideable room deck, organized room output shelf, elf assignment/status, room asks, logs, artifacts, room activity timeline, captured run prompts, editable local product memory, built-in playbooks, decision actions, fix-request retry context, runtime/retry budget guards, approved diff apply, local daily brief, local Elf FM text stations, check gates, CodeVetter review gate adapter, generated worktree cleanup controls, draggable resizable room UI, tasteful elf workbench animation, local-only operation.

**OUT of scope for V0:** cloud hosting, auth, public API, widgets, billing, production deploys, Telegram, metrics integrations, marketing automation, feedback ingestion, multi-user workspaces, and generic multi-agent adapters.

## Dependencies

### External

- Node.js 22+
- pnpm
- Browser runtime for the local cockpit
- Built-in Node SQLite (`node:sqlite`)
- Planned: local Codex CLI and git worktrees

### Internal

- Manual local product folders added through the cockpit or `POST /api/products`
- Fleet product conventions from `../AGENTS.md`
- CodeVetter review gate adapter. Use `CODEVETTER_COMMAND` for an external CLI; otherwise the daemon falls back to a deterministic local diff scan until the desktop review engine exposes a stable CLI.

## Timeline

- 2026-07-06 - Project created as a fresh local-first replacement direction for SaaS Maker's original operating-cockpit ambition.
- 2026-07-06 - V0 OpenSpec change `local-task-rooms-v0` started.
- 2026-07-06 - Local daemon and root SQLite store added for persisted workspace/room data and room notes.
- 2026-07-07 - Task-room creation, bounded local folder browser, product-first Fleet Pulse, compact overview switcher, room signal filters and sorting, active/all room deck filtering, slideable room deck, organized room output shelf, project-wise task backlog with inbox/ready/assigned/done/killed lifecycle, explicit elf assignment, run launch preflight guards, isolated worktree runs, interrupted-run recovery, diff capture, approved diff apply, captured prompts, editable local product settings and memory, local product removal, built-in playbooks, structured elf asks and founder answers, focused room mode, room workbench tabs with activity timeline, room transcripts, fix-request retry context, runtime/retry budget guards, local Daily Brief with Markdown export, local Elf FM text stations, check gates, CodeVetter gate adapter, generated worktree cleanup, visible room gate checklist, persistent draggable pane layout, manual local product folders with draft folder preview and folder health inspection, dark cockpit styling, a signal-backed Needs Me queue, founder decision actions, and approval guards for failed or missing gates landed in the local cockpit.

## Products

- Local cockpit: `apps/control-ui`
- Local daemon: `apps/local-daemon`
- Shared model package: `packages/core`

## Features (shipped)

- Initial V0 local cockpit scaffold with seeded project/task-room data.
- Local daemon exposes `GET /api/health`, `GET /api/workspace`, `GET /api/needs-me`, `GET /api/briefs/daily`, `GET /api/briefs/daily.md`, `GET /api/fm/feed`, `GET /api/folders`, `POST /api/products`, `POST /api/products/inspect-path`, `POST /api/products/:id/settings`, `POST /api/products/:id/remove`, `GET /api/products/:id/inspection`, `GET /api/products/:id/memory`, `POST /api/products/:id/memory/:section`, `POST /api/tasks`, `POST /api/tasks/:id/status`, `POST /api/tasks/:id/assign-room`, `POST /api/rooms`, `POST /api/rooms/:id/notes`, `POST /api/rooms/:id/decision`, `POST /api/rooms/:id/asks/:askId/answer`, `GET /api/rooms/:id/runs`, `POST /api/rooms/:id/runs/start`, `POST /api/rooms/:id/transcript`, `GET /api/rooms/:id/transcript`, `GET /api/runs/:id/prompt`, `POST /api/runs/:id/apply-diff`, and `POST /api/runs/:id/kill`.
- SQLite persistence stores projects, elves, tasks, rooms, logs, asks, artifacts, decisions, and notes in ignored local `data/elves.db`.
- Room runs support local dry runs and read-only Codex inspection, stream stdout/stderr into room logs, persist run records, support kill, and enforce a default runtime cap.
- Retry actions enforce a persisted failed/killed retry budget per room and latest run mode; exhausted rooms are marked blocked with an actionable log instead of starting another run.
- Non-dry room runs fail closed on preflight when the product folder is missing, is not a directory, or cannot support the requested worktree mode; blocked launches do not create run records.
- Daemon startup reconciles persisted `running` runs as interrupted failures with warning logs, so restarted local sessions do not show fake active work.
- Room-aware run prompts are captured to `runs/<run-id>/prompt.md` and include acceptance criteria, founder notes, prior decisions, artifacts, and recent logs.
- Room runs can open founder asks by emitting `ELF_ASK: {"question":"...","options":["..."],"recommendation":"..."}`; valid asks set the room to `asking` and surface in Needs Me.
- Founder can answer an elf ask from the room by selecting an option; the answer clears the ask, returns the room to idle, and is persisted as a decision plus room note for future run prompts.
- Selected rooms can expand into a focused room mode that hides the fleet sidebar and task-room list while preserving all room actions, asks, previews, notes, logs, artifacts, and memory.
- The task-room pane uses a slideable React room deck instead of fixed truncation, with previous/next controls that page through filtered room cards while keeping the selected room detail stable.
- The room deck defaults to Active so completed rooms do not crowd current work, and includes an All switch with counts for inspecting completed room history.
- The room deck can filter visible rooms by signal-backed chips for Needs Me, Working, Ready, Failed, Blocked, and Idle, then sort the organized set by priority signal, recent activity, or project name.
- Selected rooms organize detailed evidence into workbench tabs for Timeline, Logs, Artifacts, Notes, and Product Memory while keeping the core room status and actions visible.
- Opened room previews for prompts, transcripts, diffs, checks, CodeVetter reports, cleanup results, and applied diff results are grouped under the room workbench Outputs tab instead of appending standalone sections below the selected room.
- The room workbench opens on a compact Timeline tab that derives recent activity from asks, runs, artifacts, decisions, logs, and notes without adding fake progress or extra persistence.
- Room transcripts generate local Markdown under `runs/room-transcripts/<room-id>.md`, include task/room evidence, attach as room artifacts, and can be previewed from the cockpit.
- Product memory is stored as ignored local Markdown under `memory/<product-slug>/`, editable in the room cockpit, and injected into generated run prompts.
- Built-in playbooks provide reusable workflows for small features, bugs, failing tests, diff review, safe refactors, and daily briefs; selected playbooks are persisted on rooms and injected into prompts.
- Request-fix and retry actions can carry the room draft note, so founder fix context is persisted and injected into the next run prompt.
- Worktree-backed runs create isolated branches/worktrees under ignored `runs/<run-id>/worktree`, capture `git diff` patches to `runs/<run-id>/diff.patch`, and attach ready diff artifacts to the room.
- Write-capable Codex mode is available only inside isolated worktrees; it is not used for direct repo writes.
- Check gates run inside the isolated worktree, capture output to `runs/<run-id>/check.log`, attach pass/fail test artifacts to the room, and mark rooms failed when the current check gate fails.
- CodeVetter gate runs against captured worktree diffs, writes reports to `runs/<run-id>/codevetter.md`, attaches review artifacts, and marks rooms failed when blocking findings are detected.
- Room action panels show a visible gate checklist so founders can see whether Check and CodeVetter are waiting, required, passed, or failed before approving a diff.
- Founder approval is blocked while the room has an unresolved current failed test or review gate, or while a diff artifact is missing a passed check gate or passed CodeVetter review gate.
- Approved worktree diffs can be applied to a clean local product checkout after founder approval and passed gates; the daemon does not commit, push, deploy, or clean the generated worktree automatically.
- The cockpit defaults to a dark command-room UI, reduces the overview to high-signal panels, and keeps the Daily Brief collapsed until opened.
- Fleet Pulse shows product-first status rows in the sidebar, with dominant room signal, colored stripe, active/needs/room counts, and click-to-filter behavior derived from existing room state.
- The task-room pane uses a compact overview switcher so Needs Me, Elf FM, Backlog, and Daily Brief remain available with counts while only one overview panel is open at a time.
- The cockpit has draggable local pane resize handles for the fleet sidebar and task-room list, persists the chosen widths in browser storage, and supports reset to the default command-room layout.
- Worktree cleanup removes generated `runs/<run-id>/worktree` checkouts on demand, deletes daemon-created `elves/<room>/<run>` branches when Git considers them safely merged, and preserves captured diff, check, and review artifacts.
- Project-wise room creation is available from the cockpit and via `POST /api/rooms`, including explicit assigned elf selection.
- Project-wise task backlog is available from the cockpit and via `POST /api/tasks`; unassigned tasks can be assigned to elf rooms through `POST /api/tasks/:id/assign-room`.
- Backlog tasks have a lightweight local lifecycle (`inbox`, `ready`, `assigned`, `done`, `killed`); the cockpit can mark tasks ready, done, or killed, and assigned tasks leave the open backlog when they become rooms.
- Manual local project/folder registration is wired through the daemon and UI; the old visible fleet-registry import path has been removed.
- The add-project panel includes a daemon-backed local folder browser rooted at the fleet workspace so product folders can be selected manually without typing a path.
- Registered products can be removed from the local cockpit registry without deleting their folders on disk; removal clears linked local tasks, rooms, logs, asks, artifacts, decisions, notes, and run records from the workspace view.
- Registered products can be updated from the cockpit with status, priority, and current goal settings persisted in the local registry.
- The add-project panel previews folder health before saving, using read-only draft inspection that does not create product records.
- Product folder inspection shows whether the selected local path exists, is a directory, is a git repository, and which package-manager scripts can serve as gates before an elf run.
- Needs Me queue aggregates founder decisions from room asks, blocked/failed runs, failed gates, and ready artifacts via `GET /api/needs-me`.
- Daily Brief summarizes shipped, ready, blocked, failed, active, and recommended next actions from existing room signals via `GET /api/briefs/daily`.
- Daily Brief can be exported as Markdown via `GET /api/briefs/daily.md`, previewed in the cockpit, and copied when browser clipboard access is available.
- Elf FM exposes local station-style ambient awareness via `GET /api/fm/feed`, with an all-rooms mix, room stations, and transcript lines backed by asks, artifacts, decisions, logs, or status signals.
- Founder decision actions approve, request fix, reject, snooze, and retry rooms with persisted decision records and queue updates.

## Todo / Planned / Deferred / Blocked

1. Replace the local CodeVetter fallback scan with the full CodeVetter CLI once that interface is stable.

### Deferred

- Telegram escalation.
- Generated Elf FM audio narration.
- Metrics, feedback, marketing, and portfolio recommendation layers.
- Cloud sync or hosted SaaS mode.

### Blocked

- None.
