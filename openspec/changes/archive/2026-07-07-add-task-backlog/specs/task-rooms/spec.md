# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Product task backlog

Elves HQ MUST let the founder create product-scoped tasks before assigning them to an elf room.

#### Scenario: Founder creates a backlog task

- **WHEN** the founder creates a task for a selected product with acceptance criteria
- **THEN** the daemon persists the task without requiring an elf run
- **AND** the cockpit shows the task in the selected product backlog

### Requirement: Assign backlog task to elf room

Elves HQ MUST let the founder assign an existing backlog task to an elf room.

#### Scenario: Founder assigns a task to an elf

- **WHEN** the founder assigns an unassigned task to an elf
- **THEN** the daemon creates a room linked to that task
- **AND** the task no longer appears in the unassigned backlog
- **AND** the room appears in the task-room list for that product
