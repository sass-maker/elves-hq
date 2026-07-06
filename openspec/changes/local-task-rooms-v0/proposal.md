# Change: Local Task Rooms V0

## Why

The product should replace terminal babysitting before it becomes another broad system of record. The founder needs one local interface that organizes work by product, opens task rooms, shows what each elf is doing, captures asks/logs/artifacts, and keeps review decisions visible.

## What Changes

- Create a local-only Elves HQ app scaffold.
- Model projects, tasks, rooms, elves, asks, logs, artifacts, and decisions.
- Build the first room-centered cockpit UI with resizable panes and seeded local state.
- Use elf terminology in user-facing surfaces while keeping operational states literal.
- Exclude cloud, auth, public API, Telegram, metrics, marketing, feedback automation, and production deploys from V0.

## How

- Use a pnpm workspace.
- Add `packages/core` for shared model types and V0 seed data.
- Add `apps/control-ui` as a Vite + React cockpit.
- Keep persistence in-memory/seeded for the first UI slice; local SQLite and daemon process control follow as separate tasks in this change.

## Impact

- New private fleet repo: `elves-hq`.
- No production deploy target.
- No secrets, cloud credentials, or production configs touched.

