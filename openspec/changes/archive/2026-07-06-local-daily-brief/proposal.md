# Change: Local Daily Brief

## Why

Elves HQ should tell the founder what actually changed across the portfolio without requiring them to inspect every room. The PRD's daily brief is the simplest next layer after task rooms because it converts existing room signals into a founder operating summary.

## What Changes

- Add a local daily brief generated from current room, run, artifact, decision, and ask signals.
- Group work into shipped, ready, blocked, failed, active, and recommended next actions.
- Expose the brief through the local daemon and the cockpit UI.
- Keep the brief local-only and computed from existing durable room data.

## Out Of Scope

- Scheduled delivery.
- Telegram delivery.
- Metrics, feedback, marketing, or revenue integrations.
- LLM-generated prose.
- Cloud sync or hosted brief history.

## Impact

- Extends the shared model package with a brief shape.
- Adds a daemon endpoint for the current local daily brief.
- Adds a cockpit panel that makes the brief visible without adding another app surface.
