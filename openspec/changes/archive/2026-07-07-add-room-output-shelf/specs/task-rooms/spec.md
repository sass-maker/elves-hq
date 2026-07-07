# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Room output shelf

Elves HQ MUST organize opened room outputs in one workbench surface instead of appending every preview to the selected room page.

#### Scenario: Founder opens room output

- **WHEN** the founder opens a prompt, transcript, diff, check output, CodeVetter report, cleanup result, or apply result
- **THEN** the cockpit keeps that output available in the room workbench Outputs tab
- **AND** the selected room page does not add another standalone preview section below the workbench

#### Scenario: No outputs are open

- **WHEN** the room has no opened output previews
- **THEN** the Outputs tab shows a quiet empty state
