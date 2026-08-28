export interface AppSettings {
  plexHost: string;
  plexPort: number;
  plexToken: string;
  mediaPaths: string[];
  setupComplete: boolean;
  demoMode?: boolean;
}

export interface CpuMetrics {
  currentLoad: number;
  cores: number[];
}

export interface MemMetrics {
  total: number;
  used: number;
  available: number;
  percent: number;
}

export interface DiskMetrics {
  fs: string;
  mount: string;
  type: string;
  size: number;
  used: number;
  available: number;
  percent: number;
}

export interface GpuMetrics {
  model: string;
  utilization: number | null;
  memoryUsed: number | null;
  memoryTotal: number | null;
}

export interface ProcessMetrics {
  found: boolean;
  name: string;
  pid?: number;
  cpu?: number;
  memRss?: number;
  memPercent?: number;
}

export interface HostMetrics {
  collectedAt: string;
  platform: string;
  hostname: string;
  cpu: CpuMetrics;
  memory: MemMetrics;
  disks: DiskMetrics[];
  gpus: GpuMetrics[];
  plexProcess: ProcessMetrics;
}

export type StreamDecision = 'directPlay' | 'directStream' | 'transcode' | 'unknown';

export interface PlexSession {
  sessionKey: string;
  title: string;
  user: string;
  player: string;
  product: string;
  state: string;
  videoDecision: StreamDecision;
  audioDecision: StreamDecision;
  transcodeThrottled: boolean;
  transcodeSpeed: number | null;
  transcodeHwRequested?: boolean;
  transcodeHwFullPipeline?: boolean;
  bandwidth: number | null;
  progress: number | null;
  location?: 'lan' | 'wan' | 'unknown';
}

export interface PlexTranscodeSession {
  key: string;
  progress: number | null;
  speed: number | null;
  throttled: boolean;
  videoDecision: string;
  audioDecision: string;
  sourceVideoCodec: string;
  sourceAudioCodec: string;
  videoCodec: string;
  audioCodec: string;
  transcodeHwRequested?: boolean;
  transcodeHwDecoding?: string;
  transcodeHwEncoding?: string;
}

export interface PlexStatus {
  connected: boolean;
  error?: string;
  serverName?: string;
  version?: string;
  platform?: string;
  sessions: PlexSession[];
  transcodes: PlexTranscodeSession[];
  collectedAt: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  serverName?: string;
  version?: string;
}

export interface HealthFactor {
  id: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface HealthReport {
  score: number;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
  factors: HealthFactor[];
  summary: string;
  efficiency: {
    activeStreams: number;
    directPlayPercent: number;
    transcodeCount: number;
    throttledCount: number;
  };
}

export interface DiagnosticsSnapshot {
  host: HostMetrics;
  plex: PlexStatus;
  health: HealthReport;
}

export const DEFAULT_SETTINGS: AppSettings = {
  plexHost: '127.0.0.1',
  plexPort: 32400,
  plexToken: '',
  mediaPaths: [],
  setupComplete: false,
  demoMode: false,
};
