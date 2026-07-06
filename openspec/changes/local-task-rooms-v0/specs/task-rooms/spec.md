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
