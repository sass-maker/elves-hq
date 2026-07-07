## ADDED Requirements

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
