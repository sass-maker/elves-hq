## ADDED Requirements

### Requirement: Retry budget guard

Elves HQ MUST stop repeated failed retry loops and require founder judgment once a room exhausts its retry budget.

#### Scenario: Founder retries within budget

- **WHEN** a room has fewer failed or killed attempts than the configured retry budget for the latest run mode
- **THEN** the daemon allows retry to start another run
- **AND** the retry decision is recorded as room context

#### Scenario: Founder retries after budget exhaustion

- **WHEN** a room has reached the configured failed/killed retry budget for the latest run mode
- **THEN** the daemon rejects the retry request
- **AND** the room is marked blocked with an actionable summary
- **AND** the room log records the budget guard
- **AND** no new run is started
