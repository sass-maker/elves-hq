# Design: Local Playbooks

## Shape

A playbook has:

- inputs
- required context
- steps
- allowed tools
- required gates
- escalation rules
- completion criteria

V0 playbooks are TypeScript seed definitions in the shared package. They are available through the workspace API alongside products, rooms, and tasks.

## Built-In Playbooks

- Ship Small Feature
- Fix Bug
- Fix Failing Test
- Review Diff
- Refactor Safely
- Daily Brief

## Room Link

Rooms store an optional `playbookId`. The selected playbook is shown in the room detail and included in the run prompt.

## Prompt Injection

Run prompts include the selected playbook after product memory and before room notes. This gives elves procedural guidance while preserving founder notes and acceptance criteria as higher-priority room context.
