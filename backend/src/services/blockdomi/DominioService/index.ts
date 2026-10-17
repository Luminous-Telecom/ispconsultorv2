import type { Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../db/prisma';
import { sanitizeDominio } from '../../../utils/sanitize';
import { logger } from '../../../utils/logger';
import { SYSTEM_NAME } from '../../../constants/systemBrand';
import { NumeroSeiAnatelBlockdomiService } from '../NumeroSeiAnatelBlockdomiService';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';
import { SeiAnatelExtractService } from '../SeiAnatelExtractService';
import {
  dateOnlyString,
  findBlockdomiById,
  listBlockdomi,
  normalizeBlockdomiWrite,
  plainBlockdomi,
  registrarOperacaoDelete,
  type BlockdomiTabela,
} from '../blockdomiPrisma';

const TABELA: BlockdomiTabela = 'blockdomi_dominios';

/** Converte string vazia em null para campos DATEONLY/TEXT que aceitam null */
function emptyToNull<T>(v: T): T | null {
  if (v === '' || (typeof v === 'string' && v.trim() === '')) return null;
  return v;
}

function metadataDate(value: string | null | undefined): Date | null {
  const normalized = emptyToNull(value ?? null);
  if (!normalized) return null;
  return new Date(`${String(normalized).slice(0, 10)}T00:00:00.000Z`);
}

export interface ListDominiosFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListDominiosResponse {
  data: Array<Record<string, unknown>>;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface SincronizarSeiAnatelDominiosRow {
  link_oficio_anatel: string;
  quantidade_dominios: number;
  nome_oficio?: string | null;
  versao_numero?: string | null;
  sei?: string;
  erro?: string;
}

export interface SincronizarSeiAnatelDominiosAuditEntry {
  id: number;
  antes: Record<string, unknown>;
  depois: Record<string, unknown>;
}

export interface SincronizarSeiAnatelDominiosResult {
  dominiosCandidatos: number;
  pdfsDistintos: number;
  dominiosAtualizados: number;
  resultados: SincronizarSeiAnatelDominiosRow[];
  auditoria: SincronizarSeiAnatelDominiosAuditEntry[];
}

type DominioWrite = {
  dominio?: string;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | Date | null;
  data_fim_bloqueio?: string | Date | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  ativo?: boolean;
  versao_id?: number | null;
  empresa_id?: number | null;
  numero_sei_anatel_id?: number | null;
  numero_sei_anatel?: string | null;
};

function resolvePdfUrlParaDownload(link: string, publicBaseUrl: string): string {
  const t = link.trim();
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  if (t.startsWith('/')) {
    const base = publicBaseUrl.replace(/\/$/, '');
    return `${base}${t}`;
  }
  throw new Error('Link do ofício Anatel inválido (use URL http(s) ou caminho absoluto começando com /)');
}

async function baixarPdfParaArquivoTemporario(fullUrl: string): Promise<string> {
  const tmpDir = '/tmp/ispconsultor-sei-sync';
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `sei-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`);
  const controller = new AbortController();
  const timeoutMs = 120000;
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(fullUrl, {
      headers: { 'User-Agent': `${SYSTEM_NAME.replace(/\s+/g, '-')}/1.0` },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Falha ao baixar PDF (${response.status})`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 5) {
      throw new Error('Arquivo vazio ou inválido');
    }
    const pdfHeader = Buffer.from([0x25, 0x50, 0x44, 0x46]);
    if (!buffer.subarray(0, 4).equals(pdfHeader)) {
      throw new Error('O endereço não retornou um PDF válido');
    }
    const maxBytes = 45 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      throw new Error('PDF excede o tamanho máximo permitido');
    }
    await fs.writeFile(tmpPath, buffer);
    return tmpPath;
  } catch (e) {
    try {
      await fs.unlink(tmpPath);
    } catch {
      /* arquivo pode não existir */
    }
    throw e;
  } finally {
    clearTimeout(to);
  }
}

export class DominioService {
  static async list(filters: ListDominiosFilters): Promise<ListDominiosResponse> {
    return listBlockdomi({
      tabela: TABELA,
      primaryField: 'dominio',
      filters,
      logContext: 'DominioService.list',
    });
  }

  static async getById(id: string | number): Promise<({ id: number; empresa_id?: number | null } & Record<string, unknown>) | null> {
    return findBlockdomiById(TABELA, id);
  }

  static async findByDominio(dominio: string): Promise<Record<string, unknown> | null> {
    const row = await prisma.blockdomi_dominios.findFirst({ where: { dominio } });
    return row ? plainBlockdomi(row, false) : null;
  }

  static async create(dadosDominio: DominioWrite): Promise<{ id: number; empresa_id?: number | null } & Record<string, unknown>> {
    const dados: Record<string, unknown> = { ...dadosDominio };
    if (dados.descricao === undefined) dados.descricao = null;
    const empresaId = (dados.empresa_id as number | null | undefined) ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, empresaId);
    dados.versao_id = versaoId;
    if ('numero_sei_anatel' in dados) {
      const raw = dados.numero_sei_anatel;
      delete dados.numero_sei_anatel;
      dados.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        raw as string | null | undefined
      );
    }
    const created = await prisma.blockdomi_dominios.create({
      data: normalizeBlockdomiWrite(dados) as Prisma.blockdomi_dominiosUncheckedCreateInput,
    });
    const reloaded = await findBlockdomiById(TABELA, created.id);
    if (!reloaded) throw new Error('Domínio não encontrado');
    return reloaded;
  }

  static async update(id: string | number, dadosDominio: DominioWrite): Promise<{ id: number; empresa_id?: number | null } & Record<string, unknown>> {
    const numericId = Number(id);
    const existingDominio = await prisma.blockdomi_dominios.findUnique({ where: { id: numericId } });
    if (!existingDominio) throw new Error('Domínio não encontrado');

    const allowedFields = [
      'dominio',
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'link_planilha_dominios',
      'ativo',
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of Object.keys(dadosDominio)) {
      if (allowedFields.includes(key)) {
        const value = dadosDominio[key as keyof DominioWrite];
        if (value !== undefined) updateData[key] = value;
      }
    }
    if (dadosDominio.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        dadosDominio.numero_sei_anatel
      );
    }
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao(
      'dominio',
      undefined,
      existingDominio.empresa_id ?? null
    );
    updateData.versao_id = versaoId;
    await prisma.blockdomi_dominios.update({
      where: { id: numericId },
      data: normalizeBlockdomiWrite(updateData) as Prisma.blockdomi_dominiosUncheckedUpdateInput,
    });
    const reloaded = await findBlockdomiById(TABELA, numericId);
    if (!reloaded) throw new Error('Domínio não encontrado');
    return reloaded;
  }

  static async bulkUpdate(
    ids: (string | number)[],
    dadosDominio: DominioWrite
  ): Promise<{ updated: number }> {
    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) throw new Error('Informe ao menos um domínio');

    const existentes = await prisma.blockdomi_dominios.findMany({ where: { id: { in: idsNum } } });
    if (existentes.length === 0) throw new Error('Nenhum domínio encontrado para os IDs informados');

    const allowedFields = [
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'link_planilha_dominios',
      'ativo',
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of Object.keys(dadosDominio)) {
      if (allowedFields.includes(key)) {
        const value = dadosDominio[key as keyof DominioWrite];
        if (value !== undefined) updateData[key] = value;
      }
    }
    if (dadosDominio.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        dadosDominio.numero_sei_anatel
      );
    }
    if (Object.keys(updateData).length === 0) return { updated: 0 };

    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao(
      'dominio',
      undefined,
      existentes[0].empresa_id ?? null
    );
    updateData.versao_id = versaoId;
    const result = await prisma.blockdomi_dominios.updateMany({
      where: { id: { in: idsNum } },
      data: normalizeBlockdomiWrite(updateData) as Prisma.blockdomi_dominiosUncheckedUpdateInput,
    });
    return { updated: result.count };
  }

  static async findByDominios(dominios: string[]): Promise<Set<string>> {
    if (dominios.length === 0) return new Set();
    const unique = [...new Set(dominios)];
    const found = await prisma.blockdomi_dominios.findMany({
      where: { dominio: { in: unique } },
      select: { dominio: true },
    });
    return new Set(found.map((row) => row.dominio));
  }

  static async findByDominiosWithData(dominios: string[]): Promise<Map<string, {
    id: number;
    data_fim_bloqueio: string | null;
    link_oficio_anatel: string | null;
    link_oficio_justica: string | null;
    link_planilha_dominios: string | null;
    numero_sei_anatel: string | null;
  }>> {
    if (dominios.length === 0) return new Map();
    const unique = [...new Set(dominios)];
    const found = await prisma.blockdomi_dominios.findMany({
      where: { dominio: { in: unique } },
      select: {
        id: true,
        dominio: true,
        data_fim_bloqueio: true,
        link_oficio_anatel: true,
        link_oficio_justica: true,
        link_planilha_dominios: true,
        blockdomi_numeros_sei_anatel: { select: { numero: true } },
      },
    });
    const map = new Map<string, {
      id: number;
      data_fim_bloqueio: string | null;
      link_oficio_anatel: string | null;
      link_oficio_justica: string | null;
      link_planilha_dominios: string | null;
      numero_sei_anatel: string | null;
    }>();
    for (const row of found) {
      map.set(row.dominio, {
        id: row.id,
        data_fim_bloqueio: dateOnlyString(row.data_fim_bloqueio),
        link_oficio_anatel: row.link_oficio_anatel,
        link_oficio_justica: row.link_oficio_justica,
        link_planilha_dominios: row.link_planilha_dominios,
        numero_sei_anatel: row.blockdomi_numeros_sei_anatel?.numero ?? null,
      });
    }
    return map;
  }

  static async bulkCreate(
    items: string[],
    metadata: {
      nome_oficio?: string | null;
      data_inicio_bloqueio?: string | null;
      data_fim_bloqueio?: string | null;
      link_oficio_anatel?: string | null;
      link_oficio_justica?: string | null;
      link_planilha_dominios?: string | null;
      numero_sei_anatel?: string | null;
      empresa_id?: number | null;
      getVersoesForNewRecords?: (count: number) => Promise<Array<{ id: number; numero: string }>>;
      versaoId?: number;
    }
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[]; primeiraVersao?: string; createdIds: number[]; updatedIds: number[] }> {
    const sanitized = items.map((d) => sanitizeDominio(d)).filter(Boolean) as string[];
    const existingMap = sanitized.length > 0 ? await this.findByDominiosWithData(sanitized) : new Map();
    const toCreate: Prisma.blockdomi_dominiosCreateManyInput[] = [];
    const toUpdate: Array<{ id: number; dominio: string }> = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const newDataFim = metadata.data_fim_bloqueio ?? null;
    const seiIdNovo = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(metadata.numero_sei_anatel ?? null);

    for (const raw of items) {
      const dominio = sanitizeDominio(raw);
      if (!dominio) {
        errors.push(`${raw}: formato inválido`);
        continue;
      }
      if (seen.has(dominio)) continue;
      seen.add(dominio);

      const existing = existingMap.get(dominio);
      if (existing) {
        const dataFimMudou = newDataFim !== (existing.data_fim_bloqueio ?? null);
        const hasNoUrls = !(existing.link_oficio_anatel?.trim() || existing.link_oficio_justica?.trim() || existing.link_planilha_dominios?.trim());
        const hasUrlsToAdd = !!(metadata.link_oficio_anatel?.trim() || metadata.link_oficio_justica?.trim() || metadata.link_planilha_dominios?.trim());
        const hasNoSei = !(existing.numero_sei_anatel?.trim());
        const hasSeiToAdd = !!(metadata.numero_sei_anatel?.trim());
        if (dataFimMudou || (hasNoUrls && hasUrlsToAdd) || (hasNoSei && hasSeiToAdd)) {
          toUpdate.push({ id: existing.id, dominio });
        }
        continue;
      }

      toCreate.push({
        dominio,
        descricao: null,
        nome_oficio: emptyToNull(metadata.nome_oficio ?? null),
        data_inicio_bloqueio: metadataDate(metadata.data_inicio_bloqueio),
        data_fim_bloqueio: metadataDate(metadata.data_fim_bloqueio),
        link_oficio_anatel: emptyToNull(metadata.link_oficio_anatel ?? null),
        link_oficio_justica: emptyToNull(metadata.link_oficio_justica ?? null),
        link_planilha_dominios: emptyToNull(metadata.link_planilha_dominios ?? null),
        numero_sei_anatel_id: seiIdNovo,
        empresa_id: metadata.empresa_id ?? null,
        ativo: true,
      });
    }

    let primeiraVersao: string | undefined;
    let versaoId: number | null = metadata.versaoId ?? null;

    if (toCreate.length > 0 || toUpdate.length > 0) {
      const metaEmpresaId = metadata.empresa_id ?? null;
      if (versaoId == null && !metadata.getVersoesForNewRecords) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, metaEmpresaId);
        versaoId = versao.id;
        primeiraVersao = versao.numero;
      } else if (metadata.getVersoesForNewRecords && toCreate.length > 0) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = versoes[0]?.numero;
      }
      if (toUpdate.length > 0 && versaoId == null) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, metaEmpresaId);
        versaoId = versao.id;
        if (primeiraVersao == null) primeiraVersao = versao.numero;
      }
    }

    if (toCreate.length > 0) {
      if (versaoId != null) {
        toCreate.forEach((rec) => {
          rec.versao_id = versaoId;
        });
      } else if (metadata.getVersoesForNewRecords) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = primeiraVersao ?? versoes[0]?.numero;
        toCreate.forEach((rec, i) => {
          rec.versao_id = versoes[i]?.id ?? null;
        });
      }
    }

    const BATCH = 500;
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      const result = await prisma.blockdomi_dominios.createMany({ data: batch });
      created += result.count;
    }

    let createdIds: number[] = [];
    if (toCreate.length > 0) {
      const dominiosCriados = await prisma.blockdomi_dominios.findMany({
        where: { dominio: { in: toCreate.map((c) => c.dominio) } },
        select: { id: true },
      });
      createdIds = dominiosCriados.map((row) => row.id);
    }

    let updated = 0;
    const updatedIds = toUpdate.map((u) => u.id);
    if (toUpdate.length > 0 && versaoId != null) {
      await prisma.blockdomi_dominios.updateMany({
        where: { id: { in: updatedIds } },
        data: {
          nome_oficio: emptyToNull(metadata.nome_oficio ?? null),
          data_inicio_bloqueio: metadataDate(metadata.data_inicio_bloqueio),
          data_fim_bloqueio: metadataDate(newDataFim),
          link_oficio_anatel: emptyToNull(metadata.link_oficio_anatel ?? null),
          link_oficio_justica: emptyToNull(metadata.link_oficio_justica ?? null),
          link_planilha_dominios: emptyToNull(metadata.link_planilha_dominios ?? null),
          numero_sei_anatel_id: seiIdNovo,
          versao_id: versaoId,
        },
      });
      updated = toUpdate.length;
    }

    if (errors.length > 0) {
      logger.warn('DominioService.bulkCreate itens com erro de validação', { quantidadeErros: errors.length, erros: errors });
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors, primeiraVersao, createdIds, updatedIds };
  }

  static async delete(id: string | number): Promise<{ id: number; empresa_id?: number | null } & Record<string, unknown>> {
    const numericId = Number(id);
    const dominio = await prisma.blockdomi_dominios.findUnique({ where: { id: numericId } });
    if (!dominio) throw new Error('Domínio não encontrado');

    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao(
      'dominio_delete',
      undefined,
      dominio.empresa_id ?? null
    );
    await prisma.blockdomi_dominios.delete({ where: { id: numericId } });
    await registrarOperacaoDelete('dominio_delete', versaoId, 1, [numericId], dominio.empresa_id);
    return plainBlockdomi(dominio, false);
  }

  static async bulkDelete(ids: (string | number)[]): Promise<{ deleted: number; versao: string; versaoId: number }> {
    if (ids.length === 0) return { deleted: 0, versao: '', versaoId: 0 };
    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) return { deleted: 0, versao: '', versaoId: 0 };

    const { id: versaoId, numero: versao } = await VersaoBlockdomiService.obterProximaVersao('dominio_delete', undefined, null);
    const result = await prisma.blockdomi_dominios.deleteMany({ where: { id: { in: idsNum } } });
    await registrarOperacaoDelete('dominio_delete', versaoId, result.count, idsNum);
    return { deleted: result.count, versao, versaoId };
  }

  static async sincronizarSeiAnatelPorPdfOficio(opts: {
    empresaId: number | null;
    publicBaseUrl: string;
  }): Promise<SincronizarSeiAnatelDominiosResult> {
    const { empresaId, publicBaseUrl } = opts;
    const rows = await prisma.blockdomi_dominios.findMany({
      where: empresaId != null ? { empresa_id: empresaId } : {},
      select: {
        id: true,
        link_oficio_anatel: true,
        numero_sei_anatel_id: true,
        empresa_id: true,
        nome_oficio: true,
        versao_id: true,
      },
    });

    const candidatos = rows.filter((row) => {
      const link = (row.link_oficio_anatel ?? '').trim();
      return link.length > 0 && row.numero_sei_anatel_id == null;
    });

    const byUrl = new Map<string, number[]>();
    for (const row of candidatos) {
      const url = (row.link_oficio_anatel ?? '').trim();
      const list = byUrl.get(url) ?? [];
      list.push(row.id);
      byUrl.set(url, list);
    }

    const candidatosPorId = new Map(candidatos.map((row) => [row.id, row]));
    const versaoIds = [...new Set(candidatos.map((row) => row.versao_id).filter((v): v is number => v != null))];
    const versoes = versaoIds.length > 0
      ? await prisma.blockdomi_versoes.findMany({
          where: { id: { in: versaoIds } },
          select: { id: true, numero: true },
        })
      : [];
    const versaoNumeroPorId = new Map(versoes.map((v) => [v.id, v.numero]));

    const metaPorGrupo = (ids: number[]): { nome_oficio: string | null; versao_numero: string | null } => {
      const rep = candidatosPorId.get(ids[0]);
      const nome = rep?.nome_oficio?.trim() ? String(rep.nome_oficio).trim() : null;
      const vid = rep?.versao_id ?? null;
      const serial = vid != null ? versaoNumeroPorId.get(vid) ?? null : null;
      return { nome_oficio: nome, versao_numero: serial };
    };

    const resultados: SincronizarSeiAnatelDominiosRow[] = [];
    const auditoria: SincronizarSeiAnatelDominiosAuditEntry[] = [];
    let dominiosAtualizados = 0;

    for (const [link, ids] of byUrl) {
      let tmpPath: string | null = null;
      try {
        const urlDownload = resolvePdfUrlParaDownload(link, publicBaseUrl);
        tmpPath = await baixarPdfParaArquivoTemporario(urlDownload);
        const extracted = await SeiAnatelExtractService.extractFromPdfPath(tmpPath);
        if (!extracted.success || !extracted.sei?.trim()) {
          const erroMsg = extracted.message || 'Não foi possível extrair o número SEI deste PDF';
          const meta = metaPorGrupo(ids);
          resultados.push({
            link_oficio_anatel: link,
            quantidade_dominios: ids.length,
            nome_oficio: meta.nome_oficio,
            versao_numero: meta.versao_numero,
            erro: erroMsg,
          });
          continue;
        }
        const sei = extracted.sei.trim();
        const antesRows = await prisma.blockdomi_dominios.findMany({ where: { id: { in: ids } } });
        const antesMap = new Map(antesRows.map((row) => [row.id, plainBlockdomi(row, false)]));
        await DominioService.bulkUpdate(ids, { numero_sei_anatel: sei });
        const depoisRows = await prisma.blockdomi_dominios.findMany({ where: { id: { in: ids } } });
        const depoisMap = new Map(depoisRows.map((row) => [row.id, plainBlockdomi(row, false)]));
        for (const id of ids) {
          const antes = antesMap.get(id);
          const depois = depoisMap.get(id);
          if (antes && depois) auditoria.push({ id, antes, depois });
        }
        dominiosAtualizados += ids.length;
        const metaOk = metaPorGrupo(ids);
        resultados.push({
          link_oficio_anatel: link,
          quantidade_dominios: ids.length,
          nome_oficio: metaOk.nome_oficio,
          versao_numero: metaOk.versao_numero,
          sei,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        const metaErr = metaPorGrupo(ids);
        resultados.push({
          link_oficio_anatel: link,
          quantidade_dominios: ids.length,
          nome_oficio: metaErr.nome_oficio,
          versao_numero: metaErr.versao_numero,
          erro: msg,
        });
      } finally {
        if (tmpPath) {
          try {
            await fs.unlink(tmpPath);
          } catch {
            /* ignore */
          }
        }
      }
    }

    return {
      dominiosCandidatos: candidatos.length,
      pdfsDistintos: byUrl.size,
      dominiosAtualizados,
      resultados,
      auditoria,
    };
  }
}
