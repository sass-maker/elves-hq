# Add Retry Budget Guard

## Why

The cockpit already enforces a runtime cap, but retry can still be pressed repeatedly after failed or killed runs. That violates the V0 goal of avoiding terminal babysitting and wasted agent loops. Repeated failures should become a founder decision, not silent retry churn.

## What Changes

- Add a daemon retry budget for repeated failed/killed attempts in the same room and mode.
- Default the budget to 3 failed/killed attempts, configurable by environment.
- When the budget is exhausted, reject retry, mark the room blocked, and append a warning log that explains the next action.
- Surface the daemon blocker through the existing room decision preview.

## Out Of Scope

- Token/cost accounting.
- Semantic loop detection from log similarity.
- Automatic task decomposition or fix generation.

## Verification

- `openspec validate add-retry-budget-guard --strict`
- `pnpm check`
- API smoke that creates failed runs and verifies retry is blocked at the budget
- Live daemon/UI smoke
