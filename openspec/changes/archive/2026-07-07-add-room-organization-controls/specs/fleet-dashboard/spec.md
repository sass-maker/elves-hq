# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Room organization controls

Elves HQ MUST let the founder organize visible task rooms without leaving the product-first cockpit.

#### Scenario: Founder filters room deck by signal

- **WHEN** the founder selects a room signal filter
- **THEN** the room deck shows only rooms matching that signal within the current product and active/all scope
- **AND** the filter count is derived from existing room state, asks, artifacts, and gate results

#### Scenario: Founder sorts visible rooms

- **WHEN** the founder selects a room sort order
- **THEN** the room deck reorders matching rooms by priority signal, recent activity, or product name
- **AND** the selected room detail remains stable when the selected room still matches the organized view

#### Scenario: Founder pages organized rooms

- **WHEN** filtered rooms span multiple pages
- **THEN** the existing slideable room deck pagination continues to page through the organized room set
