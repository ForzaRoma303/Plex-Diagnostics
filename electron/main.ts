import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import Store from 'electron-store';
import { collectHostMetrics } from './hostMetrics';
import { fetchPlexStatus, getMockPlexStatus, testPlexConnection } from './plexClient';
import { computeHealth } from '../src/lib/healthScore';
import { DEFAULT_SETTINGS, type AppSettings, type DiagnosticsSnapshot } from '../src/lib/types';

const store = new Store<{ settings: AppSettings }>({
  name: 'settings',
  defaults: { settings: DEFAULT_SETTINGS },
});

function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...store.get('settings') };
}

function setSettings(partial: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...partial };
  store.set('settings', next);
  return next;
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Plex Diagnostics',
    icon: iconPath,
    backgroundColor: '#0f1419',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

async function getSnapshot(): Promise<DiagnosticsSnapshot> {
  const settings = getSettings();
  const host = await collectHostMetrics(settings.mediaPaths);
  let plex = settings.demoMode
    ? getMockPlexStatus()
    : await fetchPlexStatus(settings.plexHost, settings.plexPort, settings.plexToken);

  if (settings.demoMode && !host.plexProcess.found) {
    host.plexProcess = {
      found: true,
      name: 'Plex Media Server (Simulated)',
      pid: 1234,
      cpu: 4.8,
      memPercent: 3.2,
      memRss: 420 * 1024 * 1024,
    };
  }

  const health = computeHealth(host, plex);
  return { host, plex, health };
}

function registerIpc() {
  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:set', (_event, partial: Partial<AppSettings>) => {
    return setSettings(partial);
  });

  ipcMain.handle(
    'plex:test',
    async (_event, payload: { host: string; port: number; token: string }) => {
      return testPlexConnection(payload.host, payload.port, payload.token);
    },
  );

  ipcMain.handle('diagnostics:snapshot', async () => getSnapshot());
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
