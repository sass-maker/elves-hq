# Design

## Approach

Focused terminal mode is UI-only. The existing `TerminalPanel` remains the canonical terminal drawer component. The command center owns a local `focusedTerminalRoomId` state and, when set, replaces the multi-terminal grid with a large selected terminal plus a compact rail of other terminal drawers.

## Behavior

- The expand icon on a terminal drawer enters focused terminal mode.
- The minimize action exits focused terminal mode.
- Clicking a rail terminal drawer switches focus and selects the room/product.
- The focused terminal keeps the same handlers as the grid terminal:
  - start read-only Codex
  - start worktree Codex
  - start dry run
  - stop active run
  - answer active ask with `$` context
  - update `$` instruction line
- The inspector/workbench remains reachable from the focused header.

## UI Constraints

- Do not add more persistent CTAs to the grid.
- Do not introduce a fake terminal emulator.
- Do not show more dense metadata than the current terminal pane already provides.
- Keep the focused view dark, calm, and operational.
- Use terminal, drawer, Codex, elf, and state-color language in the product surface; keep "room/workbench" secondary.

## Verification

- `openspec validate focused-terminal-mode --strict`
- `pnpm check`
- local dev smoke for UI and daemon availability
