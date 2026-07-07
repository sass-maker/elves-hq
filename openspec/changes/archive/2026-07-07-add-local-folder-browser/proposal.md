# Add Local Folder Browser

## Why

V0 is local-only and the founder said they will pick folders manually. The current add-project flow still depends on typing or pasting a local path, which is slower and more error-prone than choosing from the local fleet workspace.

Browsers do not expose absolute folder paths through the native directory picker. Because this cockpit already runs with a trusted local daemon, the pragmatic local-first solution is a bounded folder browser served by the daemon.

## What Changes

- Add a daemon endpoint that lists child directories under the fleet root.
- Add a compact folder browser to the add-project panel.
- Let the founder navigate folders and select one to fill the project path.
- Reuse the existing draft folder inspection after a folder is selected.

## Out Of Scope

- Reading file contents.
- Running project scripts.
- Browsing outside the fleet root.
- A full filesystem manager.
- Cloud sync, upload, or browser-native File System Access persistence.
