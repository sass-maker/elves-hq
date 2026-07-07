# Product Memory Specification Delta

## ADDED Requirements

### Requirement: Expanded product memory sections

Elves HQ MUST expose the V0 product memory sections needed to guide recurring elf work.

#### Scenario: Founder opens expanded product memory

- **WHEN** the founder opens product memory for a room
- **THEN** the cockpit can show Product, Strategy, Customers, Roadmap, Architecture, Decisions, Do Not Do, Recent Learnings, Feedback, Metrics, and Brand sections
- **AND** each section is backed by a local Markdown file

#### Scenario: Founder saves an expanded memory section

- **WHEN** the founder saves Customers, Roadmap, Feedback, Metrics, or Brand memory
- **THEN** the daemon accepts the section key
- **AND** writes the body to the matching local Markdown file
