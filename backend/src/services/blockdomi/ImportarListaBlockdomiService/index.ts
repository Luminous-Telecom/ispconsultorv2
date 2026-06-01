import { Op } from 'sequelize';
import { Dominio } from '../../../models/blockdomi/Dominio';
import { IPv4 } from '../../../models/blockdomi/IPv4';
import { IPv6 } from '../../../models/blockdomi/IPv6';
import { sanitizeDominio } from '../../../utils/sanitize';
import { DominioService } from '../DominioService';
import { IPv4Service } from '../IPv4Service';
import { IPv6Service } from '../IPv6Service';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';

export interface ImportarListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  /** Número SEI do protocolo eletrônico (ofício Anatel assinado). */
  numero_sei_anatel?: string | null;
  empresa_id?: number | null;
}

export interface ImportarListaResult {
  versao_lista: string;
  dominios: { created: number; updated: number; skipped: number; errors: string[]; createdIds: number[]; updatedIds: number[] };
  ipv4: { created: number; updated: number; skipped: number; errors: string[]; createdIds: number[]; updatedIds: number[] };
  ipv6: { created: number; updated: number; skipped: number; errors: string[]; createdIds: number[]; updatedIds: number[] };
}

export interface RemoverListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
}

export interface RemoverListaResult {
  dominios: { deleted: number; notFound: number; versao?: string };
  ipv4: { deleted: number; notFound: number; versao?: string };
  ipv6: { deleted: number; notFound: number; versao?: string };
}

export interface AnalisarListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
}

export interface AnalisarListaResult {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
}

const ANALISAR_LISTA_BATCH_SIZE = 2000;

function uniqDominios(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw ?? []) {
    const d = sanitizeDominio(String(item));
    if (!d || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
  }
  return out;
}

function uniqIps(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw ?? []) {
    const ip = String(item).trim();
    if (!ip || seen.has(ip)) continue;
    seen.add(ip);
    out.push(ip);
  }
  return out;
}

async function findExistingDominios(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];

  const found = new Set<string>();
  for (let i = 0; i < values.length; i += ANALISAR_LISTA_BATCH_SIZE) {
    const chunk = values.slice(i, i + ANALISAR_LISTA_BATCH_SIZE);
    const rows = await Dominio.findAll({
      where: { dominio: { [Op.in]: chunk } },
      attributes: ['dominio'],
    });
    for (const row of rows) {
      if (row.dominio?.trim()) {
        found.add(row.dominio);
      }
    }
  }

  return values.filter((value) => found.has(value));
}

async function findExistingIpv4(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];

  const found = new Set<string>();
  for (let i = 0; i < values.length; i += ANALISAR_LISTA_BATCH_SIZE) {
    const chunk = values.slice(i, i + ANALISAR_LISTA_BATCH_SIZE);
    const rows = await IPv4.findAll({
      where: { ip: { [Op.in]: chunk } },
      attributes: ['ip'],
    });
    for (const row of rows) {
      if (row.ip?.trim()) {
        found.add(row.ip);
      }
    }
  }

  return values.filter((value) => found.has(value));
}

async function findExistingIpv6(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];

  const found = new Set<string>();
  for (let i = 0; i < values.length; i += ANALISAR_LISTA_BATCH_SIZE) {
    const chunk = values.slice(i, i + ANALISAR_LISTA_BATCH_SIZE);
    const rows = await IPv6.findAll({
      where: { ip: { [Op.in]: chunk } },
      attributes: ['ip'],
    });
    for (const row of rows) {
      if (row.ip?.trim()) {
        found.add(row.ip);
      }
    }
  }

  return values.filter((value) => found.has(value));
}

/**
 * Importa uma lista blockdomi com controle de versão.
 * Uma única versão para toda a lista (todos os domínios/IPv4/IPv6 da importação compartilham a mesma versão).
 */
