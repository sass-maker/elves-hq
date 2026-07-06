# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Room transcripts

The local daemon MUST be able to generate a durable Markdown transcript for a room.

#### Scenario: Founder generates a room transcript

- **WHEN** the founder requests a transcript for a room
- **THEN** the daemon writes a Markdown transcript to local ignored storage
- **AND** the transcript includes the room's product, task, status, asks, notes, decisions, artifacts, runs, and logs
- **AND** the room gets an artifact that points to the transcript path
- **AND** the cockpit can preview the generated transcript

#### Scenario: Founder opens the latest transcript

- **WHEN** a transcript has already been generated for a room
- **THEN** the daemon can return the latest transcript without regenerating it
