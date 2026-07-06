# Daily Brief Specification

## Requirements

### Requirement: Local daily brief

Elves HQ MUST expose a local daily brief computed from current workspace signals.

#### Scenario: Founder opens the daily brief

- **WHEN** the local workspace has rooms, decisions, asks, artifacts, and runs
- **THEN** the daemon returns a daily brief grouped by shipped, ready, blocked, failed, active, and recommended next actions
- **AND** every brief item references a concrete room

### Requirement: Artifact-backed summary

Daily brief entries MUST be backed by stored room signals rather than generic activity text.

#### Scenario: Brief includes a ready item

- **WHEN** a room has ready or passed artifacts
- **THEN** the brief item includes evidence from those artifacts

### Requirement: Cockpit brief panel

The cockpit MUST show the daily brief in the main local interface.

#### Scenario: Founder selects a brief item

- **WHEN** the founder clicks a brief item
- **THEN** the cockpit opens the referenced room
