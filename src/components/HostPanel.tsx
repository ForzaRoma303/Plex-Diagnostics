import type { DiagnosticsSnapshot } from '../lib/types';
import { formatBytes } from '../lib/format';

export function HostPanel({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
  const { host } = snapshot;

  return (
    <>
      <div className="panel">
        <h2>CPU</h2>
        <div className="grid-2">
          <div className="stat">
            <div className="label">Overall load</div>
            <div className="value">{host.cpu.currentLoad.toFixed(1)}%</div>
          </div>
          <div className="stat">
            <div className="label">Logical cores</div>
            <div className="value">{host.cpu.cores.length || '—'}</div>
          </div>
        </div>
        {host.cpu.cores.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
            {host.cpu.cores.map((load, i) => (
              <div
                key={i}
                title={`Core ${i + 1}: ${load.toFixed(0)}%`}
                style={{
                  width: 18,
                  height: 36,
                  borderRadius: 4,
                  background: '#2a3544',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: `${Math.min(100, load)}%`,
                    background: 'var(--accent)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Memory</h2>
        <div className="grid-3">
          <div className="stat">
            <div className="label">Used</div>
            <div className="value">{formatBytes(host.memory.used)}</div>
          </div>
          <div className="stat">
            <div className="label">Available</div>
            <div className="value">{formatBytes(host.memory.available)}</div>
          </div>
          <div className="stat">
            <div className="label">Pressure</div>
            <div className="value">{host.memory.percent.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Disks</h2>
        {host.disks.length === 0 ? (
          <div className="empty">No disk information available.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Mount</th>
                <th>Type</th>
                <th>Used</th>
                <th>Free</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {host.disks.map((disk) => (
                <tr key={`${disk.mount}-${disk.fs}`}>
                  <td>{disk.mount}</td>
                  <td className="muted">{disk.type}</td>
                  <td>{disk.percent.toFixed(0)}%</td>
                  <td>{formatBytes(disk.available)}</td>
                  <td>{formatBytes(disk.size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h2>GPU</h2>
        {host.gpus.length === 0 ? (
          <div className="empty">No GPU reported by the system.</div>
        ) : (
          <div className="grid-2">
            {host.gpus.map((gpu, i) => (
              <div className="stat" key={`${gpu.model}-${i}`}>
                <div className="label">{gpu.model}</div>
                <div className="value">
                  {gpu.utilization != null ? `${gpu.utilization.toFixed(0)}%` : 'n/a'}
                </div>
                <div className="sub">
                  VRAM {formatBytes(gpu.memoryUsed)} / {formatBytes(gpu.memoryTotal)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Plex process</h2>
        {host.plexProcess.found ? (
          <div className="grid-3">
            <div className="stat">
              <div className="label">CPU</div>
              <div className="value">{(host.plexProcess.cpu ?? 0).toFixed(1)}%</div>
            </div>
            <div className="stat">
              <div className="label">RAM %</div>
              <div className="value">{(host.plexProcess.memPercent ?? 0).toFixed(1)}%</div>
            </div>
            <div className="stat">
              <div className="label">RSS</div>
              <div className="value">{formatBytes(host.plexProcess.memRss)}</div>
              <div className="sub">PID {host.plexProcess.pid}</div>
            </div>
          </div>
        ) : (
          <div className="empty">Plex Media Server process was not detected.</div>
        )}
      </div>
    </>
  );
}
