# Fleet Dashboard Specification Delta

## ADDED Requirements

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
