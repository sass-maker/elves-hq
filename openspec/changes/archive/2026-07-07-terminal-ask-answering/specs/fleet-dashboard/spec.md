# Fleet Dashboard Specification Delta

## ADDED Requirements

### Requirement: Command-center terminals answer elf asks

Elves HQ MUST let the founder answer an active elf ask directly in the task terminal.

#### Scenario: A terminal has an active ask

- **WHEN** a command-center task terminal has an unresolved elf ask
- **THEN** the terminal shows the ask question and available options
- **AND** run-start controls are secondary or disabled until the ask is answered

#### Scenario: Founder answers from the terminal

- **WHEN** the founder selects an ask option from the terminal
- **THEN** the cockpit submits the answer through the existing ask answer action
- **AND** any text in the terminal instruction line is sent as optional answer context
- **AND** the terminal refreshes with the updated room state
