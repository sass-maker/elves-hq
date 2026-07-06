# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Founder can answer elf asks in the room

The cockpit MUST let the founder answer an elf's open ask directly from the room and preserve that answer as context for later runs.

#### Scenario: Founder selects an ask option

- **WHEN** a room has an open elf ask with options
- **AND** the founder selects one option
- **THEN** the daemon records the selected answer as a founder decision
- **AND** the daemon records a room note containing the answer
- **AND** the open ask is cleared
- **AND** the room returns to an idle state for the next elf action

#### Scenario: Founder adds context while answering

- **WHEN** the founder has typed a room note draft
- **AND** the founder selects an ask option
- **THEN** the note context is stored with the selected answer
