# daily-brief Specification

## Purpose
Define the local operating brief that summarizes artifact-backed room progress and recommended founder actions.
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

### Requirement: Daily Brief Markdown export

The system MUST let the founder export the current Daily Brief as Markdown.

#### Scenario: Founder requests Markdown brief from daemon

- **WHEN** the founder requests the current Daily Brief Markdown endpoint
- **THEN** the daemon returns Markdown containing totals, recommended next actions, and all Daily Brief sections

#### Scenario: Founder previews Markdown brief in cockpit

- **WHEN** the founder clicks the Daily Brief export action
- **THEN** the cockpit shows the Markdown brief preview
- **AND** the cockpit attempts to copy the Markdown brief to the clipboard when browser support is available

### Requirement: Daily Brief snapshots

Elves HQ MUST let the founder save the current Daily Brief as a durable local Markdown artifact.

#### Scenario: Founder saves a Daily Brief snapshot

- **WHEN** the founder saves the current Daily Brief
- **THEN** the daemon writes a Markdown snapshot to ignored local storage
- **AND** returns the snapshot path and Markdown preview

#### Scenario: Founder opens latest snapshot

- **WHEN** at least one Daily Brief snapshot exists
- **THEN** the daemon can return the latest saved Markdown snapshot
- **AND** the cockpit can preview it

#### Scenario: No snapshot exists

- **WHEN** the founder requests the latest snapshot before saving one
- **THEN** the daemon returns a not-found response instead of fabricating a snapshot

