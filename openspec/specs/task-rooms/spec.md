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
