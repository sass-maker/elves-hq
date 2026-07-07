# Edit Product Settings

## Why

V0 lets the founder add local products, but core portfolio fields become fixed after creation. A founder cockpit needs fast local control over product status, priority, and current goal so the room list reflects what should actually move next.

## What Changes

- Add a local daemon endpoint to update product status, priority, and current goal.
- Add compact controls to the selected product folder card.
- Refresh workspace state after save so the sidebar and room context use the updated product settings.

## Out Of Scope

- Deleting products.
- Changing product ids or slugs.
- Bulk portfolio review.
- Metrics-based product recommendations.

## Verification

- `openspec validate edit-product-settings --strict`
- `pnpm check`
- API smoke for updating a product and reading it back from workspace
- Live daemon/UI smoke
