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

### Requirement: Product folder inspection

Elves HQ MUST expose read-only health metadata for registered local product folders.

#### Scenario: Founder selects a registered local product

- **WHEN** the founder selects a product with a local path
- **THEN** the daemon can report whether the path exists, is a directory, and is a git repository
- **AND** the daemon can report package metadata such as package manager and available scripts when `package.json` exists
- **AND** the cockpit shows the folder health without running project scripts

### Requirement: Draft product folder preview

Elves HQ MUST let the founder inspect a local folder path before saving it as a product.

#### Scenario: Founder previews a valid local product folder

- **WHEN** the founder enters a local path in the add-product form
- **THEN** the daemon can inspect that path without creating or updating a product
- **AND** the cockpit shows whether the folder exists, is a directory, is a git repository, and which gate scripts are detected

#### Scenario: Founder previews a missing local folder

- **WHEN** the founder enters a path that does not exist
- **THEN** the cockpit shows the missing-folder warning before the product is saved
- **AND** no product record is created by the preview request

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

