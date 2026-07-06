# Design

## Approach

Add `POST /api/rooms/:roomId/asks/:askId/answer` with body:

```json
{
  "answer": "Keep scope tiny",
  "note": "Optional founder context"
}
```

The store validates that the ask belongs to the room, inserts a decision with `answered` status, inserts a room note containing the answer and optional context, deletes the open ask, updates the room to `idle`, and appends a log entry. The next run prompt already includes recent notes and decisions, so the answered ask becomes context for retry/continue without adding a new prompt channel.

The UI reuses the current room note draft as optional context. Clicking an ask option answers the ask immediately and shows a preview message in the room.

## Verification

- `pnpm check`
- API smoke: create/open an ask, answer an option, verify ask cleared, decision/note/log persisted.
- Browser smoke: click an ask option and verify the ask panel disappears with a recorded preview.
