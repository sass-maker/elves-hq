# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Founder-selected elf assignment

The cockpit MUST let the founder choose which elf is assigned when creating a room.

#### Scenario: Founder creates a room with a selected elf

- **WHEN** the founder creates a room and selects an available elf
- **THEN** the daemon persists that elf id on the room
- **AND** the room card and detail show the selected elf

#### Scenario: Founder does not change the default elf

- **WHEN** the founder opens the new-room form
- **THEN** the cockpit defaults the room to an available builder elf when one exists
