import { Dominio } from '../../../models/blockdomi/Dominio';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';
import { NumeroSeiAnatelBlockdomi } from '../../../models/blockdomi/NumeroSeiAnatelBlockdomi';
import { NumeroSeiAnatelBlockdomiService } from '../NumeroSeiAnatelBlockdomiService';
import fs from 'fs/promises';
import path from 'path';
import { Op, WhereOptions, Order } from 'sequelize';
import { sanitizeDominio } from '../../../utils/sanitize';
import { logger } from '../../../utils/logger';
import { DOMINIO_SORT_CONFIG } from '../../../config/sortConfigs';
import {
  BLOCKDOMI_LIST_INCLUDES,
  listBlockdomiPaginated,
  type BlockdomiListFilters,
} from '../../../utils/blockdomiListHelper';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';
import { SeiAnatelExtractService } from '../SeiAnatelExtractService';

/** Converte string vazia em null para campos DATEONLY/TEXT que aceitam null */
function emptyToNull<T>(v: T): T | null {
  if (v === '' || (typeof v === 'string' && v.trim() === '')) return null;
  return v;
}

export type ListDominiosFilters = BlockdomiListFilters;

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
  /** Nome do ofício (referência ao primeiro domínio do grupo com esse PDF) */
  nome_oficio?: string | null;
  /** Número da versão Blockdomi (blockdomi_versoes.numero), exibido como "serial" nos logs */
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
  const tmpDir = '/tmp/backnet-sei-sync';
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `sei-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.pdf`);
  const controller = new AbortController();
  const timeoutMs = 120000;
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(fullUrl, {
      headers: { 'User-Agent': 'BackNet/1.0' },
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
  /**
   * Listar domínios com filtros e paginação
   */
  static async list(filters: ListDominiosFilters): Promise<ListDominiosResponse> {
    return listBlockdomiPaginated({
      model: Dominio,
      filters,
      sortConfig: DOMINIO_SORT_CONFIG,
      primarySearchField: 'dominio',
      logContext: 'DominioService.list',
    });
  }

  /**
   * Buscar domínio por ID
   */
  static async getById(id: string | number): Promise<Dominio | null> {
    return await Dominio.findByPk(id, { include: BLOCKDOMI_LIST_INCLUDES });
  }

  /**
   * Buscar domínio por nome (para verificar duplicata)
   */
  static async findByDominio(dominio: string): Promise<Dominio | null> {
    return await Dominio.findOne({ where: { dominio } });
  }

  /**
   * Criar domínio (individual). Atribui versão automaticamente.
   */
  static async create(dadosDominio: Partial<Dominio> & { numero_sei_anatel?: string | null }): Promise<Dominio> {
    if (dadosDominio.descricao === undefined) {
      dadosDominio.descricao = null;
    }
    const empresaId = dadosDominio.empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, empresaId);
    const dados = { ...dadosDominio, versao_id: versaoId } as Record<string, unknown>;
    if ('numero_sei_anatel' in dados) {
      const raw = dados.numero_sei_anatel;
      delete dados.numero_sei_anatel;
      dados.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        raw as string | null | undefined
      );
    }
    const row = await Dominio.create(dados as never);
    await row.reload({ include: BLOCKDOMI_LIST_INCLUDES });
    return row;
  }

  /**
   * Atualizar domínio. Gera nova versão automaticamente.
   */
  static async update(id: string | number, dadosDominio: Partial<Dominio> & { numero_sei_anatel?: string | null }): Promise<Dominio> {
    const existingDominio = await Dominio.findByPk(id);
    
    if (!existingDominio) {
      throw new Error('Domínio não encontrado');
    }

    const allowedFields: Array<keyof Dominio> = [
      'dominio',
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'link_planilha_dominios',
      'ativo'
    ];

    const updateData: Partial<Dominio> = {};
    Object.keys(dadosDominio).forEach(key => {
      if (allowedFields.includes(key as keyof Dominio)) {
        const value = dadosDominio[key as keyof Dominio];
        if (value !== undefined) {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    });

    const extDominio = dadosDominio as Partial<Dominio> & { numero_sei_anatel?: string | null };
    if (extDominio.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        extDominio.numero_sei_anatel
      );
    }

    const empresaId = (existingDominio as { empresa_id?: number | null }).empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, empresaId);
    updateData.versao_id = versaoId;

    await existingDominio.update(updateData);
    await existingDominio.reload({ include: BLOCKDOMI_LIST_INCLUDES });

    return existingDominio;
  }

  /**
   * Atualiza vários domínios com os mesmos campos (edição em lote). Gera uma única versão blockdomi.
   * Não altera o campo `dominio` (cada registro mantém o FQDN).
   */
  static async bulkUpdate(
    ids: (string | number)[],
    dadosDominio: Partial<Dominio> & { numero_sei_anatel?: string | null }
  ): Promise<{ updated: number }> {
    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) {
      throw new Error('Informe ao menos um domínio');
    }

    const existentes = await Dominio.findAll({ where: { id: { [Op.in]: idsNum } } });
    if (existentes.length === 0) {
      throw new Error('Nenhum domínio encontrado para os IDs informados');
    }

    const allowedFields: Array<keyof Dominio> = [
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'link_planilha_dominios',
      'ativo'
    ];

    const updateData: Partial<Dominio> = {};
    Object.keys(dadosDominio).forEach((key) => {
      if (allowedFields.includes(key as keyof Dominio)) {
        const value = dadosDominio[key as keyof Dominio];
        if (value !== undefined) {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    });

    if (dadosDominio.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        dadosDominio.numero_sei_anatel
      );
    }

    if (Object.keys(updateData).length === 0) {
      return { updated: 0 };
    }

    const empresaId = (existentes[0] as { empresa_id?: number | null }).empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio', undefined, empresaId);
    updateData.versao_id = versaoId;

    const [affected] = await Dominio.update(updateData, { where: { id: { [Op.in]: idsNum } } });
    return { updated: affected };
  }

  /**
   * Buscar domínios existentes por lista (para verificar duplicatas em lote)
   */
  static async findByDominios(dominios: string[]): Promise<Set<string>> {
    if (dominios.length === 0) return new Set();
    const unique = [...new Set(dominios)];
    const found = await Dominio.findAll({
      where: { dominio: { [Op.in]: unique } },
      attributes: ['dominio'],
      raw: true
    });
    return new Set(found.map((r) => r.dominio as string));
  }

  /**
   * Buscar domínios existentes com id, data_fim_bloqueio e links (para atualização condicional)
   */
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
    const found = await Dominio.findAll({
      where: { dominio: { [Op.in]: unique } },
      attributes: ['id', 'dominio', 'data_fim_bloqueio', 'link_oficio_anatel', 'link_oficio_justica', 'link_planilha_dominios'],
      include: [{ model: NumeroSeiAnatelBlockdomi, as: 'numeroSeiRef', attributes: ['numero'], required: false }],
      raw: false
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
      const sei = (row as unknown as { numeroSeiRef?: { numero: string } }).numeroSeiRef?.numero ?? null;
      map.set(row.dominio as string, {
        id: row.id as number,
        data_fim_bloqueio: row.data_fim_bloqueio as string | null,
        link_oficio_anatel: row.link_oficio_anatel as string | null,
        link_oficio_justica: row.link_oficio_justica as string | null,
        link_planilha_dominios: row.link_planilha_dominios as string | null,
        numero_sei_anatel: sei
      });
    }
    return map;
  }

  /**
   * Criar múltiplos domínios em lote. Atualiza existentes apenas quando data_fim_bloqueio mudar (incluindo ficar vazia). data_inicio_bloqueio é obrigatória (validada no controller). Não usa data_inicio na decisão de atualizar para evitar reatualizar todo dia ao reimportar os mesmos domínios.
   * Se getVersoesForNewRecords for passado, será chamado com a quantidade de novos registros e as versões retornadas serão atribuídas (versao_id).
   */
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
    const toCreate: Array<{ dominio: string; [key: string]: unknown }> = [];
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
        data_inicio_bloqueio: emptyToNull(metadata.data_inicio_bloqueio ?? null),
        data_fim_bloqueio: emptyToNull(metadata.data_fim_bloqueio ?? null),
        link_oficio_anatel: emptyToNull(metadata.link_oficio_anatel ?? null),
        link_oficio_justica: emptyToNull(metadata.link_oficio_justica ?? null),
        link_planilha_dominios: emptyToNull(metadata.link_planilha_dominios ?? null),
        numero_sei_anatel_id: seiIdNovo,
        empresa_id: metadata.empresa_id ?? null,
        ativo: true
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
          (rec as Record<string, unknown>).versao_id = versaoId;
        });
      } else if (metadata.getVersoesForNewRecords) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = primeiraVersao ?? versoes[0]?.numero;
        toCreate.forEach((rec, i) => {
          const v = versoes[i];
          (rec as Record<string, unknown>).versao_id = v?.id ?? null;
        });
      }
    }

    const BATCH = 500;
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      await Dominio.bulkCreate(batch as never);
      created += batch.length;
    }

    let createdIds: number[] = [];
    if (toCreate.length > 0) {
      const dominiosCriados = await Dominio.findAll({
        where: { dominio: { [Op.in]: toCreate.map((c) => c.dominio) } },
        attributes: ['id'],
        raw: true
      });
      createdIds = dominiosCriados.map((r) => r.id as number);
    }

    let updated = 0;
    const updatedIds = toUpdate.map((u) => u.id);
    if (toUpdate.length > 0 && versaoId != null) {
      await Dominio.update(
        {
          nome_oficio: emptyToNull(metadata.nome_oficio ?? null),
          data_inicio_bloqueio: emptyToNull(metadata.data_inicio_bloqueio ?? null),
          data_fim_bloqueio: emptyToNull(newDataFim ?? null),
          link_oficio_anatel: emptyToNull(metadata.link_oficio_anatel ?? null),
          link_oficio_justica: emptyToNull(metadata.link_oficio_justica ?? null),
          link_planilha_dominios: emptyToNull(metadata.link_planilha_dominios ?? null),
          numero_sei_anatel_id: seiIdNovo,
          versao_id: versaoId
        },
        { where: { id: { [Op.in]: updatedIds } } }
      );
      updated = toUpdate.length;
    }

    if (errors.length > 0) {
      logger.warn('DominioService.bulkCreate itens com erro de validação', { quantidadeErros: errors.length, erros: errors });
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors, primeiraVersao, createdIds, updatedIds };
  }

  /**
   * Deletar domínio. Gera versão de exclusão e registra em operacoes_blockdomi.
   */
  static async delete(id: string | number): Promise<Dominio> {
    const dominio = await Dominio.findByPk(id);
    
    if (!dominio) {
      throw new Error('Domínio não encontrado');
    }

    const empresaId = (dominio as { empresa_id?: number | null }).empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio_delete', undefined, empresaId);
    await dominio.destroy();

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO blockdomi_operacoes (tipo, versao_id, quantidade, ids_deletados, created_at) 
       VALUES ('dominio_delete', :versaoId, 1, :ids, NOW())`,
      {
        replacements: { versaoId, ids: JSON.stringify([Number(id)]) },
        type: QueryTypes.INSERT
      }
    );
    
    return dominio;
  }

  /**
   * Deletar domínios em massa. Gera uma versão para toda a operação.
   */
  static async bulkDelete(ids: (string | number)[]): Promise<{ deleted: number; versao: string; versaoId: number }> {
    if (ids.length === 0) {
      return { deleted: 0, versao: '', versaoId: 0 };
    }

    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) {
      return { deleted: 0, versao: '', versaoId: 0 };
    }

    const { id: versaoId, numero: versao } = await VersaoBlockdomiService.obterProximaVersao('dominio_delete', undefined, null);

    const { Op } = await import('sequelize');
    const deleted = await Dominio.destroy({ where: { id: { [Op.in]: idsNum } } });

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO blockdomi_operacoes (tipo, versao_id, quantidade, ids_deletados, created_at) 
       VALUES ('dominio_delete', :versaoId, :qtd, :ids, NOW())`,
      {
        replacements: { versaoId, qtd: deleted, ids: JSON.stringify(idsNum) },
        type: QueryTypes.INSERT
      }
    );

    return { deleted, versao, versaoId };
  }

  /**
   * Agrupa domínios sem SEI por `link_oficio_anatel` (trim), baixa cada PDF uma única vez,
   * extrai o número SEI e atualiza todos os domínios daquele grupo via `bulkUpdate`.
   */
  static async sincronizarSeiAnatelPorPdfOficio(opts: {
    empresaId: number | null;
    publicBaseUrl: string;
  }): Promise<SincronizarSeiAnatelDominiosResult> {
    const { empresaId, publicBaseUrl } = opts;
    const whereEmpresa: WhereOptions<Dominio> =
      empresaId != null ? { empresa_id: empresaId } : ({} as WhereOptions<Dominio>);

    const rows = await Dominio.findAll({
      attributes: ['id', 'link_oficio_anatel', 'numero_sei_anatel_id', 'empresa_id', 'nome_oficio', 'versao_id'],
      where: whereEmpresa
    });

    const candidatos = rows.filter((r) => {
      const link = (r.link_oficio_anatel ?? '').trim();
      const noSei = r.numero_sei_anatel_id == null;
      return link.length > 0 && noSei;
    });

    const byUrl = new Map<string, number[]>();
    for (const r of candidatos) {
      const url = (r.link_oficio_anatel ?? '').trim();
      const list = byUrl.get(url) ?? [];
      list.push(r.id as number);
      byUrl.set(url, list);
    }

    const candidatosPorId = new Map(candidatos.map((row) => [row.id as number, row]));
    const versaoIds = [...new Set(candidatos.map((r) => r.versao_id).filter((v): v is number => v != null))];
    const versoes =
      versaoIds.length > 0
        ? await VersaoBlockdomi.findAll({
            where: { id: versaoIds },
            attributes: ['id', 'numero']
          })
        : [];
    const versaoNumeroPorId = new Map(versoes.map((v) => [v.id as number, v.numero]));

    const metaPorGrupo = (ids: number[]): { nome_oficio: string | null; versao_numero: string | null } => {
      const rep = candidatosPorId.get(ids[0]);
      const nome = rep?.nome_oficio?.trim() ? String(rep.nome_oficio).trim() : null;
      const vid = rep?.versao_id != null ? (rep.versao_id as number) : null;
      const serial = vid != null ? versaoNumeroPorId.get(vid) ?? null : null;
      return { nome_oficio: nome, versao_numero: serial };
    };

    const resultados: SincronizarSeiAnatelDominiosRow[] = [];
    const auditoria: SincronizarSeiAnatelDominiosAuditEntry[] = [];
    let dominiosAtualizados = 0;

    for (const [link, ids] of byUrl) {
      let tmpPath: string | null = null;
      let urlDownload: string | undefined;
      try {
        urlDownload = resolvePdfUrlParaDownload(link, publicBaseUrl);
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
            erro: erroMsg
          });
          continue;
        }
        const sei = extracted.sei.trim();
        const antesRows = await Dominio.findAll({ where: { id: { [Op.in]: ids } } });
        const antesMap = new Map(antesRows.map((d) => [d.id as number, d.toJSON() as Record<string, unknown>]));
        await DominioService.bulkUpdate(ids, { numero_sei_anatel: sei });
        const depoisRows = await Dominio.findAll({ where: { id: { [Op.in]: ids } } });
        const depoisMap = new Map(depoisRows.map((d) => [d.id as number, d.toJSON() as Record<string, unknown>]));
        for (const id of ids) {
          const antes = antesMap.get(id);
          const depois = depoisMap.get(id);
          if (antes && depois) {
            auditoria.push({ id, antes, depois });
          }
        }
        dominiosAtualizados += ids.length;
        const metaOk = metaPorGrupo(ids);
        resultados.push({
          link_oficio_anatel: link,
          quantidade_dominios: ids.length,
          nome_oficio: metaOk.nome_oficio,
          versao_numero: metaOk.versao_numero,
          sei
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        const metaErr = metaPorGrupo(ids);
        resultados.push({
          link_oficio_anatel: link,
          quantidade_dominios: ids.length,
          nome_oficio: metaErr.nome_oficio,
          versao_numero: metaErr.versao_numero,
          erro: msg
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
      auditoria
    };
  }
}
