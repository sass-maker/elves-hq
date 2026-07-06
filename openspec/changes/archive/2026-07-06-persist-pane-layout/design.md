# Design

## Approach

Use a small layout control row in the task-room header. The main grid receives its column template from React state:

- `fleet`: sidebar width in pixels.
- `rooms`: room-list width in pixels.
- `detail`: remaining width through `minmax(380px, 1fr)`.

Persist `{ fleet, rooms }` under an `elves-hq:pane-layout:v1` localStorage key. Clamp values on load so old or hand-edited storage cannot create unusable panes.

Use range inputs because the control is numeric sizing. Keep the controls compact and icon-led so the cockpit stays operational, not settings-heavy.

## Verification

- `pnpm check`
- Browser smoke: move a slider, reload, verify the chosen width persists, then reset.
