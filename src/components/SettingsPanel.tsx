import { useState } from 'react';
import type { AppSettings, ConnectionTestResult } from '../lib/types';

interface Props {
  settings: AppSettings;
  onSaved: (settings: AppSettings) => void;
}

export function SettingsPanel({ settings, onSaved }: Props) {
  const [host, setHost] = useState(settings.plexHost);
  const [port, setPort] = useState(String(settings.plexPort));
  const [token, setToken] = useState(settings.plexToken);
  const [mediaPaths, setMediaPaths] = useState(settings.mediaPaths.join('\n'));
  const [demoMode, setDemoMode] = useState(Boolean(settings.demoMode));
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function testConnection() {
    setTesting(true);
    setResult(null);
    try {
      const res = await window.plexDiagnostics.testPlex({
        host: host.trim() || '127.0.0.1',
        port: Number(port) || 32400,
        token: token.trim(),
      });
      setResult(res);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const next = await window.plexDiagnostics.setSettings({
        plexHost: host.trim() || '127.0.0.1',
        plexPort: Number(port) || 32400,
        plexToken: token.trim(),
        demoMode,
        mediaPaths: mediaPaths
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        setupComplete: true,
      });
      onSaved(next);
      setMessage('Settings saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h2>Settings</h2>
      <div className="form">
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="settings-host">Plex host</label>
            <input id="settings-host" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label htmlFor="settings-port">Port</label>
            <input id="settings-port" value={port} onChange={(e) => setPort(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="settings-token">Plex token</label>
          <textarea
            id="settings-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="field">
          <label htmlFor="settings-paths">Media paths (optional, one per line)</label>
          <textarea
            id="settings-paths"
            value={mediaPaths}
            onChange={(e) => setMediaPaths(e.target.value)}
            placeholder={'D:\\Media\n/Volumes/Media'}
          />
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            If set, disk health focuses on these volumes. Leave blank to show all drives.
          </span>
        </div>

        <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <input
            id="settings-demo"
            type="checkbox"
            checked={demoMode}
            onChange={(e) => setDemoMode(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <label htmlFor="settings-demo" style={{ cursor: 'pointer', userSelect: 'none' }}>
            Demo / Simulation Mode (use simulated Plex stream activity)
          </label>
        </div>

        <div className="row">
          <button className="btn secondary" type="button" onClick={testConnection} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button className="btn" type="button" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        {result && (
          <p className={result.ok ? 'good' : 'bad'}>
            {result.ok
              ? `Connected${result.version ? ` (Plex ${result.version})` : ''}.`
              : result.error}
          </p>
        )}
        {message && <p className="good">{message}</p>}
      </div>
    </div>
  );
}
