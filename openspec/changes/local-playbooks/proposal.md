# Change: Local Playbooks

## Why

Elves HQ needs reusable workflows so rooms do not depend on ad hoc prompts every time. The PRD names playbooks as the repeatable operating layer for common elf work such as shipping a small feature, fixing a bug, reviewing a diff, and preparing a brief.

## What Changes

- Add built-in local playbook definitions.
- Let the founder choose a playbook when creating a room.
- Persist the selected playbook with the room.
- Inject selected playbook steps, gates, and escalation rules into generated run prompts.
- Show the selected playbook in the room detail.

## Out Of Scope

- Marketplace or plugin store.
- User-authored playbook editor.
- Scheduled playbooks.
- Automatic playbook selection.
- Multi-agent orchestration.

## Impact

- Extends shared models with playbooks.
- Adds a small SQLite schema migration for room playbook selection.
- Updates daemon room creation and prompt generation.
- Adds a cockpit playbook picker.
