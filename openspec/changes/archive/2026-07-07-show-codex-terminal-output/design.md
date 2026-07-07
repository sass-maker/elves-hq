# Design

## Approach

The daemon already captures real process output in `runs/<run-id>/logs.txt` and exposes it through `GET /api/runs/:id/logs`. The UI should reuse that instead of inventing another terminal data source.

The command center will fetch latest runs for a bounded set of visible rooms and then fetch each latest run's log file. This keeps polling cheap and local while making the first screen show actual Codex stdout/stderr.

## Rendering

Terminal pane priority:

1. Latest run log text, rendered as terminal lines.
2. Latest run command/status metadata.
3. Room logs/artifacts/asks/decisions as fallback when no run log exists.

Raw log text is intentionally preserved. Long lines are trimmed visually so panes remain readable.

## Font

Use a terminal-focused system font stack: Berkeley Mono, JetBrains Mono, SF Mono, Cascadia Code, Menlo, Consolas, monospace. No new dependency or network font is needed.
