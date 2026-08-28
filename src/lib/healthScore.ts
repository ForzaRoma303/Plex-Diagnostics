import type {
  HealthFactor,
  HealthReport,
  HostMetrics,
  PlexSession,
  PlexStatus,
  StreamDecision,
} from './types';

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function decisionScore(decision: StreamDecision): number {
  switch (decision) {
    case 'directPlay':
      return 100;
    case 'directStream':
      return 80;
    case 'transcode':
      return 35;
    default:
      return 60;
  }
}

function gradeFromScore(score: number): HealthReport['grade'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

export function computeHealth(host: HostMetrics, plex: PlexStatus): HealthReport {
  const factors: HealthFactor[] = [];

  const cpuScore = clamp(100 - host.cpu.currentLoad);
  factors.push({
    id: 'cpu',
    label: 'CPU headroom',
    score: cpuScore,
    weight: 0.25,
    detail: `CPU at ${host.cpu.currentLoad.toFixed(0)}%`,
  });

  const ramScore = clamp(100 - host.memory.percent);
  factors.push({
    id: 'ram',
    label: 'Memory headroom',
    score: ramScore,
    weight: 0.2,
    detail: `RAM at ${host.memory.percent.toFixed(0)}%`,
  });

  const diskPercents = host.disks.map((d) => d.percent);
  const worstDisk = diskPercents.length ? Math.max(...diskPercents) : 0;
  const diskScore = clamp(100 - worstDisk);
  factors.push({
    id: 'disk',
    label: 'Disk free space',
    score: diskScore,
    weight: 0.15,
    detail: diskPercents.length
      ? `Busiest volume ${worstDisk.toFixed(0)}% full`
      : 'No disk data',
  });

  let plexProcessScore = 70;
  let plexProcessDetail = 'Plex process not found';
  if (host.plexProcess.found) {
    const cpu = host.plexProcess.cpu ?? 0;
    const mem = host.plexProcess.memPercent ?? 0;
    plexProcessScore = clamp(100 - cpu * 0.6 - mem * 1.2);
    plexProcessDetail = `Plex using ${cpu.toFixed(0)}% CPU, ${mem.toFixed(1)}% RAM`;
  }
  factors.push({
    id: 'plex-process',
    label: 'Plex process load',
    score: plexProcessScore,
    weight: 0.15,
    detail: plexProcessDetail,
  });

  const sessions = plex.connected ? plex.sessions : [];
  const transcodes = plex.connected ? plex.transcodes : [];
  const activeStreams = sessions.length;
  const directPlayCount = sessions.filter((s) => s.videoDecision === 'directPlay').length;
  const transcodeCount = Math.max(
    transcodes.length,
    sessions.filter((s) => s.videoDecision === 'transcode').length,
  );
  const throttledCount =
    sessions.filter((s) => s.transcodeThrottled).length +
    transcodes.filter((t) => t.throttled).length;

  let streamScore = 90;
  let streamDetail = plex.connected ? 'No active streams' : 'Not connected to Plex';
  if (!plex.connected) {
    streamScore = 40;
    streamDetail = plex.error ?? 'Plex unreachable';
  } else if (activeStreams > 0) {
    const avg =
      sessions.reduce((sum: number, s: PlexSession) => sum + decisionScore(s.videoDecision), 0) /
      activeStreams;
    const throttlePenalty = throttledCount > 0 ? 25 : 0;
    const loadPenalty = Math.max(0, (transcodeCount - 1) * 10);
    streamScore = clamp(avg - throttlePenalty - loadPenalty);
    const directPlayPercent = Math.round((directPlayCount / activeStreams) * 100);
    streamDetail = `${activeStreams} stream(s), ${directPlayPercent}% direct play, ${transcodeCount} transcode(s)`;
    if (throttledCount > 0) {
      streamDetail += `, ${throttledCount} throttled`;
    }
  }

  factors.push({
    id: 'streams',
    label: 'Streaming efficiency',
    score: streamScore,
    weight: 0.25,
    detail: streamDetail,
  });

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight,
  );

  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];
  const summary =
    score >= 85
      ? 'Server looks healthy and efficient.'
      : `Score pulled down mainly by ${weakest.label.toLowerCase()}: ${weakest.detail}.`;

  return {
    score,
    grade: gradeFromScore(score),
    factors,
    summary,
    efficiency: {
      activeStreams,
      directPlayPercent: activeStreams
        ? Math.round((directPlayCount / activeStreams) * 100)
        : 100,
      transcodeCount,
      throttledCount,
    },
  };
}
