# Tasks

- [x] Create new fleet repo and local project scaffold.
- [x] Add OpenSpec change for V0 task rooms.
- [x] Add shared TypeScript room/task/status models.
- [x] Add seeded V0 project and room data.
- [x] Build first room-centered cockpit UI.
- [x] Add resizable panes and tasteful elf workbench status animation.
- [x] Add local daemon API for workspace and room notes.
- [x] Add local SQLite persistence for projects, elves, tasks, rooms, asks, decisions, logs, artifacts, and notes.
- [x] Wire local product import from `../saas-maker/foundry.projects.json`.
- [x] Add dry-run launch/log capture to local daemon.
- [x] Add read-only Codex launch/log capture to local daemon.
- [x] Add run kill endpoint and default runtime cap.
- [x] Add git worktree and diff artifact capture.
- [x] Add worktree-scoped Codex write mode.
- [x] Add test/check gate execution.

## Verification

- [x] `pnpm install`
- [x] `pnpm check`
- [x] `GET /api/health`
- [x] `GET /api/workspace`
- [x] `POST /api/rooms/:id/notes`
- [x] `POST /api/import/fleet-registry`
- [x] `POST /api/rooms/:id/runs/start` dry run
- [x] `POST /api/rooms/:id/runs/start` read-only Codex start
- [x] `POST /api/runs/:id/kill`
- [x] `POST /api/rooms/:id/runs/start` worktree dry run
- [x] `GET /api/runs/:id/diff`
- [x] `POST /api/runs/:id/check`
- [x] `GET /api/runs/:id/check-output`
- [x] Browser smoke of local cockpit
