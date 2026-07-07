# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Command-center terminal run controls

Elves HQ MUST let the founder start or stop a room run directly from the command-center terminal pane without leaving the start screen. The task room and terminal are the same work surface.

#### Scenario: Founder starts a room from a terminal pane

- **WHEN** a task terminal has no active running run
- **THEN** the pane offers compact controls for read-only Codex, worktree Codex, and dry-run modes
- **AND** selecting one starts the corresponding existing room run mode
- **AND** captured output continues to appear in that terminal pane through the existing run-log polling

#### Scenario: Founder stops a running room from a terminal pane

- **WHEN** a task terminal has an active running run
- **THEN** the pane offers a stop control
- **AND** selecting it calls the existing run kill action for that room

#### Scenario: Founder needs deeper inspection

- **WHEN** the founder opens a terminal pane
- **THEN** the full terminal inspector/workbench remains available for gates, artifacts, notes, memory, and decisions
