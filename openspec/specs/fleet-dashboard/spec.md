# fleet-dashboard Specification

## Purpose
Define the product-first cockpit surfaces that summarize portfolio state without forcing the founder to inspect every room.
## Requirements
### Requirement: Product fleet pulse

Elves HQ MUST show product-first status rows derived from existing room signals.

#### Scenario: Founder opens the cockpit

- **WHEN** the local workspace has registered products
- **THEN** the cockpit shows a Fleet Pulse row for each product
- **AND** each row includes the product name, dominant room signal, status label, and needs count when founder attention is required
- **AND** the signal is derived from stored room state rather than a fake progress value

#### Scenario: Founder selects a pulse row

- **WHEN** the founder selects a product row in Fleet Pulse
- **THEN** the cockpit filters the task-room pane to that product

### Requirement: Compact overview switcher

Elves HQ MUST keep the task-room pane compact by showing one overview panel at a time.

#### Scenario: Founder switches overview panels

- **WHEN** the founder selects Needs Me, Elf FM, Backlog, or Brief in the overview switcher
- **THEN** the cockpit shows the selected panel
- **AND** the other overview panels are hidden without losing their data or actions

#### Scenario: Founder scans hidden panel state

- **WHEN** overview panels are hidden behind the switcher
- **THEN** the switcher still shows counts for decisions, broadcasts, backlog tasks, and brief recommendations

### Requirement: Local sync visibility

Elves HQ MUST tell the founder whether the visible cockpit state is currently synced from the local daemon.

#### Scenario: Daemon polling succeeds

- **WHEN** the cockpit refreshes workspace data from the local daemon
- **THEN** the sidebar shows a live sync state
- **AND** the sidebar shows the latest local sync time

#### Scenario: Daemon polling fails after initial load

- **WHEN** the cockpit cannot refresh workspace data from the local daemon
- **THEN** the sidebar shows a stale sync state
- **AND** the previously visible cockpit state remains visible for inspection

### Requirement: Room organization controls

Elves HQ MUST let the founder organize visible task rooms without leaving the product-first cockpit.

#### Scenario: Founder filters room deck by signal

- **WHEN** the founder selects a room signal filter
- **THEN** the room deck shows only rooms matching that signal within the current product and active/all scope
- **AND** the filter count is derived from existing room state, asks, artifacts, and gate results

#### Scenario: Founder sorts visible rooms

- **WHEN** the founder selects a room sort order
- **THEN** the room deck reorders matching rooms by priority signal, recent activity, or product name
- **AND** the selected room detail remains stable when the selected room still matches the organized view

#### Scenario: Founder pages organized rooms

- **WHEN** filtered rooms span multiple pages
- **THEN** the existing slideable room deck pagination continues to page through the organized room set

#### Scenario: Founder scans the room deck

- **WHEN** the founder views organized rooms
- **THEN** each room row emphasizes room title, status, product, elf, last activity, and high-signal ask/artifact count
- **AND** detailed summaries, logs, artifacts, and gate evidence remain in the selected room detail rather than crowding the deck

### Requirement: Terminal command-center start screen

Elves HQ MUST open to a calm terminal command-center view that makes active rooms, stuck rooms, and founder-needed intervention understandable without exposing the full room control surface immediately.

#### Scenario: Founder opens the cockpit

- **WHEN** the cockpit has workspace data
- **THEN** the first screen shows a dark terminal command-center layout
- **AND** room panes are backed by existing room status, logs, artifacts, asks, decisions, and run records
- **AND** the screen avoids high-volume dashboard controls as the primary visual element

#### Scenario: A room needs founder intervention

- **WHEN** a room has an open decision, ask, blocked status, failed status, or ready review signal
- **THEN** the command center visually separates that room as an intervention pane
- **AND** the pane content explains the signal using existing room evidence

#### Scenario: Founder opens a terminal pane

- **WHEN** the founder opens a room terminal from the command center
- **THEN** the cockpit selects the room and product
- **AND** the founder can use the existing room detail controls, logs, artifacts, gates, notes, and memory

### Requirement: Command-center terminals show captured run output

