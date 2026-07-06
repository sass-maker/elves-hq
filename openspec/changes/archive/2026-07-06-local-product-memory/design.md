# Design: Local Product Memory

## Storage

Product memory is stored as Markdown files under:

```text
memory/<product-slug>/<SECTION>.md
```

The directory is ignored by git. This makes memory local-first, inspectable, and editable outside the app without writing into product repos.

## Sections

V0 starts with the sections needed for useful run context:

- `PRODUCT.md`
- `STRATEGY.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `DO_NOT_DO.md`
- `RECENT_LEARNINGS.md`

More PRD sections can be added later after the editing loop is useful.

## Prompt Injection

Run prompts include the current product memory sections after task acceptance criteria and before room notes. Memory does not override explicit founder instructions, but it gives elves durable context.

## UI

The selected room shows product memory for the room's product. The founder can select a section, edit Markdown, and save it locally.
