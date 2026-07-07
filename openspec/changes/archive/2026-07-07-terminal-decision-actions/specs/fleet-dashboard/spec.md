# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Terminal-level decision actions

Elves HQ MUST let the founder take common decision actions from a terminal drawer when that drawer needs founder judgment.

#### Scenario: Ready terminal drawer

- **WHEN** a terminal drawer has a ready review decision
- **THEN** the drawer exposes compact approve and request-fix actions
- **AND** those actions use the existing room decision action path

#### Scenario: Failed or blocked terminal drawer

- **WHEN** a terminal drawer has a failed or blocked decision
- **THEN** the drawer exposes compact retry, request-fix, or reject actions where available
- **AND** the full workbench remains available for inspection

#### Scenario: Ask takes priority

- **WHEN** a terminal drawer has an unresolved elf ask
- **THEN** ask-answer options remain the primary terminal footer actions
- **AND** generic decision buttons do not replace the ask options
