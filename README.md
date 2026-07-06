# Elves HQ

Founder-controlled local cockpit for running Codex elves across a product fleet.

Elves HQ starts as a local task-room console:

- organize work by project
- create task rooms
- assign rooms to elves
- watch room status, logs, asks, and artifacts
- help an elf from inside the room
- review output before anything risky happens

V0 is intentionally local-only. There is no auth, cloud API, widget layer, billing, production deploy, or generic SaaS platform surface.

## Local Dev

Run the daemon and UI in two terminals:

```bash
pnpm install
pnpm dev:daemon
pnpm dev:ui
```

The UI runs on `http://127.0.0.1:5177/`. The local daemon runs on `http://127.0.0.1:4327/` and stores local room data in `data/elves.db`. Room runs default to a 120 second runtime cap; override with `ELVES_HQ_RUN_TIMEOUT_MS`.

Worktree-backed runs create isolated git worktrees under `runs/<run-id>/worktree` and captured patches at `runs/<run-id>/diff.patch`. The `runs/` directory is local-only and ignored.

Check gates run inside the captured worktree, choose a package script by key (`typecheck` in the UI today), and write output to `runs/<run-id>/check.log`.

Rooms can be created directly in the cockpit. Each room creates a task, assigns the default builder elf, stores acceptance criteria, and can then launch dry-run, read-only Codex, worktree dry-run, or worktree Codex modes.

The Needs Me queue is generated from room signals, not generic activity. It surfaces unresolved asks, blocked or failed runs, failed gates, and ready artifacts through the cockpit and `GET /api/needs-me`.

## Checks

```bash
pnpm check
```

## Structure

```text
apps/control-ui   Vite + React local cockpit
apps/local-daemon Node + built-in SQLite local daemon
packages/core     shared task-room models and seed state
openspec/         feature specs and implementation tasks
```

## V0 Thesis

The first useful version should make it preferable to start work from Elves HQ instead of opening several terminals. The product is successful when a founder can pick a project, create a task room, assign an elf, see what is happening, answer asks, and review artifacts from one calm interface.
