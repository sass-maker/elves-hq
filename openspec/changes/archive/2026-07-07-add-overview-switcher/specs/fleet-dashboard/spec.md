# Fleet Dashboard Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Compact overview switcher

Elves HQ MUST keep the task-room pane compact by showing one overview panel at a time.

#### Scenario: Founder switches overview panels

- **WHEN** the founder selects Needs Me, Elf FM, Backlog, or Brief in the overview switcher
- **THEN** the cockpit shows the selected panel
- **AND** the other overview panels are hidden without losing their data or actions

#### Scenario: Founder scans hidden panel state

- **WHEN** overview panels are hidden behind the switcher
- **THEN** the switcher still shows counts for decisions, broadcasts, backlog tasks, and brief recommendations
