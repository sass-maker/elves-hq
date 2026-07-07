## MODIFIED Requirements

### Requirement: Room run control

The V0 daemon MUST be able to start, log, persist, inspect, and stop room-scoped runs.

#### Scenario: Founder starts a dry run

- **WHEN** the founder starts a dry run from a room
- **THEN** the daemon creates a run record
- **AND** process output is appended to the room logs
- **AND** the room status updates from working to ready, failed, blocked, or killed when the process exits

#### Scenario: Founder starts read-only Codex

- **WHEN** the founder starts a read-only Codex inspection
- **THEN** the daemon launches `codex exec` with read-only sandboxing
- **AND** Codex output is appended to room logs
- **AND** the daemon can stop the process if the founder kills it or it exceeds the runtime cap

#### Scenario: Founder inspects a run prompt

- **WHEN** a room run starts
- **THEN** the daemon writes the prompt context to a local prompt artifact
- **AND** the cockpit can preview the captured prompt for that run

#### Scenario: Founder starts a worktree-backed run

- **WHEN** the founder starts a worktree-backed room run
- **THEN** the daemon creates an isolated git worktree and branch for the run
- **AND** the daemon persists the run workspace path and branch name on the run record
- **AND** process output is appended to room logs
- **AND** any resulting diff is captured as a room artifact
- **AND** the original product checkout remains clean

#### Scenario: Founder inspects worktree run metadata

- **WHEN** a room has a worktree-backed run with persisted workspace metadata
- **THEN** the existing room runs API returns the run workspace path and branch name
- **AND** the cockpit shows that metadata in the room run list

#### Scenario: Founder opens a captured diff

- **WHEN** a worktree run has captured a diff
- **THEN** the daemon can return the patch for preview in the room

#### Scenario: Founder runs a check gate

- **WHEN** a worktree run has completed
- **THEN** the daemon can run a selected package script inside the isolated worktree
- **AND** output is written to a local check log
- **AND** a pass/fail test artifact is attached to the room
