# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Tabbed selected-room workbench

The selected room MUST organize detailed room evidence into switchable tabs so the founder can inspect logs, artifacts, notes, and memory without scrolling through every section.

#### Scenario: Founder switches room workbench tabs

- **WHEN** the founder opens a selected room
- **THEN** the room shows tabs for Logs, Artifacts, Notes, and Memory
- **AND** selecting each tab shows the corresponding room evidence
- **AND** the room's primary status, ask, acceptance, gates, and actions remain visible above the tabs

#### Scenario: Founder opens generated previews

- **WHEN** the founder opens a prompt, diff, check output, CodeVetter report, cleanup result, or transcript
- **THEN** the generated preview remains visible below the tabbed workbench
