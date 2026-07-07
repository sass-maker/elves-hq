# Add Daily Brief Snapshots

## Why

The Daily Brief should be an operating artifact, not only a transient computed panel. Founders need a durable local record of what the cockpit believed was shipped, ready, blocked, failed, and recommended at a point in time.

## What Changes

- Add a daemon action to save the current Daily Brief Markdown to ignored local storage.
- Add a daemon read endpoint for the latest saved brief snapshot.
- Add cockpit actions to save the current brief and preview the latest saved snapshot.
- Update docs/status so the local artifact path is clear.

## Out Of Scope

- Scheduling automatic daily generation.
- Cloud sync.
- Calendar or notification delivery.
- Editing historical snapshots.
