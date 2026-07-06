# Tasks

- [x] Add shared product memory types and section definitions.
- [x] Add ignored local memory directory.
- [x] Add daemon read/write endpoints for product memory.
- [x] Inject product memory into generated run prompts.
- [x] Add cockpit memory editor in selected room.
- [x] Update project status and README.

## Verification

- [x] `pnpm check`
- [x] `GET /api/products/:id/memory`
- [x] `POST /api/products/:id/memory/:section`
- [x] Run prompt includes saved product memory
- [x] Browser smoke of memory editor
