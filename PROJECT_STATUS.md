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
- Planned: local Codex CLI, git, SQLite

### Internal

- Fleet registry seed from `../saas-maker/foundry.projects.json`
- Fleet product conventions from `../AGENTS.md`
- Planned CodeVetter review gate from `../codevetter`

## Timeline

- 2026-07-06 - Project created as a fresh local-first replacement direction for SaaS Maker's original operating-cockpit ambition.
- 2026-07-06 - V0 OpenSpec change `local-task-rooms-v0` started.

## Products

- Local cockpit: `apps/control-ui`
- Shared model package: `packages/core`

## Features (shipped)

- Initial V0 local cockpit scaffold with seeded project/task-room data.

## Todo / Planned / Deferred / Blocked

1. Wire product import from `../saas-maker/foundry.projects.json`.
2. Add local SQLite persistence for projects, tasks, rooms, asks, decisions, logs, and artifacts.
3. Add local daemon for Codex process launch, log capture, git worktree creation, and kill/retry controls.
4. Add real changed-file, diff, and test-output artifact capture.
5. Add CodeVetter as a review gate after the room loop is useful.

### Deferred

- Telegram escalation.
- Product memory and playbooks.
- Metrics, feedback, marketing, and portfolio recommendation layers.
- Cloud sync or hosted SaaS mode.

### Blocked

- None.

