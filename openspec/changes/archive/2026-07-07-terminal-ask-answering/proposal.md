# Terminal Ask Answering

## Why

Elves can already raise structured asks, and the command center highlights intervention terminals. But answering an ask still requires leaving the terminal for the inspector. Since the room is the terminal, founder help should be possible directly in the terminal.

## What Changes

- Show the active elf ask inside the affected command-center terminal.
- Render compact answer option buttons in that terminal.
- Use the terminal `$` instruction line as optional context/note for the answer.
- Submit answers through the existing ask answer endpoint and update local room state.

## Out Of Scope

- New daemon endpoints.
- Free-form chat.
- Multi-step decision forms.
- Approval/apply-diff actions from the command center.

## Verification

- `openspec validate terminal-ask-answering --strict`
- `pnpm check`
