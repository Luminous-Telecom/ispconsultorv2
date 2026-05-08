import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import { getRedisClient } from '../../config/redis';

/** Chave valor v1 gzip (lista compacta prefix|asn); prefixo filt v1 por URL + fingerprint recursos da CA */
const PREFIX_TABLE = 'backnet:rpki:riswhois:t:v1:';
const PREFIX_FILT = 'backnet:rpki:riswhois:f:v1:';

function isRisRedisCacheEnabledEnv(): boolean {
  const v = process.env.RPKI_BGP_RISWHOIS_REDIS_CACHE?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return true;
}

export function risRedisPersistEnabled(): boolean {
  return isRisRedisCacheEnabledEnv() && getRedisClient() != null;
}

export function redisUrlDigest(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function resourceFingerprintDigest(resourceFingerprint: string): string {
  return createHash('sha256').update(resourceFingerprint).digest('hex').slice(0, 32);
}

async function scanDelPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

export async function redisDeleteFilteredEntriesForDumpUrl(url: string): Promise<void> {
  if (!risRedisPersistEnabled()) return;
  const digest = redisUrlDigest(url);
  await scanDelPattern(`${PREFIX_FILT}${digest}:*`);
}

interface PersistTableV1 {
  v: 1;
  loadedAt: number;
  linesRead: number;
  tuples: Array<[string, string]>;
}

export async function redisGetFullTable(
  url: string,
  ttlMs: number,
): Promise<{ loadedAt: number; rows: Array<{ prefix: string; asn: string }>; linesRead: number } | null> {
  if (!risRedisPersistEnabled()) return null;
  const redis = getRedisClient();
  if (!redis) return null;
  const key = `${PREFIX_TABLE}${redisUrlDigest(url)}`;
  try {
    const buf = await redis.getBuffer(key);
    if (!buf?.length) return null;
    let parsed: PersistTableV1;
    try {
      const jsonStr = gunzipSync(buf).toString('utf8');
      parsed = JSON.parse(jsonStr) as PersistTableV1;
    } catch {
      await redis.del(key);
      return null;
    }
    if (parsed.v !== 1 || !Array.isArray(parsed.tuples)) return null;
    if (!Number.isFinite(parsed.loadedAt) || Date.now() - parsed.loadedAt > ttlMs) return null;
    const rows: Array<{ prefix: string; asn: string }> = [];
    for (const t of parsed.tuples) {
      if (!Array.isArray(t) || t.length < 2) continue;
      rows.push({ prefix: String(t[0]), asn: String(t[1]) });
    }
    return {
      loadedAt: parsed.loadedAt,
      linesRead: Number.isFinite(parsed.linesRead) ? parsed.linesRead : 0,
      rows,
    };
  } catch {
    return null;
  }
}

export async function redisSetFullTable(
  url: string,
  entry: { loadedAt: number; rows: Array<{ prefix: string; asn: string }>; linesRead: number },
  ttlMs: number,
): Promise<boolean> {
  if (!risRedisPersistEnabled()) return false;
  const redis = getRedisClient();
  if (!redis) return false;
  const digest = redisUrlDigest(url);
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  const tuples: Array<[string, string]> = entry.rows.map((r): [string, string] => [r.prefix, r.asn]);
  const payloadObj: PersistTableV1 = {
    v: 1,
    loadedAt: entry.loadedAt,
    linesRead: entry.linesRead,
    tuples,
  };
  try {
    await scanDelPattern(`${PREFIX_FILT}${digest}:*`);
    const gzipped = gzipSync(Buffer.from(JSON.stringify(payloadObj), 'utf8'));
    await redis.set(`${PREFIX_TABLE}${digest}`, gzipped, 'EX', ttlSec);
    return true;
  } catch {
    return false;
  }
}

interface PersistFilteredV1 {
  v: 1;
  tableLoadedAt: number;
  truncated: boolean;
  tuples: Array<[string, string]>;
}

export async function redisGetFilteredAnnouncements(params: {
  url: string;
  resourceFingerprint: string;
  expectedTableLoadedAt: number;
}): Promise<{
  tableLoadedAt: number;
  matching: Array<{ prefix: string; asn: string }>;
  truncated: boolean;
} | null> {
  if (!risRedisPersistEnabled()) return null;
  const redis = getRedisClient();
  if (!redis) return null;
  const key = `${PREFIX_FILT}${redisUrlDigest(params.url)}:${resourceFingerprintDigest(params.resourceFingerprint)}`;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    let parsed: PersistFilteredV1;
    try {
      parsed = JSON.parse(raw) as PersistFilteredV1;
    } catch {
      await redis.del(key);
      return null;
    }
    if (
      parsed.v !== 1 ||
      !Array.isArray(parsed.tuples) ||
      parsed.tableLoadedAt !== params.expectedTableLoadedAt
    ) {
      return null;
    }
    const matching: Array<{ prefix: string; asn: string }> = [];
    for (const t of parsed.tuples) {
      if (!Array.isArray(t) || t.length < 2) continue;
      matching.push({ prefix: String(t[0]), asn: String(t[1]) });
    }
    return { tableLoadedAt: parsed.tableLoadedAt, truncated: Boolean(parsed.truncated), matching };
  } catch {
    return null;
  }
}

export async function redisSetFilteredAnnouncements(params: {
  url: string;
  resourceFingerprint: string;
  tableLoadedAt: number;
  truncated: boolean;
  matching: Array<{ prefix: string; asn: string }>;
  ttlMs: number;
}): Promise<void> {
  if (!risRedisPersistEnabled()) return;
  const redis = getRedisClient();
  if (!redis) return;
  const ttlSec = Math.max(1, Math.ceil(params.ttlMs / 1000));
  const key = `${PREFIX_FILT}${redisUrlDigest(params.url)}:${resourceFingerprintDigest(params.resourceFingerprint)}`;
  const tuples: Array<[string, string]> = params.matching.map((r): [string, string] => [r.prefix, r.asn]);
  const payloadObj: PersistFilteredV1 = {
    v: 1,
    tableLoadedAt: params.tableLoadedAt,
    truncated: params.truncated,
    tuples,
  };
  try {
    await redis.set(key, JSON.stringify(payloadObj), 'EX', ttlSec);
  } catch {
    /* ignora falha de escrita no Redis */
  }
}
