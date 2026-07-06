# task-rooms Specification

## Purpose
Define local task-room behavior that turns elf output into founder-visible decisions without requiring the founder to watch raw logs.
## Requirements
### Requirement: Structured elf asks

The local daemon MUST convert explicit structured ask markers from room run output into unresolved room asks.

#### Scenario: Elf asks for founder judgment

- **WHEN** a room run outputs a complete line starting with `ELF_ASK:` followed by valid ask JSON
- **THEN** the daemon persists the ask in the room
- **AND** the room status becomes `asking`
- **AND** the Needs Me queue surfaces the ask with its question, options, and recommendation

#### Scenario: Elf prints an invalid ask marker

- **WHEN** a room run outputs an `ELF_ASK:` line with invalid JSON or missing fields
- **THEN** the daemon keeps the line as a normal log
- **AND** no room ask is created from that invalid marker

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

