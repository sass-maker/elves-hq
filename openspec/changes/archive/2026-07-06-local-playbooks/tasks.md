# Tasks

- [x] Add shared playbook types and built-in playbooks.
- [x] Add optional room playbook selection to persistence.
- [x] Return playbooks through workspace state.
- [x] Let room creation choose a playbook.
- [x] Inject selected playbook into run prompts.
- [x] Show selected playbook in room detail.
- [x] Update project status and README.

## Verification

- [x] `pnpm check`
- [x] `GET /api/workspace` includes playbooks
- [x] `POST /api/rooms` accepts `playbookId`
- [x] Captured run prompt includes selected playbook
- [x] Browser smoke of playbook picker and room playbook display
