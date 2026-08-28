# Plex Diagnostics

Desktop app for Windows and macOS that measures health and streaming efficiency of a **local** Plex Media Server (same machine).

## Features

- Host metrics: CPU, RAM, disks, GPU, Plex process
- Plex sessions and transcode status via the local API
- Transparent health score with explanations
- First-run setup wizard for non-technical users
- Packaged installers for handoff to a friend

## Develop

```bash
npm install
npm run dev
```

## Build installers

```bash
# Windows (from Windows)
npm run dist:win

# macOS (from macOS, or via GitHub Actions)
npm run dist:mac
```

Installers land in `release/`.

Tagging a release on GitHub also builds both platforms via Actions.

## Friend handoff

See [FRIEND_SETUP.md](FRIEND_SETUP.md).

## Plex token

The app needs an `X-Plex-Token` for the local server (`http://127.0.0.1:32400`). Settings are stored locally with electron-store and are never committed to git.
