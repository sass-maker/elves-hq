# Apply Approved Worktree Diff

## Why

V0 can launch isolated worktree runs, capture diffs, run gates, and record founder approval, but it still stops before the reviewed code can land in the local product checkout. The worktree branch is intentionally not committed by elves, so a git branch merge would usually be a no-op. The right local V0 action is to apply the captured, approved patch to the clean product checkout.

## What Changes

- Add a guarded local apply action for completed worktree runs with captured diffs.
- Require founder approval and passed verification gates before applying.
- Refuse apply when the target product checkout is dirty, the run is not a completed worktree run, or the diff cannot apply cleanly.
- Surface apply output as room logs/artifacts and in the cockpit action panel.

## Out Of Scope

- Commit, push, deploy, release, or open PR.
- Auto-apply without founder action.
- Conflict resolution UI.
- Applying non-Elves diffs.

## Verification

- `openspec validate apply-approved-worktree-diff --strict`
- `pnpm check`
- API smoke with a temporary local git repo proving apply is blocked before approval and succeeds after approval and gates
- Live daemon/UI smoke
