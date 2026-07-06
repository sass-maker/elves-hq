# Add Room Workbench Tabs

## Why

Task rooms now collect real signals: logs, artifacts, notes, decisions, prompts, diffs, checks, reviews, transcripts, and product memory. The selected room surface exposes them, but too much of it is stacked vertically. A room should feel like a focused workbench where the founder can switch between live logs, artifacts, notes, and memory without losing the high-level task controls.

## What Changes

- Add tabs inside the selected room for `Logs`, `Artifacts`, `Notes`, and `Memory`.
- Keep the room header, ask card, acceptance criteria, and actions always visible above the tabs.
- Move existing log/artifact/note/memory sections into the tabbed workbench.
- Preserve existing preview blocks for prompts, diffs, checks, CodeVetter reports, cleanup output, and transcripts below the workbench when opened.

## Out Of Scope

- Deep linking to tabs.
- New daemon endpoints or schema changes.
- Search/filter inside logs.
