# Product Registry Specification Delta

## ADDED Requirements

### Requirement: Product folder inspection

Elves HQ MUST expose read-only health metadata for registered local product folders.

#### Scenario: Founder selects a registered local product

- **WHEN** the founder selects a product with a local path
- **THEN** the daemon can report whether the path exists, is a directory, and is a git repository
- **AND** the daemon can report package metadata such as package manager and available scripts when `package.json` exists
- **AND** the cockpit shows the folder health without running project scripts
