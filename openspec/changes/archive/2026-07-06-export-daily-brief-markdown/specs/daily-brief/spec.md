# Daily Brief Specification Delta

## ADDED Requirements

### Requirement: Daily Brief Markdown export

The system MUST let the founder export the current Daily Brief as Markdown.

#### Scenario: Founder requests Markdown brief from daemon

- **WHEN** the founder requests the current Daily Brief Markdown endpoint
- **THEN** the daemon returns Markdown containing totals, recommended next actions, and all Daily Brief sections

#### Scenario: Founder previews Markdown brief in cockpit

- **WHEN** the founder clicks the Daily Brief export action
- **THEN** the cockpit shows the Markdown brief preview
- **AND** the cockpit attempts to copy the Markdown brief to the clipboard when browser support is available
