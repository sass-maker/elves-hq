# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Terminal drawer dashboard

Elves HQ MUST present V0 as a dashboard of task terminal drawers where Codex elves run across local projects.

#### Scenario: Founder scans terminal drawers

- **WHEN** the founder opens the command-center dashboard
- **THEN** each active task is represented as a terminal drawer
- **AND** each terminal drawer is color-coded from existing room/run/ask/gate state
- **AND** the terminal body prioritizes captured Codex or run output when available

#### Scenario: Founder focuses a terminal

- **WHEN** the founder expands a command-center terminal drawer
- **THEN** the cockpit shows that room as a large single terminal
- **AND** the terminal keeps captured output, instruction input, run controls, stop control, and ask answering behavior
- **AND** the full inspector/workbench remains available as a secondary action

#### Scenario: Founder switches while focused

- **WHEN** the founder selects another terminal from the focused view
- **THEN** the focused terminal changes to that room
- **AND** the selected room and product context update consistently

#### Scenario: Founder exits focus

- **WHEN** the founder exits focused terminal mode
- **THEN** the command center returns to the multi-terminal grid
- **AND** no run, ask, or instruction state is lost
