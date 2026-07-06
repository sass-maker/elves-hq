# Export Daily Brief Markdown

## Why

The cockpit generates a Daily Brief, but V0 needs it to be an operating artifact, not only an in-app card. A founder should be able to copy or preview the brief as Markdown for notes, Telegram later, a journal, or handoff to another elf.

## What Changes

- Add a shared Markdown renderer for the current Daily Brief.
- Add a daemon endpoint that returns the current Daily Brief as Markdown.
- Add cockpit controls to copy and preview the Markdown brief.
- Keep the existing visual Daily Brief panel intact.

## Out Of Scope

- Scheduled delivery.
- Telegram integration.
- Persisting historical briefs.
