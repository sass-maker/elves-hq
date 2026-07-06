# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Interrupted run recovery

The local daemon MUST not leave persisted runs marked running when it starts without owning their child processes.

#### Scenario: Daemon starts with persisted running runs

- **WHEN** the daemon starts and finds a persisted room run with status `running`
- **THEN** it marks that run failed with no exit code
- **AND** it marks the room failed with an interruption summary
- **AND** it appends a room log entry explaining that the run was interrupted by daemon restart
- **AND** the room is eligible for the existing Needs Me failed-run queue
