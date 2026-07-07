# Design

## UI

Add local React state:

```text
checkScriptByRoomId: Record<string, CheckScriptKey | "auto">
```

`RoomDetail` receives the current selected script and a change handler. It derives options from `productInspection.scripts.filter(script.gate)`.

The selector lives near the existing Check button and uses:

- `Auto` when no explicit script should be sent.
- detected gate script names for `check`, `typecheck`, `test`, and `build`.

## Request

`runLatestCheck(roomId, scriptKey)` sends:

- `{}` when `scriptKey` is `auto`.
- `{ "scriptKey": "<key>" }` when a specific gate is selected.

The daemon already validates the key and falls back to auto-detection when no key is provided.

## UX

The Check button remains a single action. The selector makes the choice visible without turning gates into a full workflow builder.
