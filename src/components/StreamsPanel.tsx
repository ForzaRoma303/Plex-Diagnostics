import type { DiagnosticsSnapshot } from '../lib/types';
import { decisionLabel } from '../lib/format';

export function StreamsPanel({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const { plex } = snapshot;

  if (!plex.connected) {
    return (
      <div className="panel">
        <h2>Active streams</h2>
        <div className="empty bad">{plex.error || 'Not connected to Plex.'}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Active streams</h2>
      {plex.sessions.length === 0 ? (
        <div className="empty">No one is streaming right now.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>User</th>
              <th>Player / Network</th>
              <th>Video</th>
              <th>Audio</th>
              <th>Bandwidth</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {plex.sessions.map((session) => (
              <tr key={session.sessionKey}>
                <td>
                  <strong>{session.title}</strong>
                  {session.transcodeThrottled && (
                    <div className="warn" style={{ fontSize: '0.8rem', marginTop: 2 }}>
                      Throttled
                      {session.transcodeSpeed != null ? ` · ${session.transcodeSpeed.toFixed(1)}x` : ''}
                    </div>
                  )}
                </td>
                <td>{session.user}</td>
                <td>
                  <div>{session.player}</div>
                  <div className="row" style={{ gap: 4, marginTop: 3 }}>
                    {session.product ? <span className="muted" style={{ fontSize: '0.78rem' }}>{session.product}</span> : null}
                    {session.location === 'wan' && (
                      <span className="badge warn" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                        Remote
                      </span>
                    )}
                    {session.location === 'lan' && (
                      <span className="badge directPlay" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                        LAN
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    <span className={`badge ${session.videoDecision}`}>
                      {decisionLabel(session.videoDecision)}
                    </span>
                    {session.videoDecision === 'transcode' && session.transcodeHwRequested && (
                      <span className="badge directPlay" title="Hardware Accelerated (GPU)" style={{ fontWeight: 700 }}>
                        (hw)
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${session.audioDecision}`}>
                    {decisionLabel(session.audioDecision)}
                  </span>
                </td>
                <td>
                  {session.bandwidth ? `${(session.bandwidth / 1000).toFixed(1)} Mbps` : '—'}
                </td>
                <td className="muted" style={{ textTransform: 'capitalize' }}>{session.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function TranscodesPanel({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const { plex } = snapshot;

  if (!plex.connected) {
    return (
      <div className="panel">
        <h2>Transcodes</h2>
        <div className="empty bad">{plex.error || 'Not connected to Plex.'}</div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Transcode sessions</h2>
      {plex.transcodes.length === 0 ? (
        <div className="empty">No active transcodes.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Progress</th>
              <th>Speed</th>
              <th>Video Stream</th>
              <th>Audio Stream</th>
              <th>Hardware (GPU)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plex.transcodes.map((t) => (
              <tr key={t.key}>
                <td className="muted">{t.key}</td>
                <td>{t.progress != null ? `${t.progress.toFixed(0)}%` : '—'}</td>
                <td>{t.speed != null ? `${t.speed.toFixed(1)}x` : '—'}</td>
                <td>
                  {(t.sourceVideoCodec || '?') + ' → ' + (t.videoCodec || t.videoDecision || '?')}
                </td>
                <td>
                  {(t.sourceAudioCodec || '?') + ' → ' + (t.audioCodec || t.audioDecision || '?')}
                </td>
                <td>
                  {t.transcodeHwRequested ? (
                    <span className="badge directPlay" style={{ fontWeight: 700 }}>
                      (hw) {t.transcodeHwEncoding || 'GPU'}
                    </span>
                  ) : (
                    <span className="badge unknown">Software (CPU)</span>
                  )}
                </td>
                <td className={t.throttled ? 'warn' : 'good'}>
                  {t.throttled ? 'Throttled' : 'Active'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
