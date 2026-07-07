# Add Room Output Shelf

## Why

The selected room pane can still become noisy because prompt, transcript, diff, check, CodeVetter, cleanup, and apply previews render as separate full-width sections. A founder should be able to inspect those artifacts, but they should live in one organized evidence surface rather than expanding the page every time an output is opened.

## What Changes

- Add an Outputs tab to the existing room workbench.
- Move generated preview content into that tab.
- Keep the existing action buttons and preview-fetching behavior unchanged.
- Show a quiet empty state when no preview has been opened yet.

## Out Of Scope

- New persistence for previews.
- New daemon endpoints.
- Download/export behavior.
- Full visual redesign of the room detail pane.
