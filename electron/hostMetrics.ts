import si from 'systeminformation';
import type {
  DiskMetrics,
  GpuMetrics,
  HostMetrics,
  ProcessMetrics,
} from '../src/lib/types';

const PLEX_PROCESS_NAMES = [
  'Plex Media Server',
  'Plex Media Server.exe',
  'plex media server',
];

function bytesToPercent(used: number, total: number): number {
  if (!total) return 0;
  return Math.round((used / total) * 1000) / 10;
}

async function getPlexProcess(): Promise<ProcessMetrics> {
  try {
    const processes = await si.processes();
    const match = processes.list.find((p) => {
      const name = (p.name || '').toLowerCase();
      return PLEX_PROCESS_NAMES.some((n) => name === n.toLowerCase()) || name.includes('plex media server');
    });

    if (!match) {
      return { found: false, name: 'Plex Media Server' };
    }

    return {
      found: true,
      name: match.name,
      pid: match.pid,
      cpu: Math.round((match.cpu || 0) * 10) / 10,
      memRss: match.memRss ? match.memRss * 1024 : undefined,
      memPercent: Math.round((match.mem || 0) * 10) / 10,
    };
  } catch {
    return { found: false, name: 'Plex Media Server' };
  }
}

export async function collectHostMetrics(mediaPaths: string[] = []): Promise<HostMetrics> {
  const [load, mem, fsSize, graphics, osInfo] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.graphics(),
    si.osInfo(),
  ]);

  let disks: DiskMetrics[] = fsSize.map((d) => ({
    fs: d.fs,
    mount: d.mount,
    type: d.type,
    size: d.size,
    used: d.used,
    available: d.available,
    percent: Math.round(d.use * 10) / 10,
  }));

  if (mediaPaths.length > 0) {
    const normalized = mediaPaths.map((p) => p.replace(/\\/g, '/').toLowerCase());
    const filtered = disks.filter((d) =>
      normalized.some(
        (p) =>
          p.startsWith(d.mount.replace(/\\/g, '/').toLowerCase()) ||
          d.mount.replace(/\\/g, '/').toLowerCase().startsWith(p),
      ),
    );
    if (filtered.length) disks = filtered;
  }

  const gpus: GpuMetrics[] = (graphics.controllers || []).map((g) => ({
    model: g.model || g.vendor || 'GPU',
    utilization: typeof g.utilizationGpu === 'number' ? g.utilizationGpu : null,
    memoryUsed: typeof g.memoryUsed === 'number' ? g.memoryUsed * 1024 * 1024 : null,
    memoryTotal: typeof g.memoryTotal === 'number' ? g.memoryTotal * 1024 * 1024 : null,
  }));

  const plexProcess = await getPlexProcess();

  return {
    collectedAt: new Date().toISOString(),
    platform: `${osInfo.distro || osInfo.platform} ${osInfo.release || ''}`.trim(),
    hostname: osInfo.hostname || 'localhost',
    cpu: {
      currentLoad: Math.round(load.currentLoad * 10) / 10,
      cores: (load.cpus || []).map((c) => Math.round(c.load * 10) / 10),
    },
    memory: {
      total: mem.total,
      used: mem.active || mem.used,
      available: mem.available,
      percent: bytesToPercent(mem.active || mem.used, mem.total),
    },
    disks,
    gpus,
    plexProcess,
  };
}
