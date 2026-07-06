# Change: Local Product Memory

## Why

Elves HQ needs durable product context so elves do not start every room cold. The PRD calls for Product Memory as the persistent context layer behind task rooms, decisions, and run prompts.

## What Changes

- Add local Markdown-backed product memory sections per product.
- Expose product memory through the local daemon.
- Let the founder edit memory from the cockpit.
- Inject product memory into generated run prompts.

## Out Of Scope

- Automatic memory updates from elf output.
- Memory review workflows.
- Cross-device sync.
- Cloud storage.
- Vector search or embeddings.
- Playbooks.

## Impact

- Adds ignored local `memory/` files owned by Elves HQ.
- Extends shared model types with product memory shapes.
- Adds local daemon endpoints for reading and writing memory sections.
- Adds UI controls in the selected room surface.
