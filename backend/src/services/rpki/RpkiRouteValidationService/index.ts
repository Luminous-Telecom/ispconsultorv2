import axios, { isAxiosError } from 'axios';
import http from 'http';
import https from 'https';
import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { RpkiClientError } from '../../../utils/errorUtils';
import { normalizeAsn, parseCidr } from '../RpkiRouteValidationCore';
import { SYSTEM_NAME } from '../../../constants/systemBrand';

const ROUTINATOR_HEADERS = { 'User-Agent': `${SYSTEM_NAME.replace(/\s+/g, '-')}-RPKI/1.0 (Routinator)` };

/** API HTTP pública NLnet Labs — validação de rota (GET /validity). Documentação: https://routinator.docs.nlnetlabs.nl/ */
const ROUTINATOR_PUBLIC_HTTP_BASE = 'https://routinator.nlnetlabs.nl';

const ROUTINATOR_HTTP_TIMEOUT_MS = 30_000;

function routinatorBaseUrl(): string {
  return ROUTINATOR_PUBLIC_HTTP_BASE.replace(/\/+$/, '');
}

/**
 * IPv4 reduz falhas com IPv6 quebrado (Docker/VPN) ao acessar o host público.
 */
function routinatorHttpAgents(): { httpsAgent: https.Agent; httpAgent: http.Agent } {
  return {
    httpsAgent: new https.Agent({ family: 4 }),
    httpAgent: new http.Agent({ family: 4 }),
  };
}

