# Design

## Storage

Save Markdown snapshots under:

```text
runs/daily-briefs/<YYYY-MM-DD>.md
```

The `runs/` tree is already ignored and used for local artifacts.

## Daemon

Add:

- `POST /api/briefs/daily/save`
- `GET /api/briefs/daily/latest-snapshot`

The save route builds the current brief, renders Markdown, writes the date-named file, and returns `{ outputPath, markdown, brief }`.

The latest route reads the newest `*.md` file by filename and returns `{ outputPath, markdown }`, or 404 when none exists.

## UI

Extend `DailyBriefPanel` with:

- Save snapshot action.
- Open latest action.
- Snapshot status text.
- Snapshot preview, reusing the existing Markdown preview area.

The existing Markdown export/copy action remains separate.
