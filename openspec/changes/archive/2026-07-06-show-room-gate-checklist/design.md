# Design

## Approach

Derive gate state in the control UI from the room's existing artifacts. A diff artifact makes the check and CodeVetter gates required. The latest artifact by type decides each gate state:

- `test` artifact with `passed` means check passed.
- `test` artifact with `failed` means check failed.
- no `test` artifact on a diff room means check missing.
- `review` artifact with `passed` means CodeVetter passed.
- `review` artifact with `failed` means CodeVetter failed.
- no `review` artifact on a diff room means CodeVetter missing.
- rooms without a diff show both gates as waiting for a diff.

Render the checklist inside the existing `Actions` card, above the command buttons, using existing button/card styling and lucide icons. The checklist is informational; the daemon remains the enforcement source.

## Verification

- `pnpm check`
- Browser smoke: room with ungated diff shows missing check and CodeVetter gates before clicking Approve.
