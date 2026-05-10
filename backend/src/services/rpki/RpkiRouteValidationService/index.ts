import axios from 'axios';
import { RpkiValidationLog } from '../../../models/rpki/RpkiValidationLog';
import { RpkiClientError } from '../../../utils/errorUtils';
import { normalizeAsn, parseCidr } from '../RpkiRouteValidationCore';

const RIPE_STAT_BASE = 'https://stat.ripe.net/data';
const RIPE_STAT_TIMEOUT_MS = 15_000;
const RIPE_HEADERS = { 'User-Agent': 'BackNet-RPKI/1.0' };

export interface ValidatingRoa {
  prefix: string;
  max_length: number;
  asn: number;
  validity: string;
  validity_reason: string;
  asn_match: boolean;
  length_ok: boolean;
}

export interface BgpOrigin {
  asn: number;
  holder: string | null;
}

export interface BgpStatus {
  announced: boolean;
  visibility_peers: number | null;
  total_peers: number | null;
  visibility_pct: number | null;
  first_seen: string | null;
  last_seen: string | null;
  covering_prefix: string | null;
  origins: BgpOrigin[];
}

export interface ValidateRouteResponse {
  state: 'valid' | 'invalid' | 'not-found';
  reason: string;
  message: string;
  announcementCidr: string;
  announcementLength: number;
  asn: string;
  validatingRoas: ValidatingRoa[];
  bgp: BgpStatus | null;
  source: 'ripe-stat';
}

export interface ValidateRouteParams {
  prefix: string;
  asn?: string;
  empresaId: number | null;
  requestIp?: string | null;
}

function resolveAnnouncementCidr(prefixRaw: string): string {
  const raw = String(prefixRaw ?? '').trim();
  if (!raw) throw new RpkiClientError('Prefixo é obrigatório.');
  if (!raw.includes('/')) throw new RpkiClientError('Informe o prefixo em notação CIDR (ex.: 203.0.113.0/24).');
  parseCidr(raw);
  return raw;
}

function ripeStatusToState(status: string): ValidateRouteResponse['state'] {
  const s = String(status).toLowerCase();
  if (s === 'valid') return 'valid';
  if (s === 'invalid') return 'invalid';
  return 'not-found';
}

function ripeStatusToMessage(status: string): string {
  const s = String(status).toLowerCase();
  if (s === 'valid') return 'Anúncio válido — autorizado por pelo menos um ROA publicado globalmente.';
  if (s === 'invalid') return 'Anúncio inválido — existe ROA cobrindo o prefixo, mas o ASN ou comprimento não são autorizados.';
  return 'Sem cobertura — nenhum ROA publicado globalmente cobre este prefixo (estado "unknown").';
}

function ripeStatusToReason(status: string, roas: Array<{ validity: string }>): string {
  const s = String(status).toLowerCase();
  if (s === 'valid') return 'Pelo menos um ROA autoriza este par prefixo/ASN e o comprimento está dentro do maxLength.';
  if (s === 'invalid') {
    const parts: string[] = [];
    if (roas.some((r) => r.validity === 'invalid_asn')) parts.push('ASN de origem não autorizado por nenhum ROA que cobre o prefixo');
    if (roas.some((r) => r.validity === 'invalid_length')) parts.push('comprimento do prefixo excede o maxLength de algum ROA');
    return parts.length > 0 ? parts.join('; ') + '.' : 'ROA encontrado, mas sem autorização para este anúncio.';
  }
  return 'Nenhum ROA publicado cobre este prefixo. O estado é "unknown" — o prefixo não está protegido por RPKI.';
}

function validityReason(validity: string, asnMatch: boolean, lengthOk: boolean): string {
  if (validity === 'valid') return 'ASN autorizado e comprimento dentro do maxLength.';
  if (validity === 'invalid_asn') return 'ASN de origem não é o autorizado por este ROA.';
  if (validity === 'invalid_length') return 'Comprimento do prefixo excede o maxLength deste ROA.';
  if (!asnMatch && !lengthOk) return 'ASN não autorizado e comprimento excede o maxLength.';
  if (!asnMatch) return 'ASN de origem diferente do autorizado.';
  if (!lengthOk) return 'Comprimento do prefixo excede o maxLength.';
  return validity;
}

