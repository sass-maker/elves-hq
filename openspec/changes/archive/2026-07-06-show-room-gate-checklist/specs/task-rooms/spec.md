# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Visible room gate checklist

The cockpit MUST show the current required gate state inside each room so the founder can understand approval readiness before acting.

#### Scenario: Diff room is missing gates

- **WHEN** a room has a diff artifact
- **AND** the room lacks a passed check artifact
- **AND** the room lacks a passed CodeVetter review artifact
- **THEN** the room detail shows both gates as missing or required
- **AND** the founder can still run the gates from the same action panel

#### Scenario: Diff room gates have results

- **WHEN** a room has a diff artifact
- **AND** a check or CodeVetter artifact exists
- **THEN** the room detail shows each gate as passed or failed based on the current artifact status
