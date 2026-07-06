## Shared Fleet Standard

Also read and follow the shared fleet-level agent standard at `../AGENTS.md`. Treat this repository as owned product code: protect production stability, keep changes scoped, verify work, and record durable follow-up tasks when something remains incomplete or blocked.

## Project

- **Purpose**: Elves HQ is a local-first control room for running Codex elves across the fleet.
- **Stack**: pnpm workspace, Vite + React cockpit, TypeScript core package. Local daemon and SQLite persistence are planned next.
- **Local dev**: `pnpm install`, then `pnpm dev`.
- **Checks**: `pnpm check`.
- **Deploy**: none for V0. This project is local-only until it earns daily use.

## Product Rules

- Use elf terminology in user-facing product surfaces.
- Keep operational/debug labels literal: runs, rooms, logs, artifacts, gates, decisions.
- The room is the core object. A room represents one task for one product with one or more elf attempts, logs, asks, artifacts, and decisions.
- Do not add cloud, auth, public API, widgets, billing, or production deploy paths to V0.
- Do not let cute UI imply fake progress. Every status should map to logs, artifacts, decisions, or explicit simulated seed data.