async function fetchRipeGet<T>(url: string, params: Record<string, string>): Promise<T | null> {
  try {
    const resp = await axios.get<{ data?: T }>(url, { params, timeout: RIPE_STAT_TIMEOUT_MS, headers: RIPE_HEADERS });
    return resp.data?.data ?? null;
  } catch {
    return null;
  }
}

interface RipeValidationData {
  status: string;
  validating_roas?: Array<{ prefix: string; max_length: number; asn: number; validity: string }>;
}

interface RipePrefixOverviewData {
  announced?: boolean;
  block?: { resource?: string };
  asns?: Array<{ asn: number; holder?: string }>;
}

interface RipeRoutingStatusData {
  first_seen?: { time?: string };
  last_seen?: { time?: string };
  visibility?: {
    v4?: { ris_peers_seeing?: number; total_ris_peers?: number };
    v6?: { ris_peers_seeing?: number; total_ris_peers?: number };
  };
  less_specifics?: Array<{ prefix?: string; origin?: number }>;
}

export class RpkiRouteValidationService {
  static async validate(params: ValidateRouteParams): Promise<ValidateRouteResponse> {
    const announcementCidr = resolveAnnouncementCidr(params.prefix);
    const asnRaw = params.asn?.trim() ?? '';
    if (!asnRaw) throw new RpkiClientError('ASN de origem é obrigatório.');
    const asn = normalizeAsn(asnRaw);
    if (!/^\d+$/.test(asn)) throw new RpkiClientError('ASN inválido.');

    const annParsed = parseCidr(announcementCidr);

    const [rpkiData, overviewData, routingData] = await Promise.all([
      fetchRipeGet<RipeValidationData>(`${RIPE_STAT_BASE}/rpki-validation/data.json`, {
        resource: `AS${asn}`,
        prefix: announcementCidr,
      }),
      fetchRipeGet<RipePrefixOverviewData>(`${RIPE_STAT_BASE}/prefix-overview/data.json`, {
        resource: announcementCidr,
      }),
      fetchRipeGet<RipeRoutingStatusData>(`${RIPE_STAT_BASE}/routing-status/data.json`, {
        resource: announcementCidr,
      }),
    ]);

    if (!rpkiData) throw new RpkiClientError('Não foi possível obter dados RPKI do RIPE Stat.');

    const rawRoas = rpkiData.validating_roas ?? [];
    const state = ripeStatusToState(rpkiData.status ?? '');

    const validatingRoas: ValidatingRoa[] = rawRoas.map((r) => {
      const asnMatch = String(r.asn) === asn;
      const lengthOk = annParsed.prefixLength <= r.max_length;
      return {
        prefix: r.prefix,
        max_length: r.max_length,
        asn: r.asn,
        validity: r.validity,
        validity_reason: validityReason(r.validity, asnMatch, lengthOk),
        asn_match: asnMatch,
        length_ok: lengthOk,
      };
    });

    // Monta dados BGP
    let bgp: BgpStatus | null = null;
    {
      const isV6 = announcementCidr.includes(':');
      const visBlock = isV6 ? routingData?.visibility?.v6 : routingData?.visibility?.v4;
      const peers = visBlock?.ris_peers_seeing ?? null;
      const total = visBlock?.total_ris_peers ?? null;

      bgp = {
        announced: overviewData?.announced ?? false,
        visibility_peers: peers,
        total_peers: total,
        visibility_pct: peers != null && total != null && total > 0 ? Math.round((peers / total) * 100) : null,
        first_seen: routingData?.first_seen?.time ?? null,
        last_seen: routingData?.last_seen?.time ?? null,
        covering_prefix: routingData?.less_specifics?.[0]?.prefix ?? overviewData?.block?.resource ?? null,
        origins: (overviewData?.asns ?? []).map((a) => ({ asn: a.asn, holder: a.holder ?? null })),
      };
    }

    const reason = ripeStatusToReason(rpkiData.status ?? '', rawRoas);

    await RpkiValidationLog.create({
      empresa_id: params.empresaId,
      prefix: announcementCidr.slice(0, 64),
      asn,
      prefix_length: annParsed.prefixLength,
      state,
      matched_roa_id: null,
      reason,
      request_ip: params.requestIp ?? null,
    }).catch(() => { /* log não deve interromper a resposta */ });

    return {
      state,
      message: ripeStatusToMessage(rpkiData.status ?? ''),
      reason,
      announcementCidr,
      announcementLength: annParsed.prefixLength,
      asn,
      validatingRoas,
      bgp,
      source: 'ripe-stat',
    };
  }
}
