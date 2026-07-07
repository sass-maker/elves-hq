# Design

## Data Model

Add `TaskStatus` to the shared model and a `status` column to the local SQLite `tasks` table. Existing rows migrate to `inbox`, preserving current local data.

Task status values:

- `inbox`: captured but not ready to assign.
- `ready`: ready to assign to an elf.
- `assigned`: already linked to a room.
- `done`: resolved without needing a room.
- `killed`: intentionally abandoned.

## API

Add `POST /api/tasks/:id/status` with a JSON body containing `status`. The route returns the updated task and refreshed workspace. Validation stays narrow and accepts only supported task statuses.

`assignTaskToRoom` updates the task to `assigned` in the same transaction as room creation.

## Cockpit

The backlog panel shows actionable tasks (`inbox`, `ready`) and hides `assigned`, `done`, and `killed` from the open count. Each visible task can be marked ready, done, or killed. Assigned tasks leave the list after room creation.
