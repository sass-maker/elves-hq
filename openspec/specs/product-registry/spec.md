# product-registry Specification

## Purpose
Define the local product registry used by the cockpit to map projects to manually chosen folders.
## Requirements
### Requirement: Manual local product registration

Elves HQ MUST let the founder add local products manually instead of requiring an imported fleet registry.

#### Scenario: Founder adds a local product folder

- **WHEN** the founder submits a product name and local path
- **THEN** the daemon stores the product in the local registry
- **AND** the cockpit shows the product without requiring a fleet registry import
