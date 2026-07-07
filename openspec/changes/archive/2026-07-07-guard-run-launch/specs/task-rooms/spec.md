# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Run launch preflight guards

Elves HQ MUST fail closed before launching an elf against a missing, invalid, or unsupported product folder.

#### Scenario: Founder starts Codex read-only for a missing product folder

- **WHEN** the founder starts a Codex read-only room run
- **AND** the product path does not exist or is not a directory
- **THEN** the daemon rejects the launch before creating a run record
- **AND** the room log records the preflight blocker

#### Scenario: Founder starts a worktree-backed run for a non-git folder

- **WHEN** the founder starts a worktree-backed room run
- **AND** the product path is not a git repository
- **THEN** the daemon rejects the launch before creating a run record
- **AND** the cockpit action panel shows the folder blocker when inspection data is available
