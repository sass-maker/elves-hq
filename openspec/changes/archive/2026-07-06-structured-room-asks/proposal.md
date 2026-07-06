# Change: Structured Room Asks

## Why

Task rooms should not require the founder to read raw logs to notice when an elf needs judgment. The V0 already has room asks and a Needs Me queue, but active runs do not yet have a structured way to create asks from elf output.

## What Changes

- Define a simple local ask marker that an elf can print during a run.
- Parse that marker from room run output.
- Persist the parsed ask in the room.
- Mark the room `asking` when an unresolved ask is created.
- Keep the original log line visible for auditability.

## Non-Goals

- Natural-language ask detection.
- Telegram delivery.
- Multi-turn chat inside the room.
- Automatic decision selection from founder replies.

## Impact

- Local daemon run logging gains one parser for explicit ask lines.
- Existing room ask UI and Needs Me queue become useful for live runs.
- No production deploy, cloud service, secret, or external dependency changes.
