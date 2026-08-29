# Plex Diagnostics — Friend setup

This app checks whether the computer running **Plex Media Server** is healthy and streaming efficiently. Install it on the **same computer that runs Plex**.

## 1. Download the right file

From the release link you were given:

- **Windows:** `PlexDiagnostics-Setup-1.x.x.exe`
- **Mac:** `PlexDiagnostics-1.x.x-arm64.dmg` (Apple Silicon M1/M2/M3/M4) or `PlexDiagnostics-1.x.x-x64.dmg` (Intel)
- **Linux:** `PlexDiagnostics-1.x.x-x64.AppImage` or `PlexDiagnostics-1.x.x-x64.deb`

## 2. Install

### Windows

1. Double-click the `.exe`.
2. If Windows says “Windows protected your PC”:
   - Click **More info**
   - Click **Run anyway**
3. Click through the installer (Next → Install → Finish).
4. Open **Plex Diagnostics** from the desktop or Start Menu.

### Mac

1. Open the `.dmg`.
2. Drag **Plex Diagnostics** into **Applications**.
3. Open it from Applications.
4. If Mac says the app can’t be opened because it is from an unidentified developer:
   - Close the warning
   - **Right-click** (or Control-click) the app → **Open** → **Open**

### Linux

- **AppImage:** Right-click the `.AppImage` file $\rightarrow$ **Properties** $\rightarrow$ **Permissions** $\rightarrow$ check **Allow executing file as program** (or `chmod +x *.AppImage`), then double-click to run.
- **Debian / Ubuntu:** Double-click the `.deb` file or run `sudo dpkg -i PlexDiagnostics-*.deb`.

## 3. First-time setup in the app

1. Make sure **Plex Media Server is running**.
2. Get your Plex token:
   - Sign in to [app.plex.tv](https://app.plex.tv)
   - Open any library item
   - In the three-dot menu, choose **Get Info** → **View XML**
   - In the browser address bar, copy the value after `X-Plex-Token=`
3. Paste the token into Plex Diagnostics.
4. Click **Test connection**.
5. When it says Connected, click **Start monitoring**.

Leave Host as `127.0.0.1` and Port as `32400` unless someone told you otherwise.

## 4. How to read the dashboard

- **Health score** — overall status (higher is better). The app explains what dragged the score down.
- **Direct play %** — higher is better (less server work).
- **Transcodes** — each active transcode uses more CPU/GPU.
- **Throttled** — means the server is struggling to keep up with a transcode.

You do not need to change Settings unless the connection test fails.
