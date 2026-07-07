# close-stale-rooms design

The existing decision flow is the right integration point. `resolveDecision` already clears asks, persists a decision, optionally stores a note, updates room status, and logs the founder action.

Implementation:

- Extend `DecisionAction` with `close`.
- Extend `Decision.status` with `closed`.
- Add a `close` branch to `decisionResolution`.
- Add `close` to the room command picker as a neutral Decision command.

Closing a room is intentionally different from `reject`: it communicates "not worth continuing" rather than "the output was bad." It should not require approval gates because it is not a shipping action.
