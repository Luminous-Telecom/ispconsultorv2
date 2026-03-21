/**
 * Serviço de consulta Whois de IP via Registro.br RDAP API
 * Retorna titular e bloco de IP
 */
import axios from 'axios';
import { logger } from '../../../utils/logger';

const REGISTRO_BR_RDAP_URL = 'https://rdap.registro.br/ip';

export interface WhoisRecord {
  key: string;
  value: string;
}

export interface WhoisResult {
  ip: string;
  organizacao: string | null;
  bloco: string | null;
  cidr: string | null;
  netname: string | null;
  pais: string | null;
  asn: string | null;
  /** Blocos de registros para exibição detalhada */
  blocks?: Array<WhoisRecord[]>;
}

interface RdapEntity {
  objectClassName?: string;
  handle?: string;
  roles?: string[];
  vcardArray?: unknown[];
  publicIds?: Array<{ type?: string; identifier?: string }>;
  legalRepresentative?: string;
  events?: RdapEvent[];
  entities?: RdapEntity[];
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapCidr {
  length?: string;
  v4prefix?: string;
  v6prefix?: string;
}

interface RdapResponse {
  handle?: string;
  name?: string;
  startAddress?: string;
  endAddress?: string;
  country?: string;
  type?: string;
  parentHandle?: string;
  nicbr_autnum?: number;
  events?: RdapEvent[];
  entities?: RdapEntity[];
  cidr0_cidrs?: RdapCidr[];
}

function parseVcard(vcardArray: unknown[]): { fn?: string; email?: string; adr?: string } {
  const result: { fn?: string; email?: string; adr?: string } = {};
  if (!Array.isArray(vcardArray) || vcardArray[0] !== 'vcard') return result;
  const fields = vcardArray[1] as Array<[string, object, string, string | string[]]>;
  if (!Array.isArray(fields)) return result;
  for (const f of fields) {
    if (!Array.isArray(f) || f.length < 4) continue;
    const [name, , type, val] = f;
    if (name === 'fn' && type === 'text') result.fn = String(val ?? '');
    else if (name === 'email' && type === 'text') result.email = String(val ?? '');
    else if (name === 'adr' && type === 'text' && Array.isArray(val) && val[6]) result.adr = String(val[6]);
  }
  return result;
}

function formatDate(v: string): string {
  if (!v) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function rdapToBlocks(rdap: RdapResponse, ip: string): Array<WhoisRecord[]> {
  const blocks: Array<WhoisRecord[]> = [];

  const mainBlock: WhoisRecord[] = [];
  if (rdap.handle) mainBlock.push({ key: 'Bloco', value: rdap.handle });
  if (rdap.name) mainBlock.push({ key: 'Netname', value: rdap.name });
  if (rdap.country) mainBlock.push({ key: 'País', value: rdap.country });
  if (rdap.nicbr_autnum != null) mainBlock.push({ key: 'AS', value: `AS${rdap.nicbr_autnum}` });
  if (rdap.type) mainBlock.push({ key: 'Tipo', value: rdap.type });
  if (rdap.parentHandle) mainBlock.push({ key: 'Bloco pai', value: rdap.parentHandle });

  const regEv = rdap.events?.find((e) => e.eventAction === 'registration');
  if (regEv?.eventDate) mainBlock.push({ key: 'Criado', value: formatDate(regEv.eventDate) });
  const changedEv = rdap.events?.find((e) => e.eventAction === 'last changed');
  if (changedEv?.eventDate) mainBlock.push({ key: 'Alterado', value: formatDate(changedEv.eventDate) });

  if (rdap.cidr0_cidrs?.length) {
    for (const c of rdap.cidr0_cidrs) {
      const prefix = c.v4prefix ?? c.v6prefix ?? '';
      const len = c.length ?? '';
      if (prefix || len) mainBlock.push({ key: 'CIDR', value: len ? `${prefix}/${len}` : prefix });
    }
  }

  if (mainBlock.length) blocks.push(mainBlock);

  const flattenEntities = (arr: RdapEntity[]): RdapEntity[] => {
    const out: RdapEntity[] = [];
    for (const e of arr) {
      out.push(e);
      if (e.entities?.length) out.push(...flattenEntities(e.entities));
    }
    return out;
  };
  const entities = flattenEntities(rdap.entities ?? []);
  for (const ent of entities) {
    const vcard = Array.isArray(ent.vcardArray) ? parseVcard(ent.vcardArray) : {};
    const contatoBlock: WhoisRecord[] = [];

    const role = ent.roles?.[0] ?? '';
    const roleLabel =
      role === 'registrant' ? 'Titular' :
      role === 'administrative' ? 'Contato do Titular' :
      role === 'technical' ? 'Contato de Roteamento' :
      role === 'abuse' ? 'Contato de Abuso' : role;

    if (ent.handle) contatoBlock.push({ key: 'ID', value: ent.handle });
    if (vcard.fn) contatoBlock.push({ key: roleLabel || 'Contato', value: vcard.fn });
    if (ent.legalRepresentative) contatoBlock.push({ key: 'Responsável', value: ent.legalRepresentative });
    const cnpj = ent.publicIds?.find((p) => p.type === 'cnpj')?.identifier;
    if (cnpj) contatoBlock.push({ key: 'Documento', value: cnpj });
    if (vcard.email) contatoBlock.push({ key: 'Email', value: vcard.email });
    if (vcard.adr) contatoBlock.push({ key: 'País', value: vcard.adr });

    const regEnt = ent.events?.find((e: RdapEvent) => e.eventAction === 'registration');
    if (regEnt?.eventDate) contatoBlock.push({ key: 'Criado', value: formatDate(regEnt.eventDate) });
    const chgEnt = ent.events?.find((e: RdapEvent) => e.eventAction === 'last changed');
    if (chgEnt?.eventDate) contatoBlock.push({ key: 'Alterado', value: formatDate(chgEnt.eventDate) });

    if (contatoBlock.length) blocks.push(contatoBlock);
  }

  return blocks;
}

export class BlockdomiWhoisService {
  static async consultar(ip: string): Promise<WhoisResult> {
    const trimmed = (ip || '').trim();
    if (!trimmed) {
      return { ip: '', organizacao: null, bloco: null, cidr: null, netname: null, pais: null, asn: null };
    }

    try {
      const url = `${REGISTRO_BR_RDAP_URL}/${encodeURIComponent(trimmed)}`;
      const res = await axios.get<RdapResponse>(url, {
        timeout: 10000,
        headers: { 'User-Agent': 'BackNet/1.0' }
      });

      const rdap = res.data;

      const registrant = rdap.entities?.find((e) => e.roles?.includes('registrant'));
      const vcard = registrant && Array.isArray(registrant.vcardArray)
        ? parseVcard(registrant.vcardArray)
        : {};

      const bloco = rdap.handle ?? null;
      const cidr = rdap.cidr0_cidrs?.[0]
        ? `${rdap.cidr0_cidrs[0].v4prefix ?? rdap.cidr0_cidrs[0].v6prefix ?? ''}/${rdap.cidr0_cidrs[0].length ?? ''}`
        : bloco;

      return {
        ip: trimmed,
        organizacao: vcard.fn ?? rdap.name ?? null,
        bloco,
        cidr: cidr || null,
        netname: rdap.name ?? null,
        pais: rdap.country ?? null,
        asn: rdap.nicbr_autnum != null ? `AS${rdap.nicbr_autnum}` : null,
        blocks: rdapToBlocks(rdap, trimmed)
      };
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.code === 'ECONNABORTED'
          ? 'Timeout ao conectar com Registro.br'
          : err.response?.status === 404
            ? 'IP não encontrado (Registro.br cobre apenas IPs brasileiros)'
            : err.response
              ? `Registro.br retornou ${err.response.status}`
              : err.message || 'Erro de rede'
        : err instanceof Error
          ? err.message
          : String(err);
      logger.warn('Erro ao consultar Whois', {
        context: 'BlockdomiWhoisService',
        ip: trimmed,
        error: msg
      });
      throw new Error(`Whois indisponível: ${msg}`);
    }
  }
}
