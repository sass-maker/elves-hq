# Terminal Instruction Line

## Why

The command center now lets the founder start and stop elves from each terminal, but the start action cannot include tactical guidance unless the founder opens the inspector. Since a task room is the terminal, each terminal should have its own input line for founder instructions.

## What Changes

- Add a per-terminal instruction draft line in the command center.
- Send the draft as the existing optional prompt when starting read, build, or dry modes.
- Keep the draft local and lightweight, sharing the same instruction state used by the inspector.
- Clear the draft after a successful start through the existing run-start flow.

## Out Of Scope

- Shell command execution.
- Arbitrary terminal emulation.
- New daemon endpoints.
- Persisting unsent drafts across reloads.

## Verification

- `openspec validate terminal-instruction-line --strict`
- `pnpm check`
