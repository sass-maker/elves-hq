# Design: Room Elf Assignment

## UI

The Create Room panel gets an "Elf" select near Product and Playbook. Each option shows the elf name and role. The default is the first builder elf, falling back to the first available elf.

## API

Reuse existing `POST /api/rooms` support for `assignedElfId`. The daemon already validates the elf id and returns an error for unknown elves.

## State

The room creation draft stores `assignedElfId`. When workspace data loads from the daemon, the draft is normalized so it points at an available elf.

## Display

Existing room cards and room detail already read `room.assignedElfId`. No new display component is required.
