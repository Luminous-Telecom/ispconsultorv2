import axios from 'axios';
import readline from 'readline';
import { Readable } from 'stream';
import { createGunzip } from 'zlib';
import type { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import type { RpkiRoa } from '../../../models/rpki/RpkiRoa';
import {
  redisGetFilteredAnnouncements,
  redisGetFullTable,
  redisSetFilteredAnnouncements,
  redisSetFullTable,
  risRedisPersistEnabled,
} from '../RpkiBgpRisWhoisRedisCache';

/** Alinhado ao Krill: `MINIMUM_SEEN_BY` em `krill/src/server/bgp/riswhois.rs` */
const MINIMUM_SEEN_BY = 13;

const DEFAULT_TIMEOUT_MS = 180_000;
/** Krill: `bgp_riswhois_refresh_minutes` (padrão 60). Entre refreshes, análise usa só RAM. */
const DEFAULT_CACHE_TTL_MS = 3_600_000;
const DEFAULT_MAX_LINES_TO_SCAN = 8_000_000;
/** Limite por análise (evita respostas gigantes no modal) */
const DEFAULT_MAX_UNIQUE_ANNOUNCEMENTS = 5_000;
const DEFAULT_MAX_SUGGESTIONS = 250;

/** Valores padrão do Krill (`krill/src/config.rs` — `ConfigDefaults::bgp_riswhois_*_uri`). Sobrescreva com env se necessário. */
const KRILL_DEFAULT_RISWHOIS_IPV4_URI = 'https://www.ris.ripe.net/dumps/riswhoisdump.IPv4.gz';
const KRILL_DEFAULT_RISWHOIS_IPV6_URI = 'https://www.ris.ripe.net/dumps/riswhoisdump.IPv6.gz';

function isRisWhoisEnabledEnv(): boolean {
  const v = process.env.RPKI_BGP_RISWHOIS_ENABLED?.trim().toLowerCase();
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return true;
}

type IpVersion = 'ipv4' | 'ipv6';

/** Mesma semântica de `RpkiRoaService` (candidate ⊆ holder em termos RPKI/CIDR). */
function parseCidr(prefix: string): { version: IpVersion; baseBits: string; prefixLength: number } {
  const value = String(prefix).trim();
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw new Error(`Prefixo inválido. Use CIDR (ex.: 203.0.113.0/24): ${value}`);
  }

  const ipPart = parts[0]?.trim() ?? '';
  const lenPart = parts[1]?.trim() ?? '';
  const prefixLength = Number(lenPart);
  if (!Number.isInteger(prefixLength)) {
    throw new Error('Tamanho do prefixo deve ser inteiro.');
  }

  if (ipPart.includes('.')) {
    const octets = ipPart.split('.');
    if (octets.length !== 4) {
      throw new Error('Prefixo IPv4 inválido.');
    }
    const nums = octets.map((oct) => Number(oct));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      throw new Error('Prefixo IPv4 inválido.');
    }
    if (prefixLength < 0 || prefixLength > 32) {
      throw new Error('IPv4: CIDR deve estar entre /0 e /32.');
    }
    const baseBits = nums.map((n) => n.toString(2).padStart(8, '0')).join('');
    return { version: 'ipv4', baseBits, prefixLength };
  }

  if (!ipPart.includes(':')) {
    throw new Error('Use IPv4 ou IPv6 em CIDR.');
  }

  if (prefixLength < 0 || prefixLength > 128) {
    throw new Error('IPv6: CIDR deve estar entre /0 e /128.');
  }

  const sections = ipPart.split('::');
  if (sections.length > 2) {
    throw new Error('Prefixo IPv6 inválido.');
  }

  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  if (left.length + right.length > 8) {
    throw new Error('Prefixo IPv6 inválido.');
  }
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (full.length !== 8) {
    throw new Error('Prefixo IPv6 inválido.');
  }

  const nums = full.map((section) => Number.parseInt(section || '0', 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) {
    throw new Error('Prefixo IPv6 inválido.');
  }

  const baseBits = nums.map((n) => n.toString(2).padStart(16, '0')).join('');
  return { version: 'ipv6', baseBits, prefixLength };
}

