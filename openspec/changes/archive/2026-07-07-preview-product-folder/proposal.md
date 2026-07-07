# Preview Product Folder

## Why

Manual folder registration is now the right V0 path, but the current add-project form accepts a path without showing whether the folder exists, is a git repository, or has usable gate scripts until after the product is saved. That makes setup feel brittle and can create rooms that are blocked immediately.

## What Changes

- Add a daemon endpoint that inspects an arbitrary local path without creating a product.
- Show the inspection result inside the add-project panel before saving.
- Keep this local-only and read-only: no directory creation, repo scanning beyond the selected path, scripts, or registry import.

## Out Of Scope

- Native OS folder picker.
- Fleet registry import.
- Recursive project discovery.
- Running install/test/build commands during inspection.

## Verification

- `openspec validate preview-product-folder --strict`
- `pnpm check`
- API smoke for `POST /api/products/inspect-path`
- Live daemon/UI smoke
