## Approach

Add nullable `workspace_path` and `branch_name` columns to the local `elf_runs` table. Existing rows remain valid. Worktree-backed launches create the run first, then create the worktree; after successful worktree creation, the daemon updates the run metadata before spawning the process.

The core `ElfRun` interface grows optional nullable `workspacePath` and `branchName` fields. Existing room run list responses can keep using `store.listRuns`, so no new API route is needed.

In the cockpit, the room run list shows a compact branch line and a monospace workspace path only when metadata exists.

## Verification

- `pnpm check`
- `openspec validate --all --strict`
- Local API smoke against `GET /api/rooms/:id/runs` after restarting the daemon
