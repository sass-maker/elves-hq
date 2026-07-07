# Design

## API

Add `POST /api/products/inspect-path` with body:

```json
{ "name": "Optional display name", "localPath": "/absolute/or/relative/path" }
```

The endpoint returns the same `ProductFolderInspection` shape used by registered product inspection. It constructs an ephemeral product object in memory and does not write to SQLite.

## Store

Expose `WorkspaceStore.inspectProductPath(input)` as a thin wrapper around the existing folder inspection helper. This avoids duplicating git/package/script detection.

## UI

The add-product form keeps a `draftProductInspection` state. When the local path changes and the daemon is connected, the UI debounces briefly and calls the new endpoint. The result renders through the existing `ProductFolderCard` with a draft product object. The save button remains available for missing paths because the founder may intentionally register a future folder, but the form makes the warning visible before save.

## Failure Behavior

If the preview endpoint fails, the form remains usable and shows a local message. This is an advisory setup aid, not a hard gate.
