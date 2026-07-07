# Product Registry Specification Delta

## ADDED Requirements

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
