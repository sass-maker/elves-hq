# Expand Product Memory Sections

## Why

Product Memory is one of the core differentiators of Elves HQ: each product should carry durable context into elf runs. The current V0 exposes only six sections. The product brief calls for a richer local memory set that includes customers, roadmap, feedback, metrics, and brand context. Adding those sections makes the existing prompt injection more useful without adding automation or cloud state.

## What Changes

- Add local Markdown-backed memory sections for Customers, Roadmap, Feedback, Metrics, and Brand.
- Keep existing memory editing and prompt injection behavior.
- Update daemon validation so the new sections can be saved from the cockpit.
- Update docs/status to reflect the expanded memory surface.

## Out Of Scope

- Automatic memory updates.
- Feedback or metrics ingestion.
- Cloud sync.
- Evidence review workflow for memory changes.
