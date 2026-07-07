# Design

The command-center already builds an ordered `terminalDrawerEntries` list from active rooms. This change wraps that list in client-side pagination:

- Compute pages with the existing `chunkArray` helper.
- Keep a `terminalPage` state in `TerminalCommandCenter`.
- Clamp the page when the terminal set changes.
- Render only the current page in the multi-terminal grid.
- Keep the focused terminal rail backed by the full terminal set so focus mode can still jump across all rooms.
- Persist drawer dimensions by room id as before.

The first page remains high-signal because `selectCommandCenterRooms` already orders intervention and primary rooms before secondary rooms.
