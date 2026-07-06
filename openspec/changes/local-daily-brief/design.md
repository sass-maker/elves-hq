# Design: Local Daily Brief

## Source Of Truth

The brief is computed from the local SQLite workspace state. It does not infer progress from agent optimism. Entries must be backed by rooms, artifacts, asks, decisions, or runs already stored by the daemon.

## Grouping

- `shipped`: rooms with `done` status and approved decisions.
- `ready`: rooms with ready/passed artifacts or `ready` status.
- `blocked`: rooms with unresolved asks or `blocked` status.
- `failed`: rooms with failed status or failed artifacts.
- `active`: rooms currently working.
- `recommendedNext`: the highest-value next founder actions, derived from Needs Me items first.

## UI

The cockpit shows the brief as a compact operational panel near the Needs Me queue. It should be scannable, not a marketing report. Each row links back to the room by selecting it.

## Limits

The first version is a live computed brief, not a scheduled archive. Persistence can come later once the daily operating loop proves useful.