export class ImportarListaBlockdomiService {
  static async importar(payload: ImportarListaPayload): Promise<ImportarListaResult> {
    const versaoLista = await VersaoBlockdomiService.obterProximaVersao('lista', undefined, payload.empresa_id);

    const metadata = {
      nome_oficio: payload.nome_oficio ?? null,
      data_inicio_bloqueio: payload.data_inicio_bloqueio ?? null,
      data_fim_bloqueio: payload.data_fim_bloqueio ?? null,
      link_oficio_anatel: payload.link_oficio_anatel ?? null,
      link_oficio_justica: payload.link_oficio_justica ?? null,
      link_planilha_dominios: payload.link_planilha_dominios ?? null,
      numero_sei_anatel: payload.numero_sei_anatel ?? null,
      empresa_id: payload.empresa_id ?? null,
      versaoId: versaoLista.id
    };

    const empty = { created: 0, updated: 0, skipped: 0, errors: [] as string[], createdIds: [] as number[], updatedIds: [] as number[] };
    const [domRes, ipv4Res, ipv6Res] = await Promise.all([
      payload.dominios.length > 0 ? DominioService.bulkCreate(payload.dominios, metadata) : Promise.resolve(empty),
      payload.ipv4.length > 0 ? IPv4Service.bulkCreate(payload.ipv4, metadata) : Promise.resolve(empty),
      payload.ipv6.length > 0 ? IPv6Service.bulkCreate(payload.ipv6, metadata) : Promise.resolve(empty)
    ]);

    return {
      versao_lista: versaoLista.numero,
      dominios: domRes,
      ipv4: ipv4Res,
      ipv6: ipv6Res
    };
  }

  /**
   * Remove do cadastro os domínios/IPv4/IPv6 cujo valor coincide com a lista informada.
   * Gera versão de exclusão por tipo (reutiliza bulkDelete de cada serviço).
   */
  static async removerPorLista(payload: RemoverListaPayload): Promise<RemoverListaResult> {
    const seenDom = new Set<string>();
    const dominiosUniq: string[] = [];
    for (const raw of payload.dominios ?? []) {
      const d = sanitizeDominio(String(raw));
      if (!d || seenDom.has(d)) continue;
      seenDom.add(d);
      dominiosUniq.push(d);
    }

    const seen4 = new Set<string>();
    const ipv4Uniq: string[] = [];
    for (const raw of payload.ipv4 ?? []) {
      const ip = String(raw).trim();
      if (!ip || seen4.has(ip)) continue;
      seen4.add(ip);
      ipv4Uniq.push(ip);
    }

    const seen6 = new Set<string>();
    const ipv6Uniq: string[] = [];
    for (const raw of payload.ipv6 ?? []) {
      const ip = String(raw).trim();
      if (!ip || seen6.has(ip)) continue;
      seen6.add(ip);
      ipv6Uniq.push(ip);
    }

    const empty = { deleted: 0, notFound: 0, versao: undefined as string | undefined };

    const domRes = { ...empty };
    if (dominiosUniq.length > 0) {
      const rows = await Dominio.findAll({
        where: { dominio: { [Op.in]: dominiosUniq } },
        attributes: ['id', 'dominio']
      });
      const encontrados = new Set(rows.map((r) => r.dominio));
      domRes.notFound = dominiosUniq.filter((d) => !encontrados.has(d)).length;
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const r = await DominioService.bulkDelete(ids);
        domRes.deleted = r.deleted;
        domRes.versao = r.versao;
      }
    }

    const ipv4Res = { ...empty };
    if (ipv4Uniq.length > 0) {
      const rows = await IPv4.findAll({
        where: { ip: { [Op.in]: ipv4Uniq } },
        attributes: ['id', 'ip']
      });
      const encontrados = new Set(rows.map((r) => r.ip));
      ipv4Res.notFound = ipv4Uniq.filter((ip) => !encontrados.has(ip)).length;
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const r = await IPv4Service.bulkDelete(ids);
        ipv4Res.deleted = r.deleted;
        ipv4Res.versao = r.versao;
      }
    }

    const ipv6Res = { ...empty };
    if (ipv6Uniq.length > 0) {
      const rows = await IPv6.findAll({
        where: { ip: { [Op.in]: ipv6Uniq } },
        attributes: ['id', 'ip']
      });
      const encontrados = new Set(rows.map((r) => r.ip));
      ipv6Res.notFound = ipv6Uniq.filter((ip) => !encontrados.has(ip)).length;
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const r = await IPv6Service.bulkDelete(ids);
        ipv6Res.deleted = r.deleted;
        ipv6Res.versao = r.versao;
      }
    }

    return { dominios: domRes, ipv4: ipv4Res, ipv6: ipv6Res };
  }

  /** Verifica quais itens da lista informada já existem no cadastro (consulta pontual, sem paginar tudo). */
  static async analisarLista(payload: AnalisarListaPayload): Promise<AnalisarListaResult> {
    const dominiosUniq = uniqDominios(payload.dominios);
    const ipv4Uniq = uniqIps(payload.ipv4);
    const ipv6Uniq = uniqIps(payload.ipv6);

    const [dominios, ipv4, ipv6] = await Promise.all([
      findExistingDominios(dominiosUniq),
      findExistingIpv4(ipv4Uniq),
      findExistingIpv6(ipv6Uniq),
    ]);

    return { dominios, ipv4, ipv6 };
  }
}
