# Design

## API

Add `POST /api/products/:id/settings` with optional fields:

```ts
{
  status?: "active" | "maintain" | "paused" | "killed";
  priority?: "P0" | "P1" | "P2";
  currentGoal?: string;
}
```

The daemon validates enum fields and persists the update to SQLite. Empty `currentGoal` is allowed but normalized to a local manual-product placeholder.

## UI

Reuse the selected product folder card. Add:

- status select
- priority select
- current goal textarea
- save button
- short saved/error message

The card remains compact and local-first; folder health stays visible above settings.

## Data Flow

On successful save, the response returns `{ product, workspace }`. The cockpit replaces workspace state and keeps the updated product selected.
