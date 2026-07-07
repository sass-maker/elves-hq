# Design

## Approach

Compute product pulse rows in the React cockpit from `WorkspaceSeed`. For each product, inspect linked rooms and choose the highest-signal status using the existing room status order:

`asking`, `working`, `ready`, `blocked`, `failed`, `idle`, `done`.

The row summary uses the first matching room for that status, or the product's current goal when no room exists.

## UI

Render a compact panel in the fleet sidebar above the project list:

- product name and priority
- dominant status badge
- colored horizontal status stripe
- active room count and needs-you count
- one-line artifact-backed summary

The panel is navigation, not a metrics dashboard. It uses existing product selection behavior.

## Data

No schema or API changes are required. The panel uses existing products and rooms already returned by `/api/workspace`.