function formatRoutinatorRequestFailure(err: unknown): string {
  if (isAxiosError(err)) {
    const bits: string[] = [];
    if (err.code) bits.push(err.code);
    if (err.message && err.message !== 'Error') bits.push(err.message);
    if (err.response) {
      bits.push(`HTTP ${err.response.status}`);
      const d = err.response.data;
      if (typeof d === 'string' && d.trim()) {
        bits.push(d.trim().slice(0, 280).replace(/\s+/g, ' '));
      } else if (d != null && typeof d === 'object') {
        bits.push(JSON.stringify(d).slice(0, 400));
      }
    }
    if (bits.length > 0) return bits.join(' | ');
    return 'requisição ao Routinator falhou (sem detalhes). Verifique saída HTTPS, DNS, proxy e certificados TLS.';
  }
  if (err instanceof Error) {
    if (err.message && err.message !== 'Error') return err.message;
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause) return formatRoutinatorRequestFailure(cause);
    return 'falha desconhecida (sem mensagem). Verifique conectividade outbound para o Routinator.';
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.stringify(err).slice(0, 400);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export interface ValidatingRoa {
  prefix: string;
  max_length: number;
  asn: number;
  validity: string;
  validity_reason: string;
  asn_match: boolean;
  length_ok: boolean;
}

/** Metadados mínimos da resposta Routinator (dataset). */
export interface RoutinatorValidateMeta {
  generatedTime: string | null;
}

export interface ValidateRouteResponse {
  /** `prefix-only` = listagem de ROAs por prefixo sem ASN (não é resultado de `/validity`). */
  state: 'valid' | 'invalid' | 'not-found' | 'prefix-only';
  reason: string;
  message: string;
  announcementCidr: string;
  announcementLength: number;
  asn: string;
  validatingRoas: ValidatingRoa[];
  /** Reservado; validação usa apenas Routinator (sem dados BGP externos). */
  bgp: null;
  routinator: RoutinatorValidateMeta;
}

/** Estados na resposta de `GET /validity` (exclui modo só prefixo `/json`). */
type RoutinatorValidityState = Exclude<ValidateRouteResponse['state'], 'prefix-only'>;

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

function routinatorStateToOurState(state: string): RoutinatorValidityState {
  const s = String(state ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  if (s === 'valid') return 'valid';
  if (s === 'invalid') return 'invalid';
  return 'not-found';
}

function routinatorMessage(state: RoutinatorValidityState): string {
  if (state === 'valid') return 'Anúncio válido — autorizado por pelo menos um ROA na visão do Routinator.';
  if (state === 'invalid') return 'Anúncio inválido — existe ROA cobrindo o prefixo, mas o ASN ou comprimento não são autorizados (Routinator).';
  return 'Sem cobertura — nenhum ROA na visão do Routinator cobre este prefixo.';
}

function routinatorAggregateReason(
  state: RoutinatorValidityState,
  routinatorReason: string | undefined,
  description: string | undefined
): string {
  if (state === 'valid') {
    return 'Pelo menos um VRP em matched autoriza este par prefixo/ASN e o comprimento está dentro do maxLength.';
  }
  if (state === 'invalid') {
    const r = String(routinatorReason ?? '').toLowerCase();
    if (r === 'as') return 'VRP cobre o prefixo, mas nenhum ASN do ROA coincide com o ASN de origem do anúncio.';
    if (r === 'length') return 'O comprimento do prefixo anunciado excede o maxLength permitido pelos ROAs que cobrem o prefixo.';
    return description?.trim() || 'ROA encontrado, mas sem autorização para este anúncio.';
  }
  return 'Nenhum ROA cobre este prefixo na visão atual do Routinator.';
}

function parseRoutinatorAsn(asnField: string): number {
  const s = String(asnField ?? '').trim().toUpperCase().replace(/^AS/, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseRoutinatorMaxLen(v: string | number | undefined): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

interface RoutinatorVrp {
  asn?: string;
  prefix?: string;
  max_length?: string | number;
  maxLength?: number;
}

interface RoutinatorValidity {
  state?: string;
  reason?: string;
  description?: string;
  VRPs?: {
    matched?: RoutinatorVrp[];
    unmatched_as?: RoutinatorVrp[];
    unmatched_length?: RoutinatorVrp[];
  };
}

interface RoutinatorValidatedEntry {
  route?: { origin_asn?: string; prefix?: string };
  validity?: RoutinatorValidity;
}

interface RoutinatorValidityResponse {
  validated_routes?: RoutinatorValidatedEntry[];
  validated_route?: RoutinatorValidatedEntry;
  generatedTime?: string;
}

function isJsonRoaRecord(v: unknown): v is RoutinatorVrp {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function buildValidatingRoasFromJsonRoas(
  roasRaw: unknown[] | undefined,
  annParsed: ReturnType<typeof parseCidr>
): ValidatingRoa[] {
  if (!roasRaw?.length) return [];
  const rows: ValidatingRoa[] = [];
  for (const item of roasRaw) {
    if (!isJsonRoaRecord(item)) continue;
    const v = item as RoutinatorVrp & { maxLength?: number };
    const rowAsn = parseRoutinatorAsn(v.asn ?? '0');
    const prefix = String(v.prefix ?? '');
    const maxLen =
      typeof v.maxLength === 'number' && Number.isFinite(v.maxLength)
        ? v.maxLength
        : parseRoutinatorMaxLen(v.max_length);
    const asnMatch = false;
    const lengthOk = annParsed.prefixLength <= maxLen;
    rows.push({
      prefix,
      max_length: maxLen,
      asn: rowAsn,
      validity: 'prefix_listing',
      validity_reason: 'Listagem por prefixo (informe ASN para validar rota).',
      asn_match: asnMatch,
      length_ok: lengthOk,
    });
  }
  rows.sort((a, b) => (a.prefix === b.prefix ? a.asn - b.asn : a.prefix.localeCompare(b.prefix)));
  return rows;
}

async function fetchRoutinatorPrefixJson(
  base: string,
  announcementCidr: string
): Promise<{ validatingRoas: ValidatingRoa[]; meta: RoutinatorValidateMeta }> {
  const url = `${base}/json`;
  try {
    const resp = await axios.get<Record<string, unknown>>(url, {
      params: { 'select-prefix': announcementCidr },
      timeout: ROUTINATOR_HTTP_TIMEOUT_MS,
      headers: ROUTINATOR_HEADERS,
      validateStatus: (s) => s >= 200 && s < 500,
      ...routinatorHttpAgents(),
    });
    if (resp.status >= 400) {
      throw new RpkiClientError(`Routinator respondeu HTTP ${resp.status}.`);
    }
    const data: unknown = resp.data;
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      const preview =
        typeof data === 'string'
          ? data.trim().slice(0, 200).replace(/\s+/g, ' ')
          : JSON.stringify(data)?.slice(0, 200);
      throw new RpkiClientError(
        `Resposta do Routinator não é um objeto JSON (possível proxy/WAF ou URL incorreta). ${preview ? `Trecho: ${preview}` : ''}`.trim()
      );
    }
    const envelope = data as Record<string, unknown> & {
      metadata?: { generatedTime?: string };
      roas?: unknown[];
    };
    const roasRaw = Array.isArray(envelope.roas) ? envelope.roas : [];
    const annParsed = parseCidr(announcementCidr);
    const validatingRoas = buildValidatingRoasFromJsonRoas(roasRaw, annParsed);
    const metaTime =
      envelope.metadata != null &&
      typeof envelope.metadata === 'object' &&
      !Array.isArray(envelope.metadata) &&
      typeof (envelope.metadata as { generatedTime?: unknown }).generatedTime === 'string'
        ? String((envelope.metadata as { generatedTime: string }).generatedTime)
        : null;
    const meta: RoutinatorValidateMeta = { generatedTime: metaTime };
    return { validatingRoas, meta };
  } catch (err) {
    if (err instanceof RpkiClientError) throw err;
    const detail = formatRoutinatorRequestFailure(err);
    throw new RpkiClientError(`Não foi possível consultar o Routinator (${detail}). URL: ${url}`);
  }
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

function buildValidatingRoasFromRoutinator(
  validity: RoutinatorValidity | undefined,
  announcementAsn: string,
  annParsed: ReturnType<typeof parseCidr>
): ValidatingRoa[] {
  const vrps = validity?.VRPs;
  if (!vrps) return [];

  const rows: ValidatingRoa[] = [];

  const pushList = (list: RoutinatorVrp[] | undefined, kind: 'matched' | 'unmatched_as' | 'unmatched_length') => {
    if (!list?.length) return;
    for (const v of list) {
      const rowAsn = parseRoutinatorAsn(v.asn ?? '0');
      const prefix = String(v.prefix ?? '');
      const maxLen =
        typeof v.maxLength === 'number' && Number.isFinite(v.maxLength)
          ? v.maxLength
          : parseRoutinatorMaxLen(v.max_length);
      const asnMatch = String(rowAsn) === announcementAsn;
      const lengthOk = annParsed.prefixLength <= maxLen;
      let validityCode: string;
      if (kind === 'matched') validityCode = 'valid';
      else if (kind === 'unmatched_as') validityCode = 'invalid_asn';
      else validityCode = 'invalid_length';

      rows.push({
        prefix,
        max_length: maxLen,
        asn: rowAsn,
        validity: validityCode,
        validity_reason: validityReason(validityCode, asnMatch, lengthOk),
        asn_match: asnMatch,
        length_ok: lengthOk,
      });
    }
  };

  pushList(vrps.matched, 'matched');
  pushList(vrps.unmatched_as, 'unmatched_as');
  pushList(vrps.unmatched_length, 'unmatched_length');

  return rows;
}

async function fetchRoutinatorValidity(
  base: string,
  announcementCidr: string,
  asn: string
): Promise<{
  validity: RoutinatorValidity;
  validatingRoas: ValidatingRoa[];
  state: RoutinatorValidityState;
  meta: RoutinatorValidateMeta;
}> {
  const url = `${base}/validity`;
  try {
    const resp = await axios.get<RoutinatorValidityResponse>(url, {
      params: { asn, prefix: announcementCidr },
      timeout: ROUTINATOR_HTTP_TIMEOUT_MS,
      headers: ROUTINATOR_HEADERS,
      validateStatus: (s) => s >= 200 && s < 500,
      ...routinatorHttpAgents(),
    });
    if (resp.status >= 400) {
      throw new RpkiClientError(
        `Routinator respondeu HTTP ${resp.status}.`
      );
    }
    const data: unknown = resp.data;
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      const preview =
        typeof data === 'string'
          ? data.trim().slice(0, 200).replace(/\s+/g, ' ')
          : JSON.stringify(data)?.slice(0, 200);
      throw new RpkiClientError(
        `Resposta do Routinator não é um objeto JSON (possível proxy/WAF ou URL incorreta). ${preview ? `Trecho: ${preview}` : ''}`.trim()
      );
    }
    const envelope = data as RoutinatorValidityResponse;
    const validatedRoute = envelope.validated_route;
    const validatedFirst = envelope.validated_routes?.[0];
    const entry = validatedRoute ?? validatedFirst;

    const validity = entry?.validity;
    if (!validity?.state) {
      throw new RpkiClientError(
        'Resposta inválida do Routinator (esperado validated_route ou validated_routes com validity.state).'
      );
    }

    const meta: RoutinatorValidateMeta = {
      generatedTime: typeof envelope.generatedTime === 'string' ? envelope.generatedTime : null,
    };

    const annParsed = parseCidr(announcementCidr);
    const state = routinatorStateToOurState(validity.state);
    const validatingRoas = buildValidatingRoasFromRoutinator(validity, asn, annParsed);
    return { validity, validatingRoas, state, meta };
  } catch (err) {
    if (err instanceof RpkiClientError) throw err;
    const detail = formatRoutinatorRequestFailure(err);
    throw new RpkiClientError(`Não foi possível consultar o Routinator (${detail}). URL: ${url}`);
  }
}

export class RpkiRouteValidationService {
  static async validate(params: ValidateRouteParams): Promise<ValidateRouteResponse> {
    const announcementCidr = resolveAnnouncementCidr(params.prefix);
    const annParsed = parseCidr(announcementCidr);
    const base = routinatorBaseUrl();

    const asnRaw = params.asn?.trim() ?? '';
    if (!asnRaw) {
      const { validatingRoas, meta } = await fetchRoutinatorPrefixJson(base, announcementCidr);
      const hasRoas = validatingRoas.length > 0;
      return {
        state: 'prefix-only',
        message: hasRoas
          ? 'ROAs para este prefixo. Informe ASN para validar o anúncio.'
          : 'Nenhum ROA cobre este prefixo.',
        reason: hasRoas ? 'Consulta só com prefixo.' : 'Sem VRP para o prefixo.',
        announcementCidr,
        announcementLength: annParsed.prefixLength,
        asn: '',
        validatingRoas,
        bgp: null,
        routinator: meta,
      };
    }

    const asn = normalizeAsn(asnRaw);
    if (!/^\d+$/.test(asn)) throw new RpkiClientError('ASN inválido.');

    const rpki = await fetchRoutinatorValidity(base, announcementCidr, asn);
    const state = rpki.state;
    const validatingRoas = rpki.validatingRoas;
    const message = routinatorMessage(state);
    const reason = routinatorAggregateReason(state, rpki.validity.reason, rpki.validity.description);

    SistemaLogOperacionalService.registrarRpkiValidation({
      empresaId: params.empresaId,
      prefix: announcementCidr.slice(0, 64),
      asn,
      prefixLength: annParsed.prefixLength,
      state,
      matchedRoaId: null,
      reason,
      requestIp: params.requestIp ?? null,
    });

    return {
      state,
      message,
      reason,
      announcementCidr,
      announcementLength: annParsed.prefixLength,
      asn,
      validatingRoas,
      bgp: null,
      routinator: rpki.meta,
    };
  }
}
