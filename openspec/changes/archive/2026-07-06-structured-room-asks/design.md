# Design: Structured Room Asks

## Marker

Use one explicit line format:

```text
ELF_ASK: {"question":"...","options":["A","B"],"recommendation":"..."}
```

This is intentionally boring and local. It avoids fragile natural-language detection and gives Codex a clear instruction in the room prompt.

## Parsing

- Parse only complete stdout/stderr lines.
- Ignore lines that do not start with `ELF_ASK:`.
- Require JSON object fields:
  - `question`: non-empty string
  - `options`: one to four non-empty strings
  - `recommendation`: non-empty string
- Invalid markers remain ordinary logs.

## Persistence

- Add a store method to replace the current unresolved ask for the room.
- Persist the ask in the existing `room_asks` table.
- Set room status to `asking`.
- Append a concise log entry saying the elf opened an ask.

## Prompting

Add room-run prompt guidance telling elves to use `ELF_ASK` only when founder judgment is required.

## UI

No new UI surface is required. The existing room ask panel and Needs Me queue should display parsed asks.
