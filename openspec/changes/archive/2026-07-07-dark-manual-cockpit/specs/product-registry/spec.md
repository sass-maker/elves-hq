# Product Registry Specification Delta

## ADDED Requirements

### Requirement: Manual local product registration

Elves HQ MUST let the founder add local products manually instead of requiring an imported fleet registry.

#### Scenario: Founder adds a local product folder

- **WHEN** the founder submits a product name and local path
- **THEN** the daemon stores the product in the local registry
- **AND** the cockpit shows the product without requiring a fleet registry import

## REMOVED Requirements

### Requirement: Visible fleet registry import

The cockpit MUST NOT show the old fleet registry import action as the primary product registration path.
