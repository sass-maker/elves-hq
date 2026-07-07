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

### Requirement: Interrupted run recovery

The local daemon MUST not leave persisted runs marked running when it starts without owning their child processes.

#### Scenario: Daemon starts with persisted running runs

- **WHEN** the daemon starts and finds a persisted room run with status `running`
- **THEN** it marks that run failed with no exit code
- **AND** it marks the room failed with an interruption summary
- **AND** it appends a room log entry explaining that the run was interrupted by daemon restart
- **AND** the room is eligible for the existing Needs Me failed-run queue

### Requirement: Approval gate enforcement

The local daemon MUST prevent founder approval of worktree diff rooms until required verification gates have passed.

#### Scenario: Founder approves a diff without gates

- **WHEN** a room has a diff artifact
- **AND** the room does not have a passed test/check artifact
- **OR** the room does not have a passed review/CodeVetter artifact
- **THEN** the daemon rejects the approval request with an actionable blocker message
- **AND** the cockpit shows the blocker message to the founder

#### Scenario: Founder approves a diff after gates pass

- **WHEN** a room has a diff artifact
- **AND** the room has a passed test/check artifact
- **AND** the room has a passed review/CodeVetter artifact
- **AND** no current failed gate artifact remains
- **THEN** the daemon allows founder approval

### Requirement: Visible room gate checklist

The cockpit MUST show the current required gate state inside each room so the founder can understand approval readiness before acting.

#### Scenario: Diff room is missing gates

- **WHEN** a room has a diff artifact
- **AND** the room lacks a passed check artifact
- **AND** the room lacks a passed CodeVetter review artifact
- **THEN** the room detail shows both gates as missing or required
- **AND** the founder can still run the gates from the same action panel

#### Scenario: Diff room gates have results

- **WHEN** a room has a diff artifact
- **AND** a check or CodeVetter artifact exists
- **THEN** the room detail shows each gate as passed or failed based on the current artifact status

### Requirement: Persistent cockpit pane layout

The cockpit MUST let the founder adjust the relative size of the fleet, task-room list, and selected-room panes and keep the chosen layout across reloads.

#### Scenario: Founder adjusts pane widths

- **WHEN** the founder changes the fleet or room-list pane size
- **THEN** the cockpit updates the three-pane grid without losing selected product or room state
- **AND** the selected-room pane remains usable

#### Scenario: Founder reloads the cockpit

- **WHEN** the founder has adjusted the pane layout
- **AND** the page is reloaded
- **THEN** the cockpit restores the saved pane widths

#### Scenario: Founder resets layout

- **WHEN** the founder chooses reset layout
- **THEN** the cockpit returns to the default pane widths

### Requirement: Founder can answer elf asks in the room

The cockpit MUST let the founder answer an elf's open ask directly from the room and preserve that answer as context for later runs.

#### Scenario: Founder selects an ask option

- **WHEN** a room has an open elf ask with options
- **AND** the founder selects one option
- **THEN** the daemon records the selected answer as a founder decision
- **AND** the daemon records a room note containing the answer
- **AND** the open ask is cleared
- **AND** the room returns to an idle state for the next elf action

#### Scenario: Founder adds context while answering

- **WHEN** the founder has typed a room note draft
- **AND** the founder selects an ask option
- **THEN** the note context is stored with the selected answer

### Requirement: Tabbed selected-room workbench

The selected room MUST organize detailed room evidence into switchable tabs so the founder can inspect logs, artifacts, notes, and memory without scrolling through every section.

#### Scenario: Founder switches room workbench tabs

- **WHEN** the founder opens a selected room
- **THEN** the room shows tabs for Logs, Artifacts, Notes, and Memory
- **AND** selecting each tab shows the corresponding room evidence
- **AND** the room's primary status, ask, acceptance, gates, and actions remain visible above the tabs

#### Scenario: Founder opens generated previews

- **WHEN** the founder opens a prompt, diff, check output, CodeVetter report, cleanup result, or transcript
- **THEN** the generated preview remains visible below the tabbed workbench

### Requirement: Focused selected-room mode