Elves HQ MUST make command-center terminal panes show the latest captured Codex or run output when available.

#### Scenario: A room has a captured run log

- **WHEN** a command-center room has a latest run with a captured log file
- **THEN** its terminal pane renders that captured stdout/stderr output as the primary body
- **AND** room summaries, artifacts, asks, and decisions are secondary fallback content

#### Scenario: A room has no captured run log

- **WHEN** a command-center room has no latest captured run log
- **THEN** its terminal pane may show room-level logs and evidence
- **AND** the pane must not imply live Codex output exists

### Requirement: Command-center terminal run controls

Elves HQ MUST let the founder start or stop a room run directly from the command-center terminal pane without leaving the start screen. The task room and terminal are the same work surface.

#### Scenario: Founder starts a room from a terminal pane

- **WHEN** a task terminal has no active running run
- **THEN** the pane offers compact controls for read-only Codex, worktree Codex, and dry-run modes
- **AND** selecting one starts the corresponding existing room run mode
- **AND** captured output continues to appear in that terminal pane through the existing run-log polling

#### Scenario: Founder stops a running room from a terminal pane

- **WHEN** a task terminal has an active running run
- **THEN** the pane offers a stop control
- **AND** selecting it calls the existing run kill action for that room

#### Scenario: Founder needs deeper inspection

- **WHEN** the founder opens a terminal pane
- **THEN** the full terminal inspector/workbench remains available for gates, artifacts, notes, memory, and decisions

### Requirement: Command-center terminal instruction line

Elves HQ MUST let the founder type room-scoped instructions directly into each command-center terminal before starting an elf run.

#### Scenario: Founder types an instruction in a terminal

- **WHEN** a task terminal is visible in the command center
- **THEN** it shows a compact terminal-style input line for founder instructions
- **AND** the input is scoped to that terminal's room

#### Scenario: Founder starts an elf with an instruction

- **WHEN** the founder starts read-only Codex, worktree Codex, or dry-run from a terminal with a draft instruction
- **THEN** the instruction is sent as the existing optional run prompt
- **AND** the captured run prompt includes that instruction through the existing run-start path

#### Scenario: Founder starts without an instruction

- **WHEN** the founder starts a run from a terminal with an empty draft
- **THEN** the run starts with the room's existing task context and no extra terminal instruction

### Requirement: Command-center terminals answer elf asks

Elves HQ MUST let the founder answer an active elf ask directly in the task terminal.

#### Scenario: A terminal has an active ask

- **WHEN** a command-center task terminal has an unresolved elf ask
- **THEN** the terminal shows the ask question and available options
- **AND** run-start controls are secondary or disabled until the ask is answered

#### Scenario: Founder answers from the terminal

- **WHEN** the founder selects an ask option from the terminal
- **THEN** the cockpit submits the answer through the existing ask answer action
- **AND** any text in the terminal instruction line is sent as optional answer context
- **AND** the terminal refreshes with the updated room state

### Requirement: Terminal drawer dashboard

Elves HQ MUST present V0 as a dashboard of task terminal drawers where Codex elves run across local projects.

#### Scenario: Founder scans terminal drawers

- **WHEN** the founder opens the command-center dashboard
- **THEN** each active task is represented as a terminal drawer
- **AND** each terminal drawer is color-coded from existing room/run/ask/gate state
- **AND** the terminal body prioritizes captured Codex or run output when available

#### Scenario: Founder focuses a terminal

- **WHEN** the founder expands a command-center terminal drawer
- **THEN** the cockpit shows that room as a large single terminal
- **AND** the terminal keeps captured output, instruction input, run controls, stop control, and ask answering behavior
- **AND** the full inspector/workbench remains available as a secondary action

#### Scenario: Founder switches while focused

- **WHEN** the founder selects another terminal from the focused view
- **THEN** the focused terminal changes to that room
- **AND** the selected room and product context update consistently

#### Scenario: Founder exits focus

- **WHEN** the founder exits focused terminal mode
- **THEN** the command center returns to the multi-terminal grid
- **AND** no run, ask, or instruction state is lost

