# task-rooms Specification

## Purpose
Define local task-room behavior that turns elf output into founder-visible decisions without requiring the founder to watch raw logs.
## Requirements
### Requirement: Structured elf asks

The local daemon MUST convert explicit structured ask markers from room run output into unresolved room asks.

#### Scenario: Elf asks for founder judgment

- **WHEN** a room run outputs a complete line starting with `ELF_ASK:` followed by valid ask JSON
- **THEN** the daemon persists the ask in the room
- **AND** the room status becomes `asking`
- **AND** the Needs Me queue surfaces the ask with its question, options, and recommendation

#### Scenario: Elf prints an invalid ask marker

- **WHEN** a room run outputs an `ELF_ASK:` line with invalid JSON or missing fields
- **THEN** the daemon keeps the line as a normal log
- **AND** no room ask is created from that invalid marker

### Requirement: Room transcripts

The local daemon MUST be able to generate a durable Markdown transcript for a room.

#### Scenario: Founder generates a room transcript

- **WHEN** the founder requests a transcript for a room
- **THEN** the daemon writes a Markdown transcript to local ignored storage
- **AND** the transcript includes the room's product, task, status, asks, notes, decisions, artifacts, runs, and logs
- **AND** the room gets an artifact that points to the transcript path
- **AND** the cockpit can preview the generated transcript

#### Scenario: Founder opens the latest transcript

- **WHEN** a transcript has already been generated for a room
- **THEN** the daemon can return the latest transcript without regenerating it

### Requirement: Project-wise room organization

Elves HQ MUST organize work by product, then task room.

#### Scenario: Founder selects a product

- **WHEN** the founder selects a project
- **THEN** the room board filters to rooms for that project
- **AND** the selected room detail remains visible when applicable

### Requirement: Room status visibility

Each room MUST expose one literal status from `working`, `asking`, `blocked`, `failed`, `ready`, `done`, or `idle`.

#### Scenario: Elf asks for help

- **WHEN** a room has an unresolved ask
- **THEN** the room status is visible as founder attention needed
- **AND** the room detail shows the ask, options, and response action

### Requirement: Artifact-backed progress

Room progress MUST be represented by concrete logs, artifacts, asks, or decisions.

#### Scenario: Room appears ready

- **WHEN** a room is marked ready
- **THEN** the room detail shows artifacts or gate output that explain what is ready for review

### Requirement: Needs Me queue

Elves HQ MUST expose one founder-facing queue for rooms that need judgment.

#### Scenario: Founder opens the cockpit

- **WHEN** rooms have unresolved asks, blocked runs, failed runs, failed gates, or ready artifacts
- **THEN** the cockpit shows those items in a Needs Me queue
- **AND** each item includes the room, project, risk, reason, recommendation, and evidence
- **AND** selecting an item opens the relevant room

### Requirement: Founder decision actions

The cockpit MUST let the founder resolve surfaced decisions without editing the database manually.

#### Scenario: Founder resolves a queue item

- **WHEN** the founder approves, requests a fix, rejects, snoozes, or retries a room
- **THEN** the daemon persists a decision record
- **AND** the room log records the founder action
- **AND** the room status changes so resolved items leave the Needs Me queue

#### Scenario: Founder retries a room

- **WHEN** the founder retries a room
- **THEN** the daemon starts a new run using the latest run mode for that room
- **AND** the new run appears in the room run list

#### Scenario: Founder requests a fix with context

- **WHEN** the founder requests a fix with a room note
- **THEN** the daemon persists the note with the decision
- **AND** a later retry includes that fix context in the captured run prompt

### Requirement: Local-first V0

The V0 cockpit MUST run locally without cloud auth or hosted API dependencies.

#### Scenario: Founder starts local UI

- **WHEN** the founder runs the local dev command
- **THEN** the cockpit opens with seeded local data
- **AND** no cloud credentials are required

### Requirement: Local room persistence

The V0 cockpit MUST persist room data in a local store owned by the repository checkout.

#### Scenario: Founder adds a room note

- **WHEN** the founder saves a note in a room
- **THEN** the local daemon persists it to the local SQLite database
- **AND** the updated room is returned to the cockpit

### Requirement: Room run control

The V0 daemon MUST be able to start, log, persist, and stop room-scoped runs.

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
- **AND** process output is appended to room logs
- **AND** any resulting diff is captured as a room artifact
- **AND** the original product checkout remains clean

#### Scenario: Founder opens a captured diff

- **WHEN** a worktree run has captured a diff
- **THEN** the daemon can return the patch for preview in the room

#### Scenario: Founder runs a check gate

- **WHEN** a worktree run has completed
- **THEN** the daemon can run a selected package script inside the isolated worktree
- **AND** output is written to a local check log
- **AND** a pass/fail test artifact is attached to the room

### Requirement: CodeVetter review gate

The V0 daemon MUST be able to run a CodeVetter gate against a completed worktree diff before founder approval.

#### Scenario: Founder vets a completed worktree run

- **WHEN** a completed worktree run has a captured diff
- **THEN** the daemon can run a configured CodeVetter command or local deterministic fallback scan
- **AND** output is written to a local CodeVetter report
- **AND** a pass/fail review artifact is attached to the room

#### Scenario: CodeVetter finds a blocking issue

- **WHEN** the CodeVetter gate reports a high-severity or external blocking finding
- **THEN** the room status changes to failed
- **AND** the Needs Me queue surfaces the failed review gate for founder inspection

### Requirement: Generated worktree cleanup

The V0 daemon MUST let the founder remove generated worktree folders after a run is no longer active.

#### Scenario: Founder cleans up a generated worktree

- **WHEN** an inactive worktree-backed run has a generated worktree folder
- **THEN** the daemon removes the generated worktree checkout
- **AND** captured run artifacts remain available outside the worktree
- **AND** the room log records the cleanup action

### Requirement: Founder-selected elf assignment

The cockpit MUST let the founder choose which elf is assigned when creating a room.

#### Scenario: Founder creates a room with a selected elf

- **WHEN** the founder creates a room and selects an available elf
- **THEN** the daemon persists that elf id on the room
- **AND** the room card and detail show the selected elf

#### Scenario: Founder does not change the default elf

- **WHEN** the founder opens the new-room form
- **THEN** the cockpit defaults the room to an available builder elf when one exists

