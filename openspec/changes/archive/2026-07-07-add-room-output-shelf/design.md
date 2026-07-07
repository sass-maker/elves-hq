# Design

## Approach

Extend the existing `RoomWorkbench` component with an `outputs` tab. Pass the current preview strings into the workbench and render them as compact titled output blocks inside that tab.

## UI

The Outputs tab appears next to Timeline, Logs, Artifacts, Notes, and Memory. Preview blocks use the existing dark monospace styling and keep max-height scrolling per output, so large diffs or logs do not expand the whole room detail pane.

## Behavior

Room action buttons still populate the same preview state. The difference is presentation: opened outputs are inspected from the workbench tab instead of appended below the rest of the room.
