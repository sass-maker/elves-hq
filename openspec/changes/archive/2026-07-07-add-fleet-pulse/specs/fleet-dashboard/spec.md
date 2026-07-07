# Fleet Dashboard Specification

## Purpose
Define the product-first far-view dashboard surface for local portfolio awareness.

## ADDED Requirements

### Requirement: Product fleet pulse

Elves HQ MUST show product-first status rows derived from existing room signals.

#### Scenario: Founder opens the cockpit

- **WHEN** the local workspace has registered products
- **THEN** the cockpit shows a Fleet Pulse row for each product
- **AND** each row includes the product name, priority, dominant room signal, room counts, and a concise summary
- **AND** the signal is derived from stored room state rather than a fake progress value

#### Scenario: Founder selects a pulse row

- **WHEN** the founder selects a product row in Fleet Pulse
- **THEN** the cockpit filters the task-room pane to that product
