# Dark Manual Cockpit

## Why

The cockpit currently shows too much information at once and still exposes the old fleet registry import path. The founder wants a darker command-room interface, less immediate information density, draggable pane resizing instead of range sliders, and manual folder/product selection.

## What Changes

- Make the cockpit default to a dark command-room visual system.
- Replace visible range slider pane controls with draggable pane handles.
- Remove the fleet registry import CTA from the sidebar.
- Add a manual local project/folder entry flow backed by the local daemon.
- Reduce the task-room overview density by showing fewer cards and keeping detailed evidence inside the selected room/workbench.

## Out Of Scope

- Native OS folder picker permissions.
- Cloud sync or hosted product registry.
- Full product edit/delete management.
- A complete visual redesign of every deep room subpanel.
