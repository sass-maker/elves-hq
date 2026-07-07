# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Slideable room deck

Elves HQ MUST let the founder navigate more room cards than fit in the compact room pane without hiding rooms behind a fixed truncation.

#### Scenario: Founder pages through rooms

- **WHEN** the filtered room list has more rooms than one deck page can show
- **THEN** the cockpit shows previous and next controls
- **AND** the founder can slide to later room pages without changing the selected product filter

#### Scenario: Founder opens a room from another surface

- **WHEN** the founder opens a room from Needs Me, Elf FM, or another room link
- **THEN** the room detail opens
- **AND** the room deck moves to the page containing that room when that room is in the filtered list
