# Change: Room Transcripts

## Why

Rooms currently have logs, asks, artifacts, decisions, notes, and run records, but they are scattered across UI panels and API calls. A founder reviewing many rooms needs one durable, readable room document that explains what happened without tailing logs.

## What Changes

- Add a local daemon endpoint that generates a Markdown transcript for one room.
- Include product, task, status, asks, notes, decisions, artifacts, logs, and runs.
- Write the transcript under the ignored `runs/` area and attach it as a room artifact.
- Add a cockpit control to generate and preview the transcript.

## Non-Goals

- PDF export.
- Cloud sync or hosted sharing.
- Automatic transcript generation on every log line.
- Replacing the existing live log panel.

## Impact

- Strengthens the V0 "no fake progress" loop with a single artifact-backed room record.
- Keeps data local and inspectable.
- No new production dependency, cloud service, or secret handling.
