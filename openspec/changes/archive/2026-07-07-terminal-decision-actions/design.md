# Design

## Approach

The dashboard already receives `decisionItems`. The command center can map those by room id and pass the best matching item to each terminal drawer. The terminal footer chooses action controls in this priority order:

1. active ask options
2. active run stop
3. decision actions
4. normal read/build/dry run controls

## Action Mapping

- `Approve` -> `approve`
- `Request fix` -> `request_fix`
- `Retry` -> `retry`
- `Reject` -> `reject`
- `Snooze` -> `snooze`
- `Close` -> `close`

Only the first few high-signal actions are shown to keep terminal drawers calm. The full workbench remains available through the inspect action.

## Verification

- `openspec validate terminal-decision-actions --strict`
- `pnpm check`
- local dev smoke for UI and daemon availability
