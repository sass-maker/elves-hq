# Task Rooms Specification

## Requirements

### Requirement: Project-wise room organization

Elves HQ MUST organize work by product, then task room.

#### Scenario: Founder selects a product

- **WHEN** the founder selects a project
- **THEN** the room board filters to rooms for that project
- **AND** the selected room detail remains visible when applicable

### Requirement: Room status visibility

Each room MUST expose one literal status from `working`, `asking`, `blocked`, `failed`, `ready`, `done`, or `idle`.

#### Scenario: Elf asks for help

- **WHEN** a room has an unresolved ask
- **THEN** the room status is visible as founder attention needed
- **AND** the room detail shows the ask, options, and response action

### Requirement: Artifact-backed progress

Room progress MUST be represented by concrete logs, artifacts, asks, or decisions.

#### Scenario: Room appears ready

- **WHEN** a room is marked ready
- **THEN** the room detail shows artifacts or gate output that explain what is ready for review

### Requirement: Local-first V0

The V0 cockpit MUST run locally without cloud auth or hosted API dependencies.

#### Scenario: Founder starts local UI

- **WHEN** the founder runs the local dev command
- **THEN** the cockpit opens with seeded local data
- **AND** no cloud credentials are required

### Requirement: Local room persistence

The V0 cockpit MUST persist room data in a local store owned by the repository checkout.

#### Scenario: Founder adds a room note

- **WHEN** the founder saves a note in a room
- **THEN** the local daemon persists it to the local SQLite database
- **AND** the updated room is returned to the cockpit

### Requirement: Room run control

The V0 daemon MUST be able to start, log, persist, and stop room-scoped runs.

#### Scenario: Founder starts a dry run

- **WHEN** the founder starts a dry run from a room
- **THEN** the daemon creates a run record
- **AND** process output is appended to the room logs
- **AND** the room status updates from working to ready, failed, blocked, or killed when the process exits

#### Scenario: Founder starts read-only Codex

- **WHEN** the founder starts a read-only Codex inspection
- **THEN** the daemon launches `codex exec` with read-only sandboxing
- **AND** Codex output is appended to room logs
- **AND** the daemon can stop the process if the founder kills it or it exceeds the runtime cap

#### Scenario: Founder starts a worktree-backed run

- **WHEN** the founder starts a worktree-backed room run
- **THEN** the daemon creates an isolated git worktree and branch for the run
- **AND** process output is appended to room logs
- **AND** any resulting diff is captured as a room artifact
- **AND** the original product checkout remains clean

#### Scenario: Founder opens a captured diff

- **WHEN** a worktree run has captured a diff
- **THEN** the daemon can return the patch for preview in the room
