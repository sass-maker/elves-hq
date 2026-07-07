# Inspect Project Folders

## Why

Manual local project folders are now the product registry source of truth, but the cockpit does not tell the founder whether a folder is usable before an elf tries to create a worktree or run checks. The cockpit should show folder health up front: path existence, git status, package manager, and available scripts.

## What Changes

- Add a daemon inspection endpoint for a registered product folder.
- Detect whether the path exists, is a directory, is a git repository, has `package.json`, and exposes common package scripts.
- Show a compact folder health card for the selected product in the cockpit.
- Keep this read-only; no package install, git mutation, or dependency changes.

## Out Of Scope

- Native folder picker.
- Editing product paths after creation.
- Running package scripts from the inspection card.
- Non-JavaScript language-specific test detection beyond git and package metadata.