The cockpit MUST let the founder expand the selected task room into a focused view and return to the normal three-pane cockpit.

#### Scenario: Founder enters focused room mode

- **WHEN** the founder activates the selected room expand control
- **THEN** the selected room occupies the main cockpit view
- **AND** the fleet sidebar and task-room list are hidden
- **AND** room actions, asks, previews, notes, artifacts, logs, and memory remain available

#### Scenario: Founder exits focused room mode

- **WHEN** the founder activates the focused room exit control
- **THEN** the cockpit restores the normal fleet, room-list, and selected-room panes
- **AND** the previously selected room remains selected

### Requirement: Dark low-density cockpit overview

The task-room cockpit MUST default to a dark command-room layout with reduced overview density.

#### Scenario: Founder opens the cockpit

- **WHEN** the cockpit renders the task-room overview
- **THEN** it shows a dark interface with high-contrast status signals
- **AND** it limits visible overview cards so detailed evidence stays in the selected room workbench

### Requirement: Draggable pane resizing

The cockpit MUST resize desktop panes through draggable handles instead of visible range sliders.

#### Scenario: Founder drags a pane handle

- **WHEN** the founder drags a pane divider
- **THEN** the adjacent pane width updates within the allowed bounds
- **AND** the chosen layout is persisted locally

### Requirement: Product task backlog

Elves HQ MUST let the founder create product-scoped tasks before assigning them to an elf room.

#### Scenario: Founder creates a backlog task

- **WHEN** the founder creates a task for a selected product with acceptance criteria
- **THEN** the daemon persists the task without requiring an elf run
- **AND** the cockpit shows the task in the selected product backlog

### Requirement: Assign backlog task to elf room

Elves HQ MUST let the founder assign an existing backlog task to an elf room.

#### Scenario: Founder assigns a task to an elf

- **WHEN** the founder assigns an unassigned task to an elf
- **THEN** the daemon creates a room linked to that task
- **AND** the task no longer appears in the unassigned backlog
- **AND** the room appears in the task-room list for that product

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

### Requirement: Selected room activity timeline

The selected room MUST expose a compact activity timeline built from existing room evidence.

#### Scenario: Founder opens a room with activity

- **WHEN** the selected room has asks, artifacts, decisions, notes, logs, or runs
- **THEN** the room workbench offers a Timeline tab
- **AND** the timeline shows recent meaningful events with source, tone, timestamp when available, and summary
- **AND** the detailed Logs tab remains available separately

#### Scenario: Founder opens a quiet room

- **WHEN** the selected room has no timeline evidence yet
- **THEN** the Timeline tab shows an empty state rather than fake progress

### Requirement: Approved worktree diff apply

Elves HQ MUST let the founder apply an approved, gated worktree diff to the local product checkout without committing, pushing, deploying, or releasing.

#### Scenario: Founder applies an approved gated worktree diff

- **WHEN** a completed worktree run has a captured diff
- **AND** the room has passed check and CodeVetter gates
- **AND** the founder has approved the room
- **AND** the target product checkout is clean
- **THEN** the daemon can apply the captured diff to the product checkout
- **AND** the room records the apply action as a log artifact
- **AND** the cockpit shows the apply output

#### Scenario: Founder tries to apply before approval

- **WHEN** a completed worktree run has not been approved by the founder
- **THEN** the daemon rejects the apply with an actionable blocker
- **AND** no git apply is attempted

#### Scenario: Founder tries to apply into a dirty checkout

- **WHEN** the target product checkout has uncommitted changes
- **THEN** the daemon rejects the apply
- **AND** no generated worktree is cleaned up

### Requirement: Retry budget guard

Elves HQ MUST stop repeated failed retry loops and require founder judgment once a room exhausts its retry budget.

#### Scenario: Founder retries within budget

- **WHEN** a room has fewer failed or killed attempts than the configured retry budget for the latest run mode
- **THEN** the daemon allows retry to start another run
- **AND** the retry decision is recorded as room context

#### Scenario: Founder retries after budget exhaustion

