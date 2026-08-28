function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function scoreColor(score: number): string {
  if (score >= 85) return 'var(--good)';
  if (score >= 70) return 'var(--info)';
  if (score >= 50) return 'var(--warn)';
  return 'var(--bad)';
}

function decisionLabel(decision: string): string {
  switch (decision) {
    case 'directPlay':
      return 'Direct Play';
    case 'directStream':
      return 'Direct Stream';
    case 'transcode':
      return 'Transcode';
    default:
      return 'Unknown';
  }
}

export { formatBytes, scoreColor, decisionLabel };
