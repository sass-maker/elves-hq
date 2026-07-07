# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Dark low-density cockpit overview

The task-room cockpit MUST default to a dark command-room layout with reduced overview density.

#### Scenario: Founder opens the cockpit

- **WHEN** the cockpit renders the task-room overview
- **THEN** it shows a dark interface with high-contrast status signals
- **AND** it limits visible overview cards so detailed evidence stays in the selected room workbench

### Requirement: Draggable pane resizing

The cockpit MUST resize desktop panes through draggable handles instead of visible range sliders.

#### Scenario: Founder drags a pane handle

- **WHEN** the founder drags a pane divider
- **THEN** the adjacent pane width updates within the allowed bounds
- **AND** the chosen layout is persisted locally
