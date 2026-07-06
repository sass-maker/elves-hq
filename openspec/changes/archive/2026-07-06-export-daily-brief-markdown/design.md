# Design

## Approach

Add `renderDailyBriefMarkdown(brief)` to `@elves-hq/core`. The renderer includes:

- generated timestamp
- totals
- recommended next actions
- shipped, ready, blocked, failed, and active sections
- item evidence when available

Expose it through `GET /api/briefs/daily.md`, returning JSON with `{ markdown, brief }` for consistency with the other preview endpoints. The UI fetches the endpoint when the founder clicks `Brief`, stores the Markdown preview in local React state, and attempts to copy it to the clipboard when available.

## Verification

- `pnpm check`
- API smoke: `GET /api/briefs/daily.md` returns Markdown containing expected headings.
- Browser smoke: click the Daily Brief export action and verify the Markdown preview appears.
