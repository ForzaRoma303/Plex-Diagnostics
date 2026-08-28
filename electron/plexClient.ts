import { XMLParser } from 'fast-xml-parser';
import type {
  ConnectionTestResult,
  PlexSession,
  PlexStatus,
  PlexTranscodeSession,
  StreamDecision,
} from '../src/lib/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) =>
    ['Video', 'Track', 'Photo', 'User', 'Player', 'Session', 'TranscodeSession', 'Media'].includes(
      name,
    ),
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function mapDecision(value: unknown): StreamDecision {
  const v = String(value ?? '').toLowerCase().replace(/\s+/g, '');
  if (v === 'directplay') return 'directPlay';
  if (v === 'directstream' || v === 'copy') return 'directStream';
  if (v === 'transcode') return 'transcode';
  return 'unknown';
}

function num(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function plexBase(host: string, port: number): string {
  return `http://${host}:${port}`;
}

async function plexFetch(
  host: string,
  port: number,
  token: string,
  path: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const url = `${plexBase(host, port)}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Plex-Token': token,
        'X-Plex-Client-Identifier': 'plex-diagnostics-desktop',
        'X-Plex-Product': 'Plex Diagnostics',
        'X-Plex-Version': '1.0.0',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { ok: false, error: 'Invalid Plex token (unauthorized).' };
      }
      return { ok: false, error: `Plex returned HTTP ${res.status}.` };
    }

    return { ok: true, text: await res.text() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes('abort')) {
      return {
        ok: false,
        error: 'Could not reach Plex. Is Plex Media Server running on this computer?',
      };
    }
    return {
      ok: false,
      error: 'Could not reach Plex. Is Plex Media Server running on this computer?',
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonOrXml(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return parser.parse(trimmed);
}

function getContainer(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};
  const obj = data as Record<string, unknown>;
  if (obj.MediaContainer && typeof obj.MediaContainer === 'object') {
    return obj.MediaContainer as Record<string, unknown>;
  }
  return obj;
}

function parseSessions(data: unknown): PlexSession[] {
  const container = getContainer(data);
  const items = [
    ...asArray(container.Video as Record<string, unknown>[] | undefined),
    ...asArray(container.Track as Record<string, unknown>[] | undefined),
    ...asArray(container.Photo as Record<string, unknown>[] | undefined),
  ];

  return items.map((item, index) => {
    const user = asArray(item.User as Record<string, unknown>[] | undefined)[0] ?? {};
    const player = asArray(item.Player as Record<string, unknown>[] | undefined)[0] ?? {};
    const session = asArray(item.Session as Record<string, unknown>[] | undefined)[0] ?? {};
    const transcode = asArray(item.TranscodeSession as Record<string, unknown>[] | undefined)[0];

    const videoDecision = mapDecision(
      item.videoDecision ?? item['@_videoDecision'] ?? transcode?.videoDecision ?? transcode?.['@_videoDecision'],
    );
    const audioDecision = mapDecision(
      item.audioDecision ?? item['@_audioDecision'] ?? transcode?.audioDecision ?? transcode?.['@_audioDecision'],
    );

    const isHw = Boolean(
      transcode?.transcodeHwRequested ??
      transcode?.['@_transcodeHwRequested'] ??
      transcode?.transcodeHwDecoding ??
      transcode?.['@_transcodeHwDecoding'] ??
      transcode?.transcodeHwEncoding ??
      transcode?.['@_transcodeHwEncoding']
    );

    const locationRaw = String(session.location ?? session['@_location'] ?? '').toLowerCase();
    const location: 'lan' | 'wan' | 'unknown' =
      locationRaw === 'lan' || locationRaw === 'local'
        ? 'lan'
        : locationRaw === 'wan' || locationRaw === 'remote'
        ? 'wan'
        : 'unknown';

    return {
      sessionKey: String(item.sessionKey ?? item['@_sessionKey'] ?? session.id ?? session['@_id'] ?? index),
      title: String(item.title ?? item['@_title'] ?? 'Unknown'),
      user: String(user.title ?? user['@_title'] ?? 'Unknown'),
      player: String(player.title ?? player['@_title'] ?? player.product ?? player['@_product'] ?? 'Unknown'),
      product: String(player.product ?? player['@_product'] ?? ''),
      state: String(player.state ?? player['@_state'] ?? 'unknown'),
      videoDecision,
      audioDecision,
      transcodeThrottled: String(transcode?.throttled ?? transcode?.['@_throttled'] ?? '0') === '1',
      transcodeSpeed: num(transcode?.speed ?? transcode?.['@_speed']),
      transcodeHwRequested: isHw,
      bandwidth: num(session.bandwidth ?? session['@_bandwidth']),
      progress: num(item.viewOffset ?? item['@_viewOffset']),
      location,
    };
  });
}

function parseTranscodes(data: unknown): PlexTranscodeSession[] {
  const container = getContainer(data);
  const items = asArray(container.TranscodeSession as Record<string, unknown>[] | undefined);

  return items.map((item, index) => ({
    key: String(item.key ?? item['@_key'] ?? index),
    progress: num(item.progress ?? item['@_progress']),
    speed: num(item.speed ?? item['@_speed']),
    throttled: String(item.throttled ?? item['@_throttled'] ?? '0') === '1',
    videoDecision: String(item.videoDecision ?? item['@_videoDecision'] ?? ''),
    audioDecision: String(item.audioDecision ?? item['@_audioDecision'] ?? ''),
    sourceVideoCodec: String(item.sourceVideoCodec ?? item['@_sourceVideoCodec'] ?? ''),
    sourceAudioCodec: String(item.sourceAudioCodec ?? item['@_sourceAudioCodec'] ?? ''),
    videoCodec: String(item.videoCodec ?? item['@_videoCodec'] ?? ''),
    audioCodec: String(item.audioCodec ?? item['@_audioCodec'] ?? ''),
    transcodeHwRequested: Boolean(
      item.transcodeHwRequested ??
      item['@_transcodeHwRequested'] ??
      item.transcodeHwDecoding ??
      item['@_transcodeHwDecoding'] ??
      item.transcodeHwEncoding ??
      item['@_transcodeHwEncoding']
    ),
    transcodeHwDecoding: item.transcodeHwDecoding ? String(item.transcodeHwDecoding) : undefined,
    transcodeHwEncoding: item.transcodeHwEncoding ? String(item.transcodeHwEncoding) : undefined,
  }));
}

export async function testPlexConnection(
  host: string,
  port: number,
  token: string,
): Promise<ConnectionTestResult> {
  if (!token.trim()) {
    return { ok: false, error: 'Enter a Plex token first.' };
  }

  const identity = await plexFetch(host, port, token, '/identity');
  if (!identity.ok) return { ok: false, error: identity.error };

  try {
    const data = parseJsonOrXml(identity.text);
    const container = getContainer(data);
    return {
      ok: true,
      serverName: String(container.machineIdentifier ?? container['@_machineIdentifier'] ?? 'Plex Media Server'),
      version: String(container.version ?? container['@_version'] ?? ''),
    };
  } catch {
    return { ok: false, error: 'Connected, but could not parse the Plex response.' };
  }
}

export async function fetchPlexStatus(
  host: string,
  port: number,
  token: string,
): Promise<PlexStatus> {
  const collectedAt = new Date().toISOString();

  if (!token.trim()) {
    return {
      connected: false,
      error: 'No Plex token configured.',
      sessions: [],
      transcodes: [],
      collectedAt,
    };
  }

  const root = await plexFetch(host, port, token, '/');
  if (!root.ok) {
    return {
      connected: false,
      error: root.error,
      sessions: [],
      transcodes: [],
      collectedAt,
    };
  }

  let serverName = 'Plex Media Server';
  let version = '';
  let platform = '';

  try {
    const rootData = parseJsonOrXml(root.text);
    const container = getContainer(rootData);
    serverName = String(
      container.friendlyName ?? container['@_friendlyName'] ?? serverName,
    );
    version = String(container.version ?? container['@_version'] ?? '');
    platform = String(container.platform ?? container['@_platform'] ?? '');
  } catch {
    // keep defaults
  }

  const [sessionsRes, transcodesRes] = await Promise.all([
    plexFetch(host, port, token, '/status/sessions'),
    plexFetch(host, port, token, '/transcode/sessions'),
  ]);

  let sessions: PlexSession[] = [];
  let transcodes: PlexTranscodeSession[] = [];
  let error: string | undefined;

  if (sessionsRes.ok) {
    try {
      sessions = parseSessions(parseJsonOrXml(sessionsRes.text));
    } catch {
      error = 'Could not parse active sessions.';
    }
  } else {
    error = sessionsRes.error;
  }

  if (transcodesRes.ok) {
    try {
      transcodes = parseTranscodes(parseJsonOrXml(transcodesRes.text));
    } catch {
      error = error ?? 'Could not parse transcode sessions.';
    }
  }

  return {
    connected: true,
    error,
    serverName,
    version,
    platform,
    sessions,
    transcodes,
    collectedAt,
  };
}

export function getMockPlexStatus(): PlexStatus {
  const collectedAt = new Date().toISOString();
  const tick = Math.floor(Date.now() / 3000);
  const transcodeSpeed = 1.4 + Math.sin(tick) * 0.3;

  return {
    connected: true,
    serverName: 'Demo Plex Server',
    version: '1.40.2.8395',
    platform: 'Demo Simulation Mode',
    collectedAt,
    sessions: [
      {
        sessionKey: 'demo-1',
        title: 'Interstellar (4K HDR)',
        user: 'Living Room TV',
        player: 'Apple TV 4K',
        product: 'Plex for Apple TV',
        state: 'playing',
        videoDecision: 'directPlay',
        audioDecision: 'directPlay',
        transcodeThrottled: false,
        transcodeSpeed: null,
        bandwidth: 32500,
        progress: 4520000,
        location: 'lan',
      },
      {
        sessionKey: 'demo-2',
        title: 'Severance - S01E01',
        user: 'Sarah (Remote)',
        player: 'iPhone 15 Pro',
        product: 'Plex for iOS',
        state: 'playing',
        videoDecision: 'transcode',
        audioDecision: 'directStream',
        transcodeThrottled: false,
        transcodeSpeed: Math.round(transcodeSpeed * 10) / 10,
        transcodeHwRequested: true,
        bandwidth: 4200,
        progress: 1240000,
        location: 'wan',
      },
      {
        sessionKey: 'demo-3',
        title: 'The Matrix (1080p)',
        user: 'Bedroom Roku',
        player: 'Roku Ultra',
        product: 'Plex for Roku',
        state: 'playing',
        videoDecision: 'directPlay',
        audioDecision: 'directPlay',
        transcodeThrottled: false,
        transcodeSpeed: null,
        bandwidth: 12000,
        progress: 890000,
        location: 'lan',
      },
    ],
    transcodes: [
      {
        key: 'transcode-1',
        progress: 74,
        speed: Math.round(transcodeSpeed * 10) / 10,
        throttled: false,
        videoDecision: 'transcode',
        audioDecision: 'copy',
        sourceVideoCodec: 'hevc 4k',
        sourceAudioCodec: 'eac3',
        videoCodec: 'h264 1080p',
        audioCodec: 'aac',
        transcodeHwRequested: true,
        transcodeHwDecoding: 'nvdec',
        transcodeHwEncoding: 'nvenc',
      },
    ],
  };
}
