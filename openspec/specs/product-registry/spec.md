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

### Requirement: Remove local product registration

Elves HQ MUST let the founder remove a product from the local registry without deleting the underlying project folder.

#### Scenario: Founder removes a local product

- **WHEN** the founder confirms removal for a registered product
- **THEN** the daemon deletes that product from the local SQLite workspace view
- **AND** linked local tasks, rooms, logs, asks, artifacts, decisions, notes, and run records are removed from the workspace view
- **AND** the product folder on disk is not deleted

#### Scenario: Product has a running room run

- **WHEN** the founder tries to remove a product with a linked run still marked `running`
- **THEN** the daemon rejects the removal
- **AND** the product remains in the workspace

### Requirement: Bounded local folder browser

Elves HQ MUST let the founder choose local product folders from a bounded daemon-backed browser.

#### Scenario: Founder opens the add-project folder browser

- **WHEN** the add-project panel is open
- **THEN** the cockpit can request a directory listing rooted at the local fleet workspace
- **AND** the daemon returns child directories without reading file contents or running scripts

#### Scenario: Founder selects a folder

- **WHEN** the founder selects a listed folder
- **THEN** the cockpit fills the product local path from that folder
- **AND** the existing draft folder inspection previews the selected folder before saving

#### Scenario: Request attempts to leave the fleet root

- **WHEN** a folder browser request resolves outside the allowed fleet root
- **THEN** the daemon rejects the request
- **AND** no directory listing is returned

