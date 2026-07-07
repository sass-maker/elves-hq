# Design

## Approach

Elf FM is a derived read model, not a new persistence layer. The shared core package will convert the current workspace into:

- station summaries for active/asking/ready/blocked/failed rooms
- a global mix with aggregate counts
- transcript lines backed by room logs, artifacts, asks, and decisions

The local daemon returns the feed from `GET /api/fm/feed`. The cockpit renders a compact panel near the Daily Brief because both are ambient operating summaries, but Elf FM is more "what is happening now" while Daily Brief is "what happened today."

## Evidence Rules

Every transcript item must cite its source type:

- `ask`
- `artifact`
- `decision`
- `log`
- `status`

The UI must not imply that an elf is making progress unless the feed item is backed by current room state.

## Future Audio Path

The feed shape should remain stable enough for later voice narration:

- station title
- now-playing line
- transcript item title/body/source
- room and product identifiers

Audio is explicitly out of scope for this change.
