# Add Run Instruction Composer

## Why

The room is supposed to be where the founder can help an elf, but the current launch buttons start from generated context only. The daemon already accepts an optional prompt override for room runs. The cockpit should expose that ability as a small room instruction composer so the founder can steer the next run without editing product memory or creating a separate note.

## What Changes

- Add a per-room "Next run instructions" draft in the room detail.
- Send the draft as `prompt` when starting Dry, Read, Draft, or Build runs.
- Clear the draft after a run starts successfully.
- Keep room notes separate for durable context and decision/fix requests.

## Out Of Scope

- Prompt templates beyond existing playbooks.
- Persistent saved prompt drafts across browser reloads.
- Multi-message chat.
- Changes to the daemon run model.
