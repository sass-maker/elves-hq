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

The UI runs on the local Vite URL printed by `pnpm dev:ui`. The local daemon defaults to `http://127.0.0.1:4327/` and stores local room data in `data/elves.db`. Room runs default to a 120 second runtime cap; override with `ELVES_HQ_RUN_TIMEOUT_MS`.

The add-project panel includes a local folder browser backed by the daemon. It lists child directories under the fleet root, lets you select a product folder without typing the path, and then reuses the existing read-only folder health preview before saving.

Worktree-backed runs create isolated git worktrees under `runs/<run-id>/worktree` and captured patches at `runs/<run-id>/diff.patch`. The `runs/` directory is local-only and ignored.

Check gates run inside the captured worktree, choose a package script by key (`check`, `typecheck`, `test`, or `build`), and write output to `runs/<run-id>/check.log`. The room UI offers detected gate scripts plus Auto, which lets the daemon pick the first supported gate.

CodeVetter gates run against captured worktree diffs and write reports to `runs/<run-id>/codevetter.md`. Set `CODEVETTER_COMMAND` to use an external reviewer command; `{diff}`, `{worktree}`, and `{output}` placeholders are supported. Without it, the daemon uses a deterministic local fallback scan for high-confidence diff risks such as hardcoded secrets, shell execution, raw HTML injection, dynamic code execution, and newly introduced network calls.

Worktree cleanup removes the generated `runs/<run-id>/worktree` checkout after review while preserving captured artifacts such as `diff.patch`, `check.log`, and `codevetter.md`.

Rooms can be created directly in the cockpit. Each room creates a task, assigns the default builder elf, stores acceptance criteria, and can then launch dry-run, read-only Codex, worktree dry-run, or worktree Codex modes.

Every room run captures its prompt at `runs/<run-id>/prompt.md`. Generated prompts include acceptance criteria, founder room notes, fix requests, prior decisions, artifacts, and recent logs so retries carry useful context instead of starting cold.

Each room also has a next-run instruction composer. Use it for tactical one-off guidance before pressing Dry, Read, Draft, or Build; the daemon embeds those instructions inside the generated run prompt and clears the draft after launch.

Product memory is stored as local Markdown under `memory/<product-slug>/` and ignored by git. The room cockpit can edit `PRODUCT.md`, `STRATEGY.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `DO_NOT_DO.md`, and `RECENT_LEARNINGS.md`; generated run prompts include those sections.

Built-in playbooks are available when creating a room. V0 includes Ship Small Feature, Fix Bug, Fix Failing Test, Review Diff, Refactor Safely, and Daily Brief. The selected playbook is shown in the room and injected into generated prompts with steps, tools, gates, escalation rules, and completion criteria.

The Needs Me queue is generated from room signals, not generic activity. It surfaces unresolved asks, blocked or failed runs, failed gates, and ready artifacts through the cockpit and `GET /api/needs-me`.

The Daily Brief is generated from stored room signals and groups work into shipped, ready, blocked, failed, active, and recommended next actions. It is visible in the cockpit and available at `GET /api/briefs/daily`.

Founder actions are persisted with each room. Approve/reject close the room, request-fix and snooze return it to idle, and retry starts a new run using the latest room run mode. A draft room note is sent with these actions when present, which makes request-fix and retry instructions available to the next run prompt.

## Checks

```bash
pnpm check
```

## Local API Notes

- `GET /api/runs/:id/prompt` returns the captured prompt for a run.
- `GET /api/briefs/daily` returns the current local Daily Brief.
- `GET /api/folders` lists child directories under the local fleet root for the add-project folder browser.
- `GET /api/products/:id/memory` returns local Product Memory Markdown sections.
- `POST /api/products/:id/memory/:section` saves a Product Memory section.
- `GET /api/workspace` includes built-in playbooks and each room's selected `playbookId`.
- `POST /api/runs/:id/codevetter` runs the CodeVetter gate for a completed worktree run.
- `GET /api/runs/:id/codevetter` returns the captured Markdown report.
- `POST /api/runs/:id/cleanup-worktree` removes the generated worktree for an inactive worktree run.

## Structure

```text
apps/control-ui   Vite + React local cockpit
apps/local-daemon Node + built-in SQLite local daemon
packages/core     shared task-room models and seed state
openspec/         feature specs and implementation tasks
```

## V0 Thesis

The first useful version should make it preferable to start work from Elves HQ instead of opening several terminals. The product is successful when a founder can pick a project, create a task room, assign an elf, see what is happening, answer asks, and review artifacts from one calm interface.
