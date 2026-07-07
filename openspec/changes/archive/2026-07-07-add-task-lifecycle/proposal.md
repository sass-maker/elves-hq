# Add Task Lifecycle

## Why

The local cockpit has a product-wise backlog, but tasks are still just unassigned titles until they become rooms. Once a founder is running several products, stale or intentionally parked backlog items should not stay mixed with work that is actually ready for elves.

## What Changes

- Add a small persisted task status lifecycle: `inbox`, `ready`, `assigned`, `done`, `killed`.
- Mark tasks as `assigned` when a backlog item becomes an elf room.
- Let the cockpit update backlog task status without opening the database.
- Keep the visible backlog focused on actionable `inbox` and `ready` tasks, with a compact archived count for done/killed/assigned items.

## Out Of Scope

- Kanban columns.
- Drag-and-drop task ordering.
- External task imports.
- Recurring tasks.
- Task deletion.
