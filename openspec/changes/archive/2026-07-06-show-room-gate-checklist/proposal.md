# Show Room Gate Checklist

## Why

Approval is now correctly blocked when a diff is missing verification gates, but the room UI only explains that after the founder clicks Approve. A cockpit should show the gate state before the decision, so the founder can see what is missing, what passed, and what failed without guessing.

## What Changes

- Add a compact gate checklist to the room action panel.
- Show check and CodeVetter states for diff rooms: missing, passed, failed, or not required yet.
- Keep actions local to the existing room detail surface; no new backend endpoints.

## Out Of Scope

- Changing gate execution behavior.
- Adding new gate types.
- Persisting separate gate records beyond existing artifacts.
