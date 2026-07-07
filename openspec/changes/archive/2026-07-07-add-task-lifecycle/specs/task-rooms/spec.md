# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Backlog task lifecycle

Elves HQ MUST let the founder triage product backlog tasks without turning every task into a room.

#### Scenario: Founder marks a backlog task ready

- **WHEN** the founder marks an inbox task as ready
- **THEN** the daemon persists the task status as `ready`
- **AND** the task remains visible in the selected product backlog

#### Scenario: Founder closes a backlog task

- **WHEN** the founder marks a backlog task done or killed
- **THEN** the daemon persists that terminal status
- **AND** the task leaves the open backlog list

#### Scenario: Founder assigns a backlog task to an elf room

- **WHEN** the founder assigns a backlog task to a room
- **THEN** the daemon marks the task status as `assigned`
- **AND** the task leaves the open backlog list
- **AND** the created room remains linked to that task
