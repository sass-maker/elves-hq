# Design

## Approach

Reuse the existing `answerRoomAsk(roomId, askId, answer, note)` UI path, which calls:

```text
POST /api/rooms/:id/asks/:askId/answer
```

The command center passes an ask-answer handler to each terminal. A terminal with `room.asks[0]` renders:

- Ask question as terminal body evidence.
- Option buttons in the terminal footer.
- The existing `$` instruction line as optional founder note.

After an option is selected, the existing handler replaces room state and clears the instruction draft.

## UI

Ask option buttons should be low-pressure and terminal-native. They should appear before run controls when an ask is open. Run controls should remain disabled while the ask is unresolved, because the useful action is answering the elf first.

## Safety

Ask answers are persisted as decisions and notes through the existing daemon behavior. No risky code action is approved from this surface.
