# Add Check Gate Selector

## Why

The daemon can run different package-script gates (`check`, `typecheck`, `test`, or `build`), and product folder inspection already detects which scripts exist. The room UI currently sends `typecheck` unconditionally. That makes the review gate less useful for products whose real gate is `check`, `test`, or `build`.

## What Changes

- Add a compact check-gate selector to the room action panel.
- Populate detected gate scripts from product folder inspection.
- Send the selected script key when the founder clicks Check.
- Keep an Auto option that lets the daemon choose the first available gate.

## Out Of Scope

- Running multiple gates in one click.
- Editing package scripts.
- Scheduling recurring checks.
- New daemon endpoints or schema changes.
