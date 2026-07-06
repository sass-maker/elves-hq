# Task Rooms Specification Delta

## ADDED Requirements

### Requirement: Approval gate enforcement

The local daemon MUST prevent founder approval of worktree diff rooms until required verification gates have passed.

#### Scenario: Founder approves a diff without gates

- **WHEN** a room has a diff artifact
- **AND** the room does not have a passed test/check artifact
- **OR** the room does not have a passed review/CodeVetter artifact
- **THEN** the daemon rejects the approval request with an actionable blocker message
- **AND** the cockpit shows the blocker message to the founder

#### Scenario: Founder approves a diff after gates pass

- **WHEN** a room has a diff artifact
- **AND** the room has a passed test/check artifact
- **AND** the room has a passed review/CodeVetter artifact
- **AND** no current failed gate artifact remains
- **THEN** the daemon allows founder approval
