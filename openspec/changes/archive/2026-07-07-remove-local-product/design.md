# Design

## Daemon

Add `POST /api/products/:id/remove`. The store method verifies the product exists, blocks removal while any linked run is still marked `running`, then deletes local workspace rows in one transaction:

- `elf_runs` for rooms belonging to the product
- `room_logs`, `room_asks`, `artifacts`, `decisions`, `room_notes`
- `rooms`
- `tasks`
- `products`

The response returns the refreshed workspace, Needs Me queue, Daily Brief, and Elf FM feed so the cockpit can immediately declutter.

## Cockpit

Add a remove button to the selected product card. Use a browser confirmation prompt that explicitly says the folder on disk will not be deleted. After removal, select `all` and clear the removed product's inspection/settings status from UI state.

## Safety

This is local registry cleanup, not filesystem cleanup. It must not call `rm`, `git worktree remove`, or delete memory files.
