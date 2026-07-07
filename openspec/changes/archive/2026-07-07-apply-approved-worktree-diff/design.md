# Design

## API

Add `POST /api/runs/:id/apply-diff`.

The route delegates to `RoomProcessManager.applyApprovedDiff(runId)` and returns:

```ts
{
  runId: string;
  sourcePath: string;
  diffPath: string;
  output: string;
  room: Room;
}
```

## Guards

The daemon rejects the apply unless all are true:

- Run is inactive, completed, and worktree-backed.
- Captured `runs/<run-id>/diff.patch` exists.
- Room has an approved founder decision.
- Room approval blockers are clear, including passed check and CodeVetter gates for diff rooms.
- Target product checkout is a git repo with a clean worktree.
- `git apply --check <diff>` succeeds in the target checkout.

## Apply Operation

The daemon runs:

```bash
git -C <sourcePath> apply --check <diffPath>
git -C <sourcePath> apply <diffPath>
```

It captures stdout/stderr in the return payload. On success it adds a log artifact and appends success logs. It does not commit, push, deploy, or clean the generated worktree automatically; existing cleanup remains explicit.

## UI

Add an `Apply` action near `Approve` and cleanup. Show returned output in a preview block. Disable is not enough for safety; the daemon is the authority.
