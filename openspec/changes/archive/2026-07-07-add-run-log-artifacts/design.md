## Approach

The process manager already owns child process stdout/stderr. Extend that path so each chunk is also appended to `runs/<run-id>/logs.txt` with a stream label and timestamp. Keep the existing room log behavior unchanged.

Add `GET /api/runs/:id/logs`, mirroring the existing prompt and diff endpoints. The endpoint validates the run id and returns a friendly 404 when no log file exists.

The control UI gets a single "Run log" workbench output and opens the latest room run's captured log on demand.

## Verification

- `pnpm check`
- `openspec validate --all --strict`
- Local API smoke by starting a dry run and fetching `/api/runs/:id/logs`
