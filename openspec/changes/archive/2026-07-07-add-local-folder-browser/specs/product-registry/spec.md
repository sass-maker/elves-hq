# Product Registry Specification Delta

## ADDED Requirements

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
