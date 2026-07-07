# Add Elf FM

## Why

AgentFM points at a useful interaction pattern for Elves HQ: ambient awareness without terminal babysitting. The founder should be able to glance at a station-style feed that says what rooms are live, blocked, ready, or asking, backed by the same room artifacts and decisions as the rest of the cockpit.

## What Changes

- Add a local Elf FM feed computed from current task-room signals.
- Expose a daemon endpoint for station data and transcript items.
- Add a cockpit panel that shows an all-rooms station, per-room stations, and a compact live transcript.
- Keep V0 text-first and local-only; audio narration can layer on the same feed later.

## Out Of Scope

- Generated audio or text-to-speech playback.
- Cloud streaming.
- Public sharing.
- Agent personality theater or synthetic progress.
