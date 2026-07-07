# Add Fleet Pulse

## Why

The cockpit has project navigation and room cards, but it still lacks a product-first far-view strip that answers the core question quickly: which products are moving, stuck, ready, or quiet. The founder should not need to read every room card to understand portfolio state.

## What Changes

- Add a compact Fleet Pulse panel to the local cockpit.
- Show one row per product with a status color stripe, dominant signal, current room summary, and counts.
- Derive every row from existing room signals and product metadata.
- Clicking a row selects that product.

## Out Of Scope

- Metrics integrations.
- Momentum scoring.
- AI recommendations to pause or kill products.
- New daemon endpoints.
