# Playbooks Specification

## ADDED Requirements

### Requirement: Built-in local playbooks

Elves HQ MUST provide built-in reusable playbooks for common V0 workflows.

#### Scenario: Founder opens the workspace

- **WHEN** the cockpit loads workspace state
- **THEN** the workspace includes built-in playbooks
- **AND** each playbook defines steps, allowed tools, gates, escalation rules, and completion criteria

### Requirement: Room playbook selection

The founder MUST be able to assign a playbook to a room.

#### Scenario: Founder creates a room with a playbook

- **WHEN** the founder creates a room and selects a playbook
- **THEN** the daemon persists the selected playbook on the room
- **AND** the room detail shows the selected playbook

### Requirement: Playbook prompt injection

Generated run prompts MUST include the selected room playbook.

#### Scenario: Elf run starts in a playbook-backed room

- **WHEN** a room run starts for a room with a selected playbook
- **THEN** the captured run prompt includes the playbook steps, gates, escalation rules, and completion criteria
