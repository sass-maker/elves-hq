# Product Memory Specification

## ADDED Requirements

### Requirement: Local product memory

Elves HQ MUST store editable product memory locally per product.

#### Scenario: Founder opens product memory

- **WHEN** the founder opens a room for a product
- **THEN** the cockpit can show memory sections for that product
- **AND** each section is backed by a local Markdown file

### Requirement: Memory editing

The founder MUST be able to update a product memory section from the cockpit.

#### Scenario: Founder saves a memory section

- **WHEN** the founder edits and saves a product memory section
- **THEN** the daemon writes the section body to the local Markdown file
- **AND** the cockpit shows the saved body after refresh

### Requirement: Memory prompt injection

Generated run prompts MUST include product memory for the room's product.

#### Scenario: Elf run starts after memory is saved

- **WHEN** a room run starts for a product with saved memory
- **THEN** the captured run prompt includes the saved product memory content
