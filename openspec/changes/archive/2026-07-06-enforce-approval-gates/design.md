# Design: Enforce Approval Gates

## Approval Blockers

Use room artifacts as the source of truth:

- Failed current test/review artifacts remain blocking.
- If a room has a diff artifact, approval requires at least one passed `test` artifact.
- If a room has a diff artifact, approval requires at least one passed `review` artifact.

This is intentionally coarse for V0. It avoids pretending approval is gated when no verification artifact exists.

## Backend

Move approval blocker logic into a shared core helper so Needs Me, Daily Brief, and daemon decisions can eventually use the same source of truth. The daemon rejects `approve` with a human-readable blocker message.

## UI

When `POST /api/rooms/:id/decision` fails, show the returned error in the selected room rather than doing nothing.
