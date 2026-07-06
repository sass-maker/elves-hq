# Design: Room Transcripts

## Transcript Shape

The transcript is generated on demand as Markdown:

- Title, generated timestamp, room id
- Product and task metadata
- Acceptance criteria
- Current room status and summary
- Active ask, if any
- Founder notes
- Decisions
- Artifacts
- Runs
- Logs

The transcript should preserve raw evidence rather than editorialize.

## Storage

Write transcripts to:

```text
runs/room-transcripts/<room-id>.md
```

This location is already local and ignored. The room gets a `log` artifact pointing at the path.

## API

Add:

```text
POST /api/rooms/:id/transcript
GET /api/rooms/:id/transcript
```

`POST` regenerates the transcript and returns `{ roomId, outputPath, transcript, room }`.
`GET` returns the latest transcript if it exists.

## UI

Add a "Transcript" action in the room actions grid. Show the returned Markdown in the existing preview area pattern used by prompt/diff/check/CodeVetter.
