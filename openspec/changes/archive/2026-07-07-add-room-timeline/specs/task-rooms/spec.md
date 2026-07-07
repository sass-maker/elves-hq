## ADDED Requirements

### Requirement: Selected room activity timeline

The selected room MUST expose a compact activity timeline built from existing room evidence.

#### Scenario: Founder opens a room with activity

- **WHEN** the selected room has asks, artifacts, decisions, notes, logs, or runs
- **THEN** the room workbench offers a Timeline tab
- **AND** the timeline shows recent meaningful events with source, tone, timestamp when available, and summary
- **AND** the detailed Logs tab remains available separately

#### Scenario: Founder opens a quiet room

- **WHEN** the selected room has no timeline evidence yet
- **THEN** the Timeline tab shows an empty state rather than fake progress
