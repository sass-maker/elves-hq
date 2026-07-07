# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Terminal command-center start screen

Elves HQ MUST open to a calm terminal command-center view that makes active rooms, stuck rooms, and founder-needed intervention understandable without exposing the full room control surface immediately.

#### Scenario: Founder opens the cockpit

- **WHEN** the cockpit has workspace data
- **THEN** the first screen shows a dark terminal command-center layout
- **AND** room panes are backed by existing room status, logs, artifacts, asks, decisions, and run records
- **AND** the screen avoids high-volume dashboard controls as the primary visual element

#### Scenario: A room needs founder intervention

- **WHEN** a room has an open decision, ask, blocked status, failed status, or ready review signal
- **THEN** the command center visually separates that room as an intervention pane
- **AND** the pane content explains the signal using existing room evidence

#### Scenario: Founder opens a terminal pane

- **WHEN** the founder opens a room terminal from the command center
- **THEN** the cockpit selects the room and product
- **AND** the founder can use the existing room detail controls, logs, artifacts, gates, notes, and memory
