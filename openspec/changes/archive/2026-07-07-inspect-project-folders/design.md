# Design

## Daemon

`GET /api/products/:id/inspection` returns a derived read model from local filesystem checks. It must not mutate the folder.

Signals:

- path exists
- path is a directory
- git repository status and git root
- `package.json` presence
- package manager inferred from `packageManager` or lockfiles
- scripts from `package.json`, with common gate scripts highlighted

## Cockpit

The selected product gets a compact dark folder-health card near the project navigation. It should say enough to prevent surprises before starting a room run, without adding another noisy dashboard.

## Safety

Inspection only reads metadata files and runs `git rev-parse`. It does not run project scripts or access secrets.
