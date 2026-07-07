## Why

Worktree-backed elf runs already create isolated folders and branches, but the persisted run contract does not expose that metadata. The founder can see that a run happened, yet must infer where the work lives from logs or cleanup actions.

## What Changes

- Persist optional workspace path and branch name on room run records.
- Return the metadata through existing room run APIs.
- Show the metadata compactly in the room run list for worktree-backed runs.

## Out of scope

- Changing how worktrees or branches are named.
- Adding merge, PR, or deploy actions.
- Creating new run artifact types.
