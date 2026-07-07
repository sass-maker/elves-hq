## ADDED Requirements

### Requirement: Approved worktree diff apply

Elves HQ MUST let the founder apply an approved, gated worktree diff to the local product checkout without committing, pushing, deploying, or releasing.

#### Scenario: Founder applies an approved gated worktree diff

- **WHEN** a completed worktree run has a captured diff
- **AND** the room has passed check and CodeVetter gates
- **AND** the founder has approved the room
- **AND** the target product checkout is clean
- **THEN** the daemon can apply the captured diff to the product checkout
- **AND** the room records the apply action as a log artifact
- **AND** the cockpit shows the apply output

#### Scenario: Founder tries to apply before approval

- **WHEN** a completed worktree run has not been approved by the founder
- **THEN** the daemon rejects the apply with an actionable blocker
- **AND** no git apply is attempted

#### Scenario: Founder tries to apply into a dirty checkout

- **WHEN** the target product checkout has uncommitted changes
- **THEN** the daemon rejects the apply
- **AND** no generated worktree is cleaned up
