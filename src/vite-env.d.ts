import type { PlexDiagnosticsApi } from '../electron/preload';

declare global {
  interface Window {
    plexDiagnostics: PlexDiagnosticsApi;
  }
}

export {};
