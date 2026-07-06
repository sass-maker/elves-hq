# Change: Room Elf Assignment

## Why

The V0 promise includes project-wise tasks that the founder can assign to an elf. The daemon already accepts `assignedElfId`, but the cockpit room creation flow currently hides that choice and falls back to the default builder elf.

## What Changes

- Add an elf selector to the New Room form.
- Persist the selected elf through the existing room creation API.
- Default new rooms to the first builder elf when available.
- Keep room cards and room detail using the persisted assigned elf.

## Non-Goals

- Reassigning an existing room after creation.
- Multi-elf rooms.
- Scheduling or capacity balancing.
- New agent drivers.

## Impact

- Makes the local task-room loop match the founder's mental model: choose product, task, playbook, and elf.
- Uses existing local daemon fields and SQLite schema.
- No new dependencies, cloud services, or production behavior.
