## ADDED Requirements

### Requirement: Editable product settings

Elves HQ MUST let the founder update local product operating settings after registration.

#### Scenario: Founder updates product status and priority

- **WHEN** the founder changes a product's status or priority
- **THEN** the daemon persists the updated settings in the local registry
- **AND** the cockpit reflects the updated status and priority without requiring a restart

#### Scenario: Founder updates current goal

- **WHEN** the founder edits the current goal for a product
- **THEN** future room context uses the updated goal
- **AND** the product remains mapped to the same local folder
