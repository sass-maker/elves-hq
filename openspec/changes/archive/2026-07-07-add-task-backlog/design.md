# Design

## Data Model

Use the existing `tasks` table. A task is considered unassigned when no room references its id. This avoids a migration for status fields while still giving the founder a visible backlog.

## API

- `POST /api/tasks` creates a standalone task.
- `POST /api/tasks/:id/assign-room` creates a room from an existing task with a selected elf and optional playbook.

Both responses return the updated workspace so the cockpit can refresh derived Needs Me, Daily Brief, and Elf FM state.

## Cockpit

The task-room column gets a compact "Task Backlog" panel above room cards. It shows unassigned tasks for the selected product, supports quick task creation, and assigns a task to the selected/default elf.

## Scope Control

This is not a Kanban clone. The backlog only answers:

- what tasks exist for this product
- which ones are not in rooms yet
- assign this task to an elf
