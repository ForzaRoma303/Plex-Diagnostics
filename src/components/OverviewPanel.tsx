import type { CSSProperties } from 'react';
import type { DiagnosticsSnapshot } from '../lib/types';
import { formatBytes, scoreColor } from '../lib/format';

import { useState, type CSSProperties } from 'react';
import type { DiagnosticsSnapshot } from '../lib/types';
import { formatBytes, scoreColor } from '../lib/format';

export function OverviewPanel({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const { health, host, plex } = snapshot;
  const ringColor = scoreColor(health.score);
  const [copied, setCopied] = useState(false);

  function generateSummaryText(): string {
    const lines = [
      '=== PLEX DIAGNOSTICS REPORT ===',
      `Timestamp: ${new Date().toLocaleString()}`,
      `Host: ${host.hostname} (${host.platform})`,
      `Health Score: ${health.score}/100 [${health.grade.toUpperCase()}]`,
      `Summary: ${health.summary}`,
      '',
      '--- HARDWARE & HOST METRICS ---',
      `CPU Load: ${host.cpu.currentLoad.toFixed(1)}% (${host.cpu.cores.length} logical cores)`,
      `Memory: ${formatBytes(host.memory.used)} / ${formatBytes(host.memory.total)} (${host.memory.percent.toFixed(1)}% used)`,
      `Plex Process: ${host.plexProcess.found ? `Running (PID ${host.plexProcess.pid}, ${(host.plexProcess.cpu ?? 0).toFixed(1)}% CPU, ${(host.plexProcess.memPercent ?? 0).toFixed(1)}% RAM)` : 'Not Detected'}`,
      `Disks:`,
      ...host.disks.map((d) => `  - ${d.mount} (${d.type}): ${formatBytes(d.available)} free of ${formatBytes(d.size)} (${d.percent}% full)`),
      `GPUs:`,
      ...(host.gpus.length ? host.gpus.map((g) => `  - ${g.model}: ${g.utilization != null ? `${g.utilization}% load` : 'Active'} (VRAM: ${formatBytes(g.memoryUsed)} / ${formatBytes(g.memoryTotal)})`) : ['  - None detected']),
      '',
      '--- PLEX SERVER STATUS ---',
      `Connection: ${plex.connected ? `Connected (${plex.serverName || 'Plex'} v${plex.version || 'unknown'})` : `Disconnected (${plex.error || 'unreachable'})`}`,
      `Active Streams: ${health.efficiency.activeStreams}`,
      `Direct Play Rate: ${health.efficiency.directPlayPercent}%`,
      `Active Transcodes: ${health.efficiency.transcodeCount} (${health.efficiency.throttledCount} throttled)`,
    ];

    if (plex.sessions.length > 0) {
      lines.push('', 'Active Sessions:');
      for (const s of plex.sessions) {
        lines.push(`  - "${s.title}" | User: ${s.user} | Player: ${s.player} (${s.location?.toUpperCase() || 'UNKNOWN'}) | Video: ${s.videoDecision}${s.transcodeHwRequested ? ' (hw)' : ''} | Audio: ${s.audioDecision}${s.transcodeThrottled ? ' [THROTTLED]' : ''}`);
      }
    }

    if (plex.transcodes.length > 0) {
      lines.push('', 'Transcode Details:');
      for (const t of plex.transcodes) {
        lines.push(`  - Key: ${t.key} | Speed: ${t.speed != null ? `${t.speed}x` : '—'} | ${t.sourceVideoCodec} -> ${t.videoCodec} | ${t.transcodeHwRequested ? `HW (${t.transcodeHwEncoding || 'GPU'})` : 'Software (CPU)'}`);
      }
    }

    lines.push('', '===============================');
    return lines.join('\n');
  }

  async function copyReport() {
    try {
      const text = generateSummaryText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  return (
    <>
      <div className="grid-2">
        <div className="panel">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Health score</h2>
            <button
              className="btn secondary"
              type="button"
              onClick={copyReport}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {copied ? '✓ Report Copied!' : 'Copy Diagnostic Report'}
            </button>
          </div>
          <div className="score-hero">
            <div
              className="score-ring"
              style={
                {
                  '--score': health.score,
                  '--ring-color': ringColor,
                } as CSSProperties
              }
            >
              <strong>{health.score}</strong>
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 650, textTransform: 'capitalize' }}>
                {health.grade}
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {health.summary}
              </p>
              <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.85rem' }}>
                {host.hostname} · {host.platform}
              </p>
            </div>
          </div>
        </div>

        <div className="panel">
          <h2>Efficiency snapshot</h2>
          <div className="grid-2">
            <div className="stat">
              <div className="label">Active streams</div>
              <div className="value">{health.efficiency.activeStreams}</div>
            </div>
            <div className="stat">
              <div className="label">Direct play</div>
              <div className="value">{health.efficiency.directPlayPercent}%</div>
            </div>
            <div className="stat">
              <div className="label">Transcodes</div>
              <div className="value">{health.efficiency.transcodeCount}</div>
            </div>
            <div className="stat">
              <div className="label">Throttled</div>
              <div className={`value ${health.efficiency.throttledCount ? 'warn' : ''}`}>
                {health.efficiency.throttledCount}
              </div>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
            {plex.connected
              ? `Connected to ${plex.serverName || 'Plex'}${plex.version ? ` · v${plex.version}` : ''}`
              : plex.error || 'Not connected to Plex'}
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>What affects the score</h2>
        <div className="factor-list">
          {health.factors.map((factor) => (
            <div className="factor" key={factor.id}>
              <div>{factor.label}</div>
              <div className="bar">
                <span style={{ width: `${factor.score}%`, background: scoreColor(factor.score) }} />
              </div>
              <div className="muted" style={{ fontSize: '0.85rem', textAlign: 'right' }}>
                {Math.round(factor.score)} · {factor.detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Quick host glance</h2>
        <div className="grid-4">
          <div className="stat">
            <div className="label">CPU</div>
            <div className="value">{host.cpu.currentLoad.toFixed(0)}%</div>
          </div>
          <div className="stat">
            <div className="label">RAM</div>
            <div className="value">{host.memory.percent.toFixed(0)}%</div>
            <div className="sub">
              {formatBytes(host.memory.used)} / {formatBytes(host.memory.total)}
            </div>
          </div>
          <div className="stat">
            <div className="label">Plex process</div>
            <div className="value">
              {host.plexProcess.found ? `${(host.plexProcess.cpu ?? 0).toFixed(0)}%` : '—'}
            </div>
            <div className="sub">
              {host.plexProcess.found
                ? `${(host.plexProcess.memPercent ?? 0).toFixed(1)}% RAM`
                : 'Not detected'}
            </div>
          </div>
          <div className="stat">
            <div className="label">Disk (worst)</div>
            <div className="value">
              {host.disks.length
                ? `${Math.max(...host.disks.map((d) => d.percent)).toFixed(0)}%`
                : '—'}
            </div>
            <div className="sub">used on busiest volume</div>
          </div>
        </div>
      </div>
    </>
  );
}
