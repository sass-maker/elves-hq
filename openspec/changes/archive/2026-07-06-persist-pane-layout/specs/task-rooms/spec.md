# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Persistent cockpit pane layout

The cockpit MUST let the founder adjust the relative size of the fleet, task-room list, and selected-room panes and keep the chosen layout across reloads.

#### Scenario: Founder adjusts pane widths

- **WHEN** the founder changes the fleet or room-list pane size
- **THEN** the cockpit updates the three-pane grid without losing selected product or room state
- **AND** the selected-room pane remains usable

#### Scenario: Founder reloads the cockpit

- **WHEN** the founder has adjusted the pane layout
- **AND** the page is reloaded
- **THEN** the cockpit restores the saved pane widths

#### Scenario: Founder resets layout

- **WHEN** the founder chooses reset layout
- **THEN** the cockpit returns to the default pane widths
