# Design

## Approach

Reuse `runInstructionsByRoomId` from the existing room inspector. The command center receives the draft map and change handler, then each terminal pane renders a monospace prompt line:

```text
$ <instruction>
```

The existing start handler already accepts an optional prompt. The command-center run controls pass the terminal draft into that handler.

## UI

The input line is part of the terminal footer, not a separate card. It should not cover output. The terminal body remains the primary surface, and the input/control strip stays compact.

## Safety

The instruction line is prompt context only. It does not execute shell commands directly. Read/build/dry still map to existing bounded run modes and safety constraints.
