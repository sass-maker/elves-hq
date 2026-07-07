# Design

## Runtime Config

Add `ELVES_HQ_MAX_RETRIES`, defaulting to `3`.

## Retry Counting

In `RoomProcessManager.retryRoom`, inspect persisted runs for the room. If the latest run mode has at least `maxRetries` failed or killed runs, the daemon:

- marks the room `blocked`
- appends a warning log
- throws an actionable error

Completed runs do not consume retry budget because they did not fail. A manual new run can still be started if the founder deliberately changes mode/context.

## UI

No new controls are required. The existing Retry button already calls the daemon and shows errors in the decision preview.

## Reliability

The guard uses persisted run history, so it survives daemon restarts.
