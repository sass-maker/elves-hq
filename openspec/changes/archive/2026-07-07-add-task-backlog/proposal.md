# Add Task Backlog

## Why

The cockpit should be product-wise first: a founder needs to capture tasks for a project, then assign one to an elf when it is ready. Today Elves HQ only creates tasks implicitly while creating rooms, so there is no lightweight backlog between product selection and elf execution.

## What Changes

- Add daemon support for creating standalone product tasks.
- Add daemon support for assigning an existing task to an elf room.
- Show a compact task backlog in the cockpit for the selected product.
- Keep task rooms as the execution surface once a task is assigned.

## Out Of Scope

- Full Kanban workflow.
- Recurring tasks.
- External task imports.
- Drag-and-drop task ordering.
