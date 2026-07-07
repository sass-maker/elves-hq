# elf-fm Specification

## Purpose
Define the local station-style feed that gives the founder ambient, artifact-backed awareness of active elf rooms.
## Requirements
### Requirement: Local Elf FM feed

Elves HQ MUST expose a local Elf FM feed derived from current task-room signals.

#### Scenario: Founder requests the FM feed

- **WHEN** the founder requests the local FM feed endpoint
- **THEN** the daemon returns a global station, room stations, and transcript items
- **AND** each transcript item references a room, product, and evidence source type

### Requirement: Cockpit Elf FM panel

The cockpit MUST show Elf FM as an ambient awareness panel.

#### Scenario: Founder scans current stations

- **WHEN** the cockpit renders the FM panel
- **THEN** the founder can see the global mix, room stations, and recent transcript lines without opening a terminal log
