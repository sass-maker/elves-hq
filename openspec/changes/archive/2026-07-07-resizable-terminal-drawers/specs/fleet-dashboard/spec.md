# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Resizable terminal drawers

Elves HQ MUST let the founder resize command-center terminal drawers while preserving a calm aligned dashboard.

#### Scenario: Founder resizes a terminal drawer

- **WHEN** the founder drags a terminal drawer resize handle
- **THEN** the drawer changes width and height within the dashboard grid
- **AND** the drawer remains aligned to the terminal dashboard rather than overlapping other drawers
- **AND** captured output, terminal controls, ask options, and color state remain available

#### Scenario: Founder returns to the dashboard

- **WHEN** the founder reloads or revisits the command-center dashboard
- **THEN** previously resized terminal drawer dimensions are restored locally
- **AND** invalid stored dimensions are clamped to usable bounds

#### Scenario: Founder focuses a terminal

- **WHEN** the founder enters focused terminal mode
- **THEN** the focused terminal uses the focused layout
- **AND** the multi-terminal drawer sizes remain available when focus exits
