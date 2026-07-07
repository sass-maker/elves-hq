# Design

## Daemon

Add `GET /api/folders?path=<optional-local-path>` to the local daemon.

Behavior:

- Root defaults to the fleet directory, one level above the `elves-hq` repo.
- Requested paths must resolve inside the fleet directory.
- Response includes current directory, parent directory when still inside the root, and child directories only.
- Hidden directories and dependency/build directories are omitted by default.
- The endpoint only uses `fs.readdirSync(..., { withFileTypes: true })`; it does not inspect file contents or run scripts.

## UI

Add folder-browser state to the cockpit:

- current browser path
- directory listing
- loading/error state

When the add-project panel opens, load the root listing. The panel shows:

- current path
- parent button when available
- directory buttons
- a select-this-folder action that fills `newProduct.localPath`

After selection, the existing draft folder inspection flow continues to provide health metadata.

## Security

The browser endpoint is local-only but still bounded. It must reject traversal outside the fleet root and should not expose env files, file content, secrets, SSH keys, or cloud credential paths.
