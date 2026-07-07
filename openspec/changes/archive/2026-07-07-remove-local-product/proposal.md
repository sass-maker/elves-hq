# Remove Local Product

## Why

The V0 cockpit is manual-folder-first. If the founder adds the wrong folder, experiments with smoke data, or retires a local project, the cockpit currently has no way to remove that product from the local registry. That makes the cockpit noisy over time, which is the exact problem Elves HQ is supposed to avoid.

## What Changes

- Add a guarded daemon action for removing a product from the local registry.
- Remove that product's local tasks, rooms, room logs, asks, artifacts, decisions, notes, and run records from the SQLite workspace view.
- Keep the product's filesystem folder, generated run artifacts, and product memory files untouched.
- Add a cockpit remove action on the product folder/settings card with a confirmation prompt.

## Out Of Scope

- Deleting project folders from disk.
- Cleaning generated run/worktree folders.
- Archiving removed products.
- Bulk product management.
