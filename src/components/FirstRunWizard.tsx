import { useState } from 'react';
import type { AppSettings, ConnectionTestResult } from '../lib/types';

interface Props {
  initial: AppSettings;
  onComplete: (settings: AppSettings) => void;
}

export function FirstRunWizard({ initial, onComplete }: Props) {
  const [host, setHost] = useState(initial.plexHost);
  const [port, setPort] = useState(String(initial.plexPort));
  const [token, setToken] = useState(initial.plexToken);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ConnectionTestResult | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function finish() {
    setSaving(true);
    try {
      const settings = await window.plexDiagnostics.setSettings({
        plexHost: host.trim() || '127.0.0.1',
        plexPort: Number(port) || 32400,
        plexToken: token.trim(),
        setupComplete: true,
      });
      onComplete(settings);
    } finally {
      setSaving(false);
    }
  }

  async function startDemo() {
    setSaving(true);
    try {
      const settings = await window.plexDiagnostics.setSettings({
        demoMode: true,
        setupComplete: true,
      });
      onComplete(settings);
    } finally {
      setSaving(false);
    }
  }

  const canFinish = Boolean(token.trim()) && result?.ok;

  return (
    <div className="app-shell">
      <div className="panel wizard">
        <h1>Welcome to Plex Diagnostics</h1>
        <p className="muted">
          This app checks the health of the computer running Plex Media Server. Install and run it
          on the same machine as Plex.
        </p>

        <ol>
          <li>
            Make sure <strong>Plex Media Server is running</strong> on this computer.
          </li>
          <li>
            Get your Plex token: sign in at plex.tv, open any media item, view XML, and copy the{' '}
            <strong>X-Plex-Token</strong> value from the URL. Or search “find plex token” for a
            short guide.
          </li>
          <li>Paste the token below and click <strong>Test connection</strong>.</li>
        </ol>

        <div className="form" style={{ marginTop: 18 }}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="host">Plex host</label>
              <input
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="127.0.0.1"
              />
            </div>
            <div className="field" style={{ width: 120 }}>
              <label htmlFor="port">Port</label>
              <input
                id="port"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="32400"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="token">Plex token</label>
            <textarea
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste X-Plex-Token here"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="row">
            <button className="btn secondary" type="button" onClick={testConnection} disabled={testing}>
              {testing ? 'Testing…' : 'Test connection'}
            </button>
            <button className="btn" type="button" onClick={finish} disabled={!canFinish || saving}>
              {saving ? 'Saving…' : 'Start monitoring'}
            </button>
          </div>

          {result && (
            <p className={result.ok ? 'good' : 'bad'}>
              {result.ok
                ? `Connected${result.version ? ` (Plex ${result.version})` : ''}.`
                : result.error}
            </p>
          )}

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <p className="muted" style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
              Don't have Plex on this machine right now? You can explore real hardware monitoring with simulated Plex activity.
            </p>
            <button
              className="btn secondary"
              type="button"
              onClick={startDemo}
              disabled={saving}
            >
              Explore in Demo Mode (Simulated Plex)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
