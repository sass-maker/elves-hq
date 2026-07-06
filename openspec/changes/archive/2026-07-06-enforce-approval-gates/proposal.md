# Change: Enforce Approval Gates

## Why

Rooms currently block approval when a failed gate exists, but a worktree diff can still be approved before any check or review gate has passed. That weakens the review-gated shipping promise and can create false confidence.

## What Changes

- Require worktree diff rooms to have a passed test/check artifact before approval.
- Require worktree diff rooms to have a passed review/CodeVetter artifact before approval.
- Keep failed gate blockers in place.
- Show approval blocker messages in the cockpit instead of silently ignoring failed decision requests.

## Non-Goals

- Waiver flow.
- Merge or deploy automation.
- Per-playbook gate configuration.
- Requiring gates for non-diff/manual rooms.

## Impact

- Founder approval becomes more trustworthy for generated code.
- Existing check and CodeVetter buttons become the path to unblock approval.
- No database schema change or new dependency.
