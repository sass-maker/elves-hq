# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Focused selected-room mode

The cockpit MUST let the founder expand the selected task room into a focused view and return to the normal three-pane cockpit.

#### Scenario: Founder enters focused room mode

- **WHEN** the founder activates the selected room expand control
- **THEN** the selected room occupies the main cockpit view
- **AND** the fleet sidebar and task-room list are hidden
- **AND** room actions, asks, previews, notes, artifacts, logs, and memory remain available

#### Scenario: Founder exits focused room mode

- **WHEN** the founder activates the focused room exit control
- **THEN** the cockpit restores the normal fleet, room-list, and selected-room panes
- **AND** the previously selected room remains selected