function isPrefixContained(candidate: string, holder: string): boolean {
  const ca = parseCidr(candidate);
  const held = parseCidr(holder);
  if (ca.version !== held.version) return false;
  if (ca.prefixLength < held.prefixLength) return false;
  return ca.baseBits.slice(0, held.prefixLength) === held.baseBits.slice(0, held.prefixLength);
}

function normalizeAsn(raw: string): string {
  return String(raw).trim().toUpperCase().replace(/^AS/, '');
}

function announcementUnderResources(announcePrefix: string, resources: RpkiCaResource[]): boolean {
  let ann: IpVersion;
  try {
    ann = parseCidr(announcePrefix).version;
  } catch {
    return false;
  }

  const holders = resources.filter((r) => r.resource_type === ann);
  return holders.some((h) => {
    const start = h.start_range?.trim();
    if (!start) return false;
    try {
      return isPrefixContained(announcePrefix, start);
    } catch {
      return false;
    }
  });
}

function isRoaActive(roa: RpkiRoa, now: Date): boolean {
  if (roa.status === 'revoked') return false;
  return roa.not_after >= now;
}

function effectiveMaxLen(roa: RpkiRoa, anchorLen: number): number {
  if (Number.isInteger(roa.max_length)) return roa.max_length;
  return anchorLen;
}

function coveringRoas(announcePrefix: string, activeRoas: RpkiRoa[]): RpkiRoa[] {
  return activeRoas.filter((roa) => {
    try {
      return isPrefixContained(announcePrefix, roa.prefix.trim());
    } catch {
      return false;
    }
  });
}

type RouteValidity = 'valid' | 'not_found' | 'invalid_asn' | 'invalid_length' | 'disallowed';

function routeValidity(announcePrefix: string, asnStr: string, activeRoas: RpkiRoa[]): RouteValidity {
  const annParsed = parseCidr(announcePrefix);
  const annLen = annParsed.prefixLength;
  const asnNorm = normalizeAsn(asnStr);

  const covering = coveringRoas(announcePrefix, activeRoas);
  if (covering.length === 0) return 'not_found';

  let sameAsnFound = false;
  let noneAs0Found = false;

  for (const roa of covering) {
    let anchorLen = 32;
    try {
      anchorLen = parseCidr(roa.prefix.trim()).prefixLength;
    } catch {
      continue;
    }

    const roaAsn = normalizeAsn(String(roa.asn ?? ''));

    if (roaAsn === asnNorm) {
      if (isPrefixContained(announcePrefix, roa.prefix.trim()) && effectiveMaxLen(roa, anchorLen) >= annLen) {
        return 'valid';
      }
      sameAsnFound = true;
    }

    if (roaAsn !== '0') {
      noneAs0Found = true;
    }
  }

  if (sameAsnFound) return 'invalid_length';
  if (noneAs0Found) return 'invalid_asn';
  return 'disallowed';
}

function tryParseRisRouteLine(rawLine: string, resourceTypeExpected: IpVersion): { prefix: string; asn: string } | null {
  const line = String(rawLine);
  if (!line || line.startsWith('%')) return null;

  const parts = line.split(/\s+/);
  if (parts.length < 3) return null;

  const asnStr = parts[0]?.trim() ?? '';
  const prefixPart = parts[1]?.trim() ?? '';
  const peersPart = parts[2]?.trim() ?? '';

  const peersSeen = Number(peersPart);
  if (!Number.isFinite(peersSeen) || peersSeen < MINIMUM_SEEN_BY) return null;
  if (asnStr.includes('{')) return null;

  const asnNormalized = normalizeAsn(asnStr);
  if (!/^\d+$/.test(asnNormalized)) return null;

  const announcementPrefix = prefixPart;
  try {
    const parsedAnn = parseCidr(announcementPrefix);
    if (parsedAnn.version !== resourceTypeExpected) return null;
  } catch {
    return null;
  }

  return { prefix: announcementPrefix, asn: asnNormalized };
}

interface RisFullTableCacheEntry {
  loadedAt: number;
  rows: Array<{ prefix: string; asn: string }>;
  linesRead: number;
}

const risFullTableByUrl = new Map<string, RisFullTableCacheEntry>();
const risFullTableLoadPromises = new Map<string, Promise<RisFullTableCacheEntry>>();

