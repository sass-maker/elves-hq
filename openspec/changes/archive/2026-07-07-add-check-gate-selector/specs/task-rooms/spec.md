# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Check gate script selection

Elves HQ MUST let the founder choose which detected package script is used for a room check gate.

#### Scenario: Founder selects a check gate

- **WHEN** product folder inspection detects gate scripts
- **THEN** the room action panel offers those gate scripts as check choices
- **AND** the founder can choose a specific script or Auto

#### Scenario: Founder runs selected gate

- **WHEN** the founder clicks Check with a specific gate selected
- **THEN** the cockpit sends that script key to the daemon check endpoint

#### Scenario: Founder leaves gate on Auto

- **WHEN** the founder clicks Check with Auto selected
- **THEN** the cockpit omits a script key
- **AND** the daemon chooses the first available supported gate
