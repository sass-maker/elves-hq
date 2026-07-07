# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Dashboard terminal creation

Elves HQ MUST let the founder create a new Codex terminal drawer directly from the command-center dashboard.

#### Scenario: Founder opens terminal creation

- **WHEN** the founder opens the dashboard terminal creation panel
- **THEN** the dashboard shows compact fields for project, terminal title, elf, playbook, and optional acceptance criteria
- **AND** the panel does not replace the terminal dashboard with a different workflow

#### Scenario: Founder creates a terminal drawer

- **WHEN** the founder submits a valid terminal title and project
- **THEN** the cockpit creates a room through the existing room creation path
- **AND** the new room appears as a terminal drawer
- **AND** the new room becomes the selected terminal context

#### Scenario: Founder keeps working

- **WHEN** terminal creation succeeds
- **THEN** existing terminal drawers, terminal layouts, focused terminal mode, and run controls remain available