/** Anúncios já filtrados por recursos da CA — evita varrer milhões de linhas em toda chamada `/roas/analyze`. */
interface FilteredAnnouncementsCacheEntry {
  tableLoadedAt: number;
  matching: Array<{ prefix: string; asn: string }>;
  truncated: boolean;
}

const filteredAnnouncementsByKey = new Map<string, FilteredAnnouncementsCacheEntry>();

function clearFilteredAnnouncementsCacheForUrl(url: string): void {
  const prefix = `${url}|`;
  for (const k of filteredAnnouncementsByKey.keys()) {
    if (k.startsWith(prefix)) {
      filteredAnnouncementsByKey.delete(k);
    }
  }
}

function resourceFingerprint(resources: RpkiCaResource[]): string {
  if (!resources?.length) {
    return 'empty';
  }
  return [...resources]
    .map((r) => `${String(r.resource_type ?? '')}:${String(r.start_range ?? '').trim()}:${String(r.end_range ?? '').trim()}`)
    .sort()
    .join('\n');
}

function getRisCacheTtlMs(): number {
  const n = Number(process.env.RPKI_BGP_RISWHOIS_CACHE_TTL_MS ?? DEFAULT_CACHE_TTL_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CACHE_TTL_MS;
}

/**
 * Baixa o .gz uma vez por TTL, parseia o dump completo e guarda em RAM (como o Krill mantém `RisWhois` entre análises).
 */
async function executeRisFullLoad(params: {
  url: string;
  resourceTypeExpected: IpVersion;
  timeoutMs: number;
  maxLines: number;
  ttlMs: number;
}): Promise<RisFullTableCacheEntry> {
  const { url, resourceTypeExpected, timeoutMs, maxLines, ttlMs } = params;
  try {
    clearFilteredAnnouncementsCacheForUrl(url);
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: timeoutMs,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
      headers: { Accept: '*/*', 'Accept-Encoding': 'identity' },
    });

    const buffer = Buffer.from(response.data);
    const gunzip = createGunzip();
    const input = Readable.from(buffer).pipe(gunzip);
    const rl = readline.createInterface({ input, crlfDelay: Infinity });

    const dedupeKeys = new Set<string>();
    const rows: Array<{ prefix: string; asn: string }> = [];
    let linesRead = 0;

    for await (const rawLine of rl) {
      linesRead += 1;
      if (linesRead >= maxLines) {
        break;
      }
      const parsed = tryParseRisRouteLine(String(rawLine), resourceTypeExpected);
      if (!parsed) continue;
      const key = `${parsed.prefix}|${parsed.asn}`;
      if (dedupeKeys.has(key)) continue;
      dedupeKeys.add(key);
      rows.push(parsed);
    }

    rl.close();
    gunzip.destroy();

    const entry: RisFullTableCacheEntry = { loadedAt: Date.now(), rows, linesRead };
    risFullTableByUrl.set(url, entry);

    if (risRedisPersistEnabled()) {
      await redisSetFullTable(url, entry, ttlMs);
    }

    return entry;
  } finally {
    risFullTableLoadPromises.delete(url);
  }
}

async function getOrLoadFullRisTable(params: {
  url: string;
  resourceTypeExpected: IpVersion;
  timeoutMs: number;
  maxLines: number;
}): Promise<{
  rows: Array<{ prefix: string; asn: string }>;
  linesRead: number;
  cacheHit: boolean;
  tableLoadedAt: number;
}> {
  const { url, resourceTypeExpected, timeoutMs, maxLines } = params;
  const ttlMs = getRisCacheTtlMs();
  const now = Date.now();
  const cached = risFullTableByUrl.get(url);
  if (cached && now - cached.loadedAt < ttlMs) {
    return {
      rows: cached.rows,
      linesRead: cached.linesRead,
      cacheHit: true,
      tableLoadedAt: cached.loadedAt,
    };
  }

  const fromRedis =
    ttlMs > 0 ? await redisGetFullTable(url, ttlMs) : null;
  if (fromRedis && now - fromRedis.loadedAt < ttlMs) {
    const entryRedis: RisFullTableCacheEntry = {
      loadedAt: fromRedis.loadedAt,
      rows: fromRedis.rows,
      linesRead: fromRedis.linesRead,
    };
    risFullTableByUrl.set(url, entryRedis);
    return {
      rows: entryRedis.rows,
      linesRead: entryRedis.linesRead,
      cacheHit: true,
      tableLoadedAt: entryRedis.loadedAt,
    };
  }

  let load = risFullTableLoadPromises.get(url);
  if (!load) {
    load = executeRisFullLoad({
      url,
      resourceTypeExpected,
      timeoutMs,
      maxLines,
      ttlMs,
    });
    risFullTableLoadPromises.set(url, load);
  }

  try {
    const entry = await load;
    return {
      rows: entry.rows,
      linesRead: entry.linesRead,
      cacheHit: false,
      tableLoadedAt: entry.loadedAt,
    };
  } catch (err) {
    risFullTableLoadPromises.delete(url);
    throw err;
  }
}

