# Answer Room Asks

## Why

Task rooms already show elf questions, but the option buttons are inert. That breaks the core promise: an elf can ask for founder judgment, and the founder should be able to answer from the room without translating the decision into a separate note manually.

## What Changes

- Add a daemon endpoint for answering the current room ask.
- Persist the founder's selected answer as a decision and room note.
- Clear the open ask and return the room to an actionable idle state.
- Wire the room ask option buttons to answer the ask, with an optional custom note.

## Out Of Scope

- Telegram ask answering.
- Multi-ask queues per room.
- Automatic continuation of the elf after an answer.
