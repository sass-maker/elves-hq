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
- [ ] Add Codex launch/log capture to local daemon.
- [ ] Add git worktree and diff artifact capture.
- [ ] Add test/check gate execution.

## Verification

- [x] `pnpm install`
- [x] `pnpm check`
- [x] `GET /api/health`
- [x] `GET /api/workspace`
- [x] `POST /api/rooms/:id/notes`
- [x] `POST /api/import/fleet-registry`
- [x] Browser smoke of local cockpit
