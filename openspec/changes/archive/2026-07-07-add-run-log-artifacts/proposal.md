## Why

Room logs are useful for ambient context, but a founder inspecting a specific elf run needs the raw run output as a durable artifact. Today the run prompt, diff, check output, and CodeVetter report can be reopened, while stdout/stderr only live in the aggregate room log stream.

## What Changes

- Capture stdout/stderr for every room run to `runs/<run-id>/logs.txt`.
- Expose the captured run log through a local read endpoint.
- Add a room workbench preview action for the latest run log.

## Out of scope

- Full terminal replay.
- Search, filters, or streaming log tails.
- Cloud log storage.
