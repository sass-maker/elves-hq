# task-rooms delta

## Modified Requirements

### Requirement: Founder decision actions

The cockpit MUST let the founder resolve surfaced decisions without editing the database manually.

#### Scenario: Founder closes a stale room

- **WHEN** the founder closes a room
- **THEN** the daemon persists a low-risk closed decision record
- **AND** any open asks for that room are cleared
- **AND** the room status becomes `done`
- **AND** the room log records that the founder closed the room
- **AND** the room leaves the active room deck by default
