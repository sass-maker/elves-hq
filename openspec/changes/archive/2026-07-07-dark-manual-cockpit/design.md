# Design

## Product Registry

The daemon will expose `POST /api/products` for manual local products. The user enters a product name and local path; the daemon derives a stable slug/id and stores the product in SQLite. The old import endpoint and sidebar button are removed from the primary cockpit.

## Pane Resizing

The cockpit keeps the persisted pane widths but swaps slider inputs for pointer-driven handles between panes. Handles update the same local storage state and work only in the desktop grid layout.

## Information Density

The overview should privilege:

- product list
- Needs Me summary
- Elf FM
- a small set of visible task-room cards

Daily Brief remains available but is collapsed by default. Room evidence stays in the selected room workbench.

## Dark UI

Use the current local shadcn-style primitives and Tailwind utilities. No new UI dependency is required. The dark mode is local to the cockpit app and should keep status colors high contrast.
