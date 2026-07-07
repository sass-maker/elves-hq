# Daily Brief Specification Delta

## ADDED Requirements

### Requirement: Daily Brief snapshots

Elves HQ MUST let the founder save the current Daily Brief as a durable local Markdown artifact.

#### Scenario: Founder saves a Daily Brief snapshot

- **WHEN** the founder saves the current Daily Brief
- **THEN** the daemon writes a Markdown snapshot to ignored local storage
- **AND** returns the snapshot path and Markdown preview

#### Scenario: Founder opens latest snapshot

- **WHEN** at least one Daily Brief snapshot exists
- **THEN** the daemon can return the latest saved Markdown snapshot
- **AND** the cockpit can preview it

#### Scenario: No snapshot exists

- **WHEN** the founder requests the latest snapshot before saving one
- **THEN** the daemon returns a not-found response instead of fabricating a snapshot
