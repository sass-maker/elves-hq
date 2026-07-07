# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Next-run instruction composer

Elves HQ MUST let the founder provide tactical instructions for the next elf run from inside a task room.

#### Scenario: Founder starts a run with instructions

- **WHEN** the founder enters next-run instructions in a room
- **AND** starts a Dry, Read, Draft, or Build run
- **THEN** the cockpit sends those instructions as the run prompt
- **AND** the daemon captures the prompt artifact for that run

#### Scenario: Run starts successfully

- **WHEN** the daemon accepts the start-run request
- **THEN** the cockpit clears the next-run instruction draft for that room

#### Scenario: Founder uses durable notes separately

- **WHEN** the founder wants context to persist beyond the next run
- **THEN** room notes remain available as a separate durable context surface
