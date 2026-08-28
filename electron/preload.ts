import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppSettings,
  ConnectionTestResult,
  DiagnosticsSnapshot,
} from '../src/lib/types';

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  setSettings: (partial: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:set', partial),
  testPlex: (payload: {
    host: string;
    port: number;
    token: string;
  }): Promise<ConnectionTestResult> => ipcRenderer.invoke('plex:test', payload),
  getSnapshot: (): Promise<DiagnosticsSnapshot> => ipcRenderer.invoke('diagnostics:snapshot'),
};

contextBridge.exposeInMainWorld('plexDiagnostics', api);

export type PlexDiagnosticsApi = typeof api;
