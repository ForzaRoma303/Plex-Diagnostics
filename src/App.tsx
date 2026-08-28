import { useCallback, useEffect, useState } from 'react';
import type { AppSettings, DiagnosticsSnapshot } from './lib/types';
import { FirstRunWizard } from './components/FirstRunWizard';
import { OverviewPanel } from './components/OverviewPanel';
import { HostPanel } from './components/HostPanel';
import { StreamsPanel, TranscodesPanel } from './components/StreamsPanel';
import { SettingsPanel } from './components/SettingsPanel';

type Tab = 'overview' | 'host' | 'streams' | 'transcodes' | 'settings' | 'help';

const ACTIVE_REFRESH_MS = 3000;
const BACKGROUND_REFRESH_MS = 10000;

export default function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    window.plexDiagnostics
      .getSettings()
      .then(setSettings)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setLoading(false));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await window.plexDiagnostics.getSnapshot();
      setSnapshot(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!settings?.setupComplete) return;
    void refresh();
    const interval = isFocused ? ACTIVE_REFRESH_MS : BACKGROUND_REFRESH_MS;
    const id = window.setInterval(() => {
      void refresh();
    }, interval);
    return () => window.clearInterval(id);
  }, [settings?.setupComplete, isFocused, refresh]);

  if (loading) {
    return (
      <div className="app-shell">
        <div className="panel">Loading…</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="app-shell">
        <div className="panel bad">{error || 'Could not load settings.'}</div>
      </div>
    );
  }

  if (!settings.setupComplete) {
    return (
      <FirstRunWizard
        initial={settings}
        onComplete={(next) => {
          setSettings(next);
          setTab('overview');
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>Plex Diagnostics</h1>
          <span>Local health & streaming efficiency</span>
        </div>
        <nav className="nav">
          {(
            [
              ['overview', 'Overview'],
              ['host', 'Host'],
              ['streams', 'Streams'],
              ['transcodes', 'Transcodes'],
              ['settings', 'Settings'],
              ['help', 'Setup Guide'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="status-line">
        <span
          className={`dot ${snapshot?.plex.connected ? 'ok' : 'err'}`}
          title={snapshot?.plex.connected ? 'Connected' : 'Disconnected'}
        />
        <span>
          {snapshot
            ? `Updated ${new Date(snapshot.host.collectedAt).toLocaleTimeString()}`
            : 'Waiting for first sample…'}
        </span>
        {!isFocused && (
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            (Background mode: polling every 10s)
          </span>
        )}
        {settings.demoMode && (
          <span className="badge" style={{ color: 'var(--accent)', borderColor: 'var(--accent-dim)' }}>
            Demo / Simulated Mode
          </span>
        )}
        {error && <span className="bad">{error}</span>}
      </div>

      {tab === 'overview' && snapshot && <OverviewPanel snapshot={snapshot} />}
      {tab === 'host' && snapshot && <HostPanel snapshot={snapshot} />}
      {tab === 'streams' && snapshot && <StreamsPanel snapshot={snapshot} />}
      {tab === 'transcodes' && snapshot && <TranscodesPanel snapshot={snapshot} />}
      {tab === 'settings' && (
        <SettingsPanel
          settings={settings}
          onSaved={(next) => {
            setSettings(next);
            void refresh();
          }}
        />
      )}
      {tab === 'help' && (
        <div className="panel" style={{ maxWidth: 740 }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text)', marginBottom: 16 }}>Quick Setup & Diagnostic Guide</h2>
          
          <h3 style={{ fontSize: '0.95rem', color: 'var(--accent)', marginTop: 16 }}>1. Where should this app run?</h3>
          <p className="muted">
            This tool is designed to run directly on the machine running <strong>Plex Media Server</strong>. This allows it to monitor physical hardware (CPU, RAM, GPU, and disk drives) directly without needing network telemetry.
          </p>

          <h3 style={{ fontSize: '0.95rem', color: 'var(--accent)', marginTop: 16 }}>2. How to get your Plex Token</h3>
          <ol className="muted" style={{ lineHeight: 1.6, paddingLeft: 20 }}>
            <li>Open a browser, go to <a href="https://app.plex.tv" target="_blank" rel="noreferrer" style={{ color: 'var(--info)' }}>app.plex.tv</a> and sign in.</li>
            <li>Click on any movie or TV show episode in your library.</li>
            <li>Click the three dots (<strong>...</strong>) menu $\rightarrow$ <strong>Get Info</strong> $\rightarrow$ <strong>View XML</strong>.</li>
            <li>In your browser address bar URL, find and copy the value at the end after <code>X-Plex-Token=</code>.</li>
            <li>Go to the <strong>Settings</strong> tab in this app and paste the token.</li>
          </ol>

          <h3 style={{ fontSize: '0.95rem', color: 'var(--accent)', marginTop: 16 }}>3. What do the metrics mean?</h3>
          <ul className="muted" style={{ lineHeight: 1.6, paddingLeft: 20 }}>
            <li><strong>Direct Play:</strong> Client device plays media file as-is without server modification. Lowest server CPU/GPU load (ideal).</li>
            <li><strong>Transcode (hw):</strong> Video format is converted in real-time by your GPU or Intel QuickSync hardware. Efficient, low CPU usage.</li>
            <li><strong>Transcode (CPU / Software):</strong> Video format is converted entirely by the CPU cores. Heavy compute load.</li>
            <li><strong>Throttled:</strong> Transcoder has completed enough video buffer ahead of playback and paused temporarily (normal & healthy).</li>
          </ul>
        </div>
      )}

      {!snapshot && tab !== 'settings' && (
        <div className="panel">
          <div className="empty">Collecting diagnostics…</div>
        </div>
      )}
    </div>
  );
}
