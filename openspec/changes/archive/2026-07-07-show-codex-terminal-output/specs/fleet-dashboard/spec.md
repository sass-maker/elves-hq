# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Command-center terminals show captured run output

Elves HQ MUST make command-center terminal panes show the latest captured Codex or run output when available.

#### Scenario: A room has a captured run log

- **WHEN** a command-center room has a latest run with a captured log file
- **THEN** its terminal pane renders that captured stdout/stderr output as the primary body
- **AND** room summaries, artifacts, asks, and decisions are secondary fallback content

#### Scenario: A room has no captured run log

- **WHEN** a command-center room has no latest captured run log
- **THEN** its terminal pane may show room-level logs and evidence
- **AND** the pane must not imply live Codex output exists