- **WHEN** a room has reached the configured failed/killed retry budget for the latest run mode
- **THEN** the daemon rejects the retry request
- **AND** the room is marked blocked with an actionable summary
- **AND** the room log records the budget guard
- **AND** no new run is started

### Requirement: Backlog task lifecycle

Elves HQ MUST let the founder triage product backlog tasks without turning every task into a room.

#### Scenario: Founder marks a backlog task ready

- **WHEN** the founder marks an inbox task as ready
- **THEN** the daemon persists the task status as `ready`
- **AND** the task remains visible in the selected product backlog

#### Scenario: Founder closes a backlog task

- **WHEN** the founder marks a backlog task done or killed
- **THEN** the daemon persists that terminal status
- **AND** the task leaves the open backlog list

#### Scenario: Founder assigns a backlog task to an elf room

- **WHEN** the founder assigns a backlog task to a room
- **THEN** the daemon marks the task status as `assigned`
- **AND** the task leaves the open backlog list
- **AND** the created room remains linked to that task

### Requirement: Slideable room deck

Elves HQ MUST let the founder navigate more room cards than fit in the compact room pane without hiding rooms behind a fixed truncation.

#### Scenario: Founder pages through rooms

- **WHEN** the filtered room list has more rooms than one deck page can show
- **THEN** the cockpit shows previous and next controls
- **AND** the founder can slide to later room pages without changing the selected product filter

#### Scenario: Founder opens a room from another surface

- **WHEN** the founder opens a room from Needs Me, Elf FM, or another room link
- **THEN** the room detail opens
- **AND** the room deck moves to the page containing that room when that room is in the filtered list

### Requirement: Room output shelf

Elves HQ MUST organize opened room outputs in one workbench surface instead of appending every preview to the selected room page.

#### Scenario: Founder opens room output

- **WHEN** the founder opens a prompt, transcript, diff, check output, CodeVetter report, cleanup result, or apply result
- **THEN** the cockpit keeps that output available in the room workbench Outputs tab
- **AND** the selected room page does not add another standalone preview section below the workbench

#### Scenario: No outputs are open

- **WHEN** the room has no opened output previews
- **THEN** the Outputs tab shows a quiet empty state

### Requirement: Active room deck filter

Elves HQ MUST keep completed rooms out of the default room deck while preserving access to room history.

#### Scenario: Founder opens the task-room pane

- **WHEN** the room deck is in its default Active scope
- **THEN** rooms with status `done` are hidden from the room deck
- **AND** active, blocked, failed, asking, ready, working, and idle rooms remain visible

#### Scenario: Founder switches to all rooms

- **WHEN** the founder switches the room deck to All
- **THEN** the room deck includes done rooms for the selected product filter
- **AND** the room detail can open a done room

### Requirement: Next-run instruction composer

Elves HQ MUST let the founder provide tactical instructions for the next elf run from inside a task room.

#### Scenario: Founder starts a run with instructions

- **WHEN** the founder enters next-run instructions in a room
- **AND** starts a Dry, Read, Draft, or Build run
- **THEN** the cockpit sends those instructions as the run prompt
- **AND** the daemon captures the prompt artifact for that run

#### Scenario: Run starts successfully

- **WHEN** the daemon accepts the start-run request
- **THEN** the cockpit clears the next-run instruction draft for that room

#### Scenario: Founder uses durable notes separately

- **WHEN** the founder wants context to persist beyond the next run
- **THEN** room notes remain available as a separate durable context surface

### Requirement: Check gate script selection

Elves HQ MUST let the founder choose which detected package script is used for a room check gate.

#### Scenario: Founder selects a check gate

- **WHEN** product folder inspection detects gate scripts
- **THEN** the room action panel offers those gate scripts as check choices
- **AND** the founder can choose a specific script or Auto

#### Scenario: Founder runs selected gate

- **WHEN** the founder clicks Check with a specific gate selected
- **THEN** the cockpit sends that script key to the daemon check endpoint

#### Scenario: Founder leaves gate on Auto

- **WHEN** the founder clicks Check with Auto selected
- **THEN** the cockpit omits a script key
- **AND** the daemon chooses the first available supported gate

