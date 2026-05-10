/**
 * Avaliação de anúncio BGP contra ROAs (mesma semântica do Krill / RpkiBgpRisWhoisService).
 * Prefixo do anúncio deve estar coberto por algum ROA; ASN e comprimento devem respeitar maxLength.
 */

export type RouteValidityGranular = 'valid' | 'not_found' | 'invalid_asn' | 'invalid_length' | 'disallowed';

export interface RoaLikeForValidation {
  id: number;
  prefix: string;
  asn: string;
  max_length: number;
}

export interface RouteEvaluationResult {
  granular: RouteValidityGranular;
  message: string;
  matchedRoaId?: number | null;
}

type IpVersion = 'ipv4' | 'ipv6';

export function parseCidr(prefix: string): { version: IpVersion; baseBits: string; prefixLength: number } {
  const value = String(prefix).trim();
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw new Error('Prefixo inválido. Use formato CIDR (ex.: 203.0.113.0/24).');
  }

  const ipPart = parts[0]?.trim() ?? '';
  const lenPart = parts[1]?.trim() ?? '';
  const prefixLength = Number(lenPart);
  if (!Number.isInteger(prefixLength)) {
    throw new Error('O tamanho do prefixo CIDR deve ser inteiro.');
  }

  if (ipPart.includes('.')) {
    const octets = ipPart.split('.');
    if (octets.length !== 4) throw new Error('Prefixo IPv4 inválido.');
    const nums = octets.map((oct) => Number(oct));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) throw new Error('Prefixo IPv4 inválido.');
    if (prefixLength < 0 || prefixLength > 32) throw new Error('IPv4: CIDR entre /0 e /32.');
    const baseBits = nums.map((n) => n.toString(2).padStart(8, '0')).join('');
    return { version: 'ipv4', baseBits, prefixLength };
  }

  if (!ipPart.includes(':')) throw new Error('Use IPv4 ou IPv6 em CIDR.');
  if (prefixLength < 0 || prefixLength > 128) throw new Error('IPv6: CIDR entre /0 e /128.');

  const sections = ipPart.split('::');
  if (sections.length > 2) throw new Error('Prefixo IPv6 inválido.');
  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  if (left.length + right.length > 8) throw new Error('Prefixo IPv6 inválido.');
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (full.length !== 8) throw new Error('Prefixo IPv6 inválido.');
  const nums = full.map((section) => Number.parseInt(section || '0', 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) throw new Error('Prefixo IPv6 inválido.');
  const baseBits = nums.map((n) => n.toString(2).padStart(16, '0')).join('');
  return { version: 'ipv6', baseBits, prefixLength };
}

export function buildAnnouncementCidr(ipPart: string, prefixLength: number): string {
  const ip = String(ipPart).trim();
  if (!ip || !Number.isInteger(prefixLength)) {
    throw new Error('Informe o prefixo IP e o comprimento (ex.: 203.0.113.0 e 24).');
  }
  return `${ip}/${prefixLength}`;
}

export function normalizeAsn(raw: string): string {
  return String(raw).trim().toUpperCase().replace(/^AS/, '');
}

function isPrefixContained(candidate: string, holder: string): boolean {
  const ca = parseCidr(candidate);
  const held = parseCidr(holder);
  if (ca.version !== held.version) return false;
  if (ca.prefixLength < held.prefixLength) return false;
  return ca.baseBits.slice(0, held.prefixLength) === held.baseBits.slice(0, held.prefixLength);
}

function effectiveMaxLen(roa: RoaLikeForValidation, anchorLen: number): number {
  if (Number.isInteger(roa.max_length)) return roa.max_length;
  return anchorLen;
}

function coveringRoas(announcePrefix: string, activeRoas: RoaLikeForValidation[]): RoaLikeForValidation[] {
  return activeRoas.filter((roa) => {
    try {
      return isPrefixContained(announcePrefix, roa.prefix.trim());
    } catch {
      return false;
    }
  });
}

const GRANULAR_MESSAGES: Record<RouteValidityGranular, string> = {
  valid: 'O anúncio é compatível com pelo menos um ROA ativo no escopo consultado.',
  not_found: 'Nenhum ROA cobre este prefixo entre os ROAs ativos no escopo.',
  invalid_asn: 'Existe ROA cobrindo o prefixo, mas nenhum autoriza este ASN de origem.',
  invalid_length: 'Existe ROA para este ASN, mas o comprimento do prefixo excede o maxLength permitido.',
  disallowed: 'Apenas ROAs com ASN 0 cobrem este prefixo (cenário inválido para este anúncio).',
};

export function evaluateRouteAgainstRoas(
  announcePrefix: string,
  asnStr: string,
  activeRoas: RoaLikeForValidation[]
): RouteEvaluationResult {
  let annParsed;
  try {
    annParsed = parseCidr(announcePrefix);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Prefixo inválido';
    throw new Error(msg);
  }
  const annLen = annParsed.prefixLength;
  const asnNorm = normalizeAsn(asnStr);
  if (!asnNorm || !/^\d+$/.test(asnNorm)) {
    throw new Error('ASN inválido. Use apenas dígitos (ex.: 64512 ou AS64512).');
  }

  const covering = coveringRoas(announcePrefix, activeRoas);
  if (covering.length === 0) {
    return { granular: 'not_found', message: GRANULAR_MESSAGES.not_found };
  }

  let sameAsnFound = false;
  let noneAs0Found = false;

  for (const roa of covering) {
    let anchorLen = annParsed.version === 'ipv4' ? 32 : 128;
    try {
      anchorLen = parseCidr(roa.prefix.trim()).prefixLength;
    } catch {
      continue;
    }

    const roaAsn = normalizeAsn(String(roa.asn ?? ''));

    if (roaAsn === asnNorm) {
      if (isPrefixContained(announcePrefix, roa.prefix.trim()) && effectiveMaxLen(roa, anchorLen) >= annLen) {
        return {
          granular: 'valid',
          message: GRANULAR_MESSAGES.valid,
          matchedRoaId: roa.id,
        };
      }
      sameAsnFound = true;
    }

    if (roaAsn !== '0') {
      noneAs0Found = true;
    }
  }

  let granular: RouteValidityGranular;
  if (sameAsnFound) granular = 'invalid_length';
  else if (noneAs0Found) granular = 'invalid_asn';
  else granular = 'disallowed';

  return { granular, message: GRANULAR_MESSAGES[granular] };
}
