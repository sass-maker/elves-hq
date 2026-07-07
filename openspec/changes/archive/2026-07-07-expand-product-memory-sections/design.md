# Design

## Shared Model

Extend `ProductMemorySectionKey` and `productMemorySectionDefinitions` in `packages/core/src/index.ts`.

New keys:

- `CUSTOMERS`
- `ROADMAP`
- `FEEDBACK`
- `METRICS`
- `BRAND`

## Daemon

`WorkspaceStore.getProductMemory` already loops over `productMemorySectionDefinitions`, creates missing Markdown files, reads each section, and returns the list. Adding definitions automatically creates the files.

Update `readMemorySectionKey` in the daemon to accept the new keys. Update default section headings in `defaultMemoryBody`.

## UI

No new component is needed. The room memory tab already renders server-provided sections and saves by section key.
