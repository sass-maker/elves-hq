# Design

## UI

Add local React state:

```text
runInstructionsByRoomId: Record<string, string>
```

Show a compact textarea in `RoomDetail` near the room action buttons. It should be clearly scoped to the next run, not a durable note.

Run buttons call:

```text
startRoomRun(roomId, mode, runInstructionsByRoomId[roomId])
```

After a successful start response, clear that room's instruction draft.

## Daemon

No daemon schema or endpoint change is needed. `POST /api/rooms/:id/runs/start` already accepts an optional `prompt` string and `RoomProcessManager.startRoomRun` already captures the prompt to `runs/<run-id>/prompt.md`.

## UX

Keep the control small and operational. The founder should be able to paste a tactical instruction such as "Focus only on the failing auth test and do not touch pricing copy" before launching an elf run.
