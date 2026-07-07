## ADDED Requirements

### Requirement: Paged terminal canvas

Elves HQ MUST keep the command-center terminal dashboard calm when many active rooms exist.

#### Scenario: Active terminal set is larger than one page

- **WHEN** the command center has more terminal drawers than fit the current page size
- **THEN** the dashboard shows one page of terminal drawers at a time
- **AND** the founder can move to previous or next terminal pages
- **AND** the page indicator shows current page and total pages

#### Scenario: Terminal set changes

- **WHEN** rooms are created, closed, completed, or filtered by project
- **THEN** the terminal page remains within the available page range
- **AND** focused terminal mode still has access to the full terminal set
