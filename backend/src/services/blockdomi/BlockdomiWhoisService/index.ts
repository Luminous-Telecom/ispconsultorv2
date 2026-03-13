/**
 * Serviço de consulta Whois de IP via RIPE NCC API
 * Retorna titular e bloco de IP
 */
import { logger } from '../../../utils/logger';

const RIPE_WHOIS_URL = 'https://stat.ripe.net/data/whois/data.json';

export interface WhoisResult {
  ip: string;
  organizacao: string | null;
  bloco: string | null;
  cidr: string | null;
  netname: string | null;
  pais: string | null;
  asn: string | null;
  raw_records?: Array<{ key: string; value: string }>;
}

const REGISTRIES = ['arin', 'ripe', 'apnic', 'lacnic', 'afrinic', 'iana'];

function isRegistry(org: string): boolean {
  const lower = org.toLowerCase();
  return REGISTRIES.some((r) => lower.includes(r));
}

function extractFromRecords(records: Array<Array<{ key: string; value: string }>>): Partial<WhoisResult> {
  const result: Partial<WhoisResult> = {};
  const flat: Array<{ key: string; value: string }> = [];

  for (const block of records) {
    let blockOrg: string | null = null;
    let blockBloco: string | null = null;
    let blockCidr: string | null = null;
    let blockNetname: string | null = null;
    let blockPais: string | null = null;
    let blockAsn: string | null = null;

    for (const r of block) {
      flat.push(r);
      const k = r.key.toLowerCase();
      const v = r.value?.trim() || '';
      if (k === 'orgname') blockOrg = v;
      else if (k === 'organization') blockOrg = v;
      else if (k === 'netrange') blockBloco = v;
      else if (k === 'inetnum') blockBloco = v;
      else if (k === 'cidr') blockCidr = v;
      else if (k === 'netname') blockNetname = v;
      else if (k === 'country' || k === 'countrycode') blockPais = v;
      else if (k === 'origin' && v) blockAsn = v.startsWith('AS') ? v : `AS${v}`;
    }

    if (blockCidr && !result.cidr) result.cidr = blockCidr;
    if (blockBloco && !result.bloco) result.bloco = blockBloco;
    if (blockNetname && !result.netname) result.netname = blockNetname;
    if (blockPais && !result.pais) result.pais = blockPais;
    if (blockAsn && !result.asn) result.asn = blockAsn;
    if (blockOrg && !result.organizacao && !isRegistry(blockOrg)) result.organizacao = blockOrg;
  }

  result.raw_records = flat;
  return result;
}

export class BlockdomiWhoisService {
  static async consultar(ip: string): Promise<WhoisResult> {
    const trimmed = (ip || '').trim();
    if (!trimmed) {
      return { ip: '', organizacao: null, bloco: null, cidr: null, netname: null, pais: null, asn: null };
    }

    try {
      const url = `${RIPE_WHOIS_URL}?resource=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        throw new Error(`RIPE API retornou ${res.status}`);
      }
      const json = (await res.json()) as {
        status?: string;
        data?: {
          records?: Array<Array<{ key: string; value: string }>>;
          irr_records?: Array<Array<{ key: string; value: string }>>;
        };
        messages?: Array<[string, string]>;
      };

      const allRecords = [
        ...(json.data?.records ?? []),
        ...(json.data?.irr_records ?? [])
      ];

      if (json.status !== 'ok' || allRecords.length === 0) {
        return {
          ip: trimmed,
          organizacao: null,
          bloco: null,
          cidr: null,
          netname: null,
          pais: null,
          asn: null
        };
      }

      const extracted = extractFromRecords(allRecords);
      return {
        ip: trimmed,
        organizacao: extracted.organizacao ?? null,
        bloco: extracted.bloco ?? null,
        cidr: extracted.cidr ?? null,
        netname: extracted.netname ?? null,
        pais: extracted.pais ?? null,
        asn: extracted.asn ?? null,
        raw_records: extracted.raw_records
      };
    } catch (err) {
      logger.warn('Erro ao consultar Whois', {
        context: 'BlockdomiWhoisService',
        ip: trimmed,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }
}
