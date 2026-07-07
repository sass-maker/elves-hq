# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Active room deck filter

Elves HQ MUST keep completed rooms out of the default room deck while preserving access to room history.

#### Scenario: Founder opens the task-room pane

- **WHEN** the room deck is in its default Active scope
- **THEN** rooms with status `done` are hidden from the room deck
- **AND** active, blocked, failed, asking, ready, working, and idle rooms remain visible

#### Scenario: Founder switches to all rooms

- **WHEN** the founder switches the room deck to All
- **THEN** the room deck includes done rooms for the selected product filter
- **AND** the room detail can open a done room