function filterRowsByResources(
  rows: Array<{ prefix: string; asn: string }>,
  resources: RpkiCaResource[],
  maxAnnouncements: number
): { matching: Array<{ prefix: string; asn: string }>; truncated: boolean } {
  const dedupeKeys = new Set<string>();
  const matching: Array<{ prefix: string; asn: string }> = [];
  let truncated = false;

  for (const row of rows) {
    if (!announcementUnderResources(row.prefix, resources)) continue;
    const key = `${row.prefix}|${row.asn}`;
    if (dedupeKeys.has(key)) continue;
    dedupeKeys.add(key);
    matching.push(row);
    if (matching.length >= maxAnnouncements) {
      truncated = true;
      break;
    }
  }

  return { matching, truncated };
}

export interface RisWhoisSuggestedRoa {
  prefix: string;
  asn: string;
  max_length: number;
  rationale: RouteValidity;
}

/** Sugestões no estilo Krill (`BgpAnalyser.suggest`) a partir dos dumps RIPE RIS. */
export async function collectRisWhoisSuggestedRoas(params: {
  resources: RpkiCaResource[];
  existingRoas: RpkiRoa[];
  now?: Date;
}): Promise<{
  enabled: boolean;
  skippedReason?: string;
  linesReadTotal: number;
  announcementsCollected: number;
  suggestionsEmitted: number;
  truncatedLines: boolean;
  suggestions: RisWhoisSuggestedRoa[];
  errors?: string[];
}> {
  const errors: string[] = [];
  const enabled = isRisWhoisEnabledEnv();

  if (!enabled) {
    return {
      enabled: false,
      skippedReason:
        'RIS/BGP desligado (RPKI_BGP_RISWHOIS_ENABLED=false|0|no|off). Por padrão está ativo como no Krill.',
      linesReadTotal: 0,
      announcementsCollected: 0,
      suggestionsEmitted: 0,
      truncatedLines: false,
      suggestions: [],
    };
  }

  const v4Url =
    process.env.RPKI_BGP_RISWHOIS_IPV4_URI !== undefined && process.env.RPKI_BGP_RISWHOIS_IPV4_URI.trim() === ''
      ? undefined
      : process.env.RPKI_BGP_RISWHOIS_IPV4_URI?.trim() || KRILL_DEFAULT_RISWHOIS_IPV4_URI;
  const v6Url =
    process.env.RPKI_BGP_RISWHOIS_IPV6_URI !== undefined && process.env.RPKI_BGP_RISWHOIS_IPV6_URI.trim() === ''
      ? undefined
      : process.env.RPKI_BGP_RISWHOIS_IPV6_URI?.trim() || KRILL_DEFAULT_RISWHOIS_IPV6_URI;

  if (!v4Url && !v6Url) {
    return {
      enabled: true,
      skippedReason: 'RIS/BGP sem URL IPv4 nem IPv6 (ambas vazias no env)',
      linesReadTotal: 0,
      announcementsCollected: 0,
      suggestionsEmitted: 0,
      truncatedLines: false,
      suggestions: [],
    };
  }

  const timeoutMs = Number(process.env.RPKI_BGP_RISWHOIS_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  const maxLines = Number(process.env.RPKI_BGP_RISWHOIS_MAX_LINES ?? DEFAULT_MAX_LINES_TO_SCAN);
  const maxAnnouncements = Number(
    process.env.RPKI_BGP_RISWHOIS_MAX_ANNOUNCEMENTS ?? DEFAULT_MAX_UNIQUE_ANNOUNCEMENTS
  );
  const maxSuggestions = Number(process.env.RPKI_BGP_RISWHOIS_MAX_SUGGESTIONS ?? DEFAULT_MAX_SUGGESTIONS);

  const now = params.now ?? new Date();
  const activeRoas = params.existingRoas.filter((r) => isRoaActive(r, now));

  const aggregated: Array<{ prefix: string; asn: string }> = [];
  let linesReadTotal = 0;
  let truncatedLines = false;

  const jobs: Array<{ url: string | undefined; fam: IpVersion }> = [
    { url: v4Url, fam: 'ipv4' },
    { url: v6Url, fam: 'ipv6' },
  ];

  const resourceFp = resourceFingerprint(params.resources);
  const risTtlMs = getRisCacheTtlMs();

  const jobOutcomes = await Promise.all(
    jobs.map(async (job) => {
      if (!job.url) {
        return null;
      }
      try {
        const resolvedTimeout = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS;
        const resolvedMaxLines = Number.isFinite(maxLines) ? maxLines : DEFAULT_MAX_LINES_TO_SCAN;

        const table = await getOrLoadFullRisTable({
          url: job.url,
          resourceTypeExpected: job.fam,
          timeoutMs: resolvedTimeout,
          maxLines: resolvedMaxLines,
        });

        const filterCacheKey = `${job.url}|${resourceFp}`;
        const filtCached = filteredAnnouncementsByKey.get(filterCacheKey);
        let matching: Array<{ prefix: string; asn: string }>;
        let truncated: boolean;
        if (filtCached && filtCached.tableLoadedAt === table.tableLoadedAt) {
          matching = filtCached.matching;
          truncated = filtCached.truncated;
        } else {
          const fromRedisFilt =
            risTtlMs > 0
              ? await redisGetFilteredAnnouncements({
                  url: job.url,
                  resourceFingerprint: resourceFp,
                  expectedTableLoadedAt: table.tableLoadedAt,
                })
              : null;
          if (fromRedisFilt) {
            matching = fromRedisFilt.matching;
            truncated = fromRedisFilt.truncated;
            filteredAnnouncementsByKey.set(filterCacheKey, {
              tableLoadedAt: fromRedisFilt.tableLoadedAt,
              matching,
              truncated,
            });
          } else {
            const filtered = filterRowsByResources(table.rows, params.resources, maxAnnouncements);
            matching = filtered.matching;
            truncated = filtered.truncated;
            filteredAnnouncementsByKey.set(filterCacheKey, {
              tableLoadedAt: table.tableLoadedAt,
              matching,
              truncated,
            });
            await redisSetFilteredAnnouncements({
              url: job.url,
              resourceFingerprint: resourceFp,
              tableLoadedAt: table.tableLoadedAt,
              truncated,
              matching,
              ttlMs: risTtlMs,
            });
          }
        }

        const linesReadContribution = table.cacheHit ? 0 : table.linesRead;
        return { linesReadContribution, matching, truncated };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        errors.push(`${job.url}: ${msg}`);
        return null;
      }
    })
  );

  for (const out of jobOutcomes) {
    if (!out) continue;
    linesReadTotal += out.linesReadContribution;
    truncatedLines = truncatedLines || out.truncated;
    aggregated.push(...out.matching);
  }

  const dedupe = new Map<string, { prefix: string; asn: string }>();
  for (const ann of aggregated) {
    dedupe.set(`${ann.prefix}|${ann.asn}`, ann);
  }
  const announcementsUnique = [...dedupe.values()];

  const suggestions: RisWhoisSuggestedRoa[] = [];

  for (const ann of announcementsUnique) {
    let annLen = 24;
    try {
      annLen = parseCidr(ann.prefix).prefixLength;
    } catch {
      continue;
    }

    const verdict = routeValidity(ann.prefix, ann.asn, activeRoas);
    if (verdict === 'valid' || verdict === 'disallowed') continue;

    suggestions.push({
      prefix: ann.prefix,
      asn: ann.asn,
      max_length: annLen,
      rationale: verdict,
    });

    if (suggestions.length >= maxSuggestions) {
      truncatedLines = true;
      break;
    }
  }

  return {
    enabled: true,
    linesReadTotal,
    announcementsCollected: announcementsUnique.length,
    suggestionsEmitted: suggestions.length,
    truncatedLines,
    suggestions,
    errors: errors.length ? errors : undefined,
  };
}
