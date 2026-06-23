import { IPv6 } from '../../../models/blockdomi/IPv6';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';
import { NumeroSeiAnatelBlockdomi } from '../../../models/blockdomi/NumeroSeiAnatelBlockdomi';
import { NumeroSeiAnatelBlockdomiService } from '../NumeroSeiAnatelBlockdomiService';
import { Op, WhereOptions, Order } from 'sequelize';
import { isValidIPv6 } from '../../../utils/sanitize';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';
import { logger } from '../../../utils/logger';
import { IPV6_SORT_CONFIG } from '../../../config/sortConfigs';
import {
  BLOCKDOMI_LIST_INCLUDES,
  listBlockdomiPaginated,
  type BlockdomiListFilters,
} from '../../../utils/blockdomiListHelper';

export type ListIPv6Filters = BlockdomiListFilters;

export interface ListIPv6Response {
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

export class IPv6Service {
  /**
   * Listar IPv6 com filtros e paginação
   */
  static async list(filters: ListIPv6Filters): Promise<ListIPv6Response> {
    return listBlockdomiPaginated({
      model: IPv6,
      filters,
      sortConfig: IPV6_SORT_CONFIG,
      primarySearchField: 'ip',
      logContext: 'IPv6Service.list',
    });
  }

  /**
   * Buscar IPv6 por ID
   */
  static async getById(id: string | number): Promise<IPv6 | null> {
    return await IPv6.findByPk(id, { include: BLOCKDOMI_LIST_INCLUDES });
  }

  /**
   * Buscar IPv6 por IP (para verificar duplicata)
   */
  static async findByIp(ip: string): Promise<IPv6 | null> {
    return await IPv6.findOne({ where: { ip } });
  }

  /**
   * Buscar IPs existentes por lista
   */
  static async findByIps(ips: string[]): Promise<Set<string>> {
    if (ips.length === 0) return new Set();
    const unique = [...new Set(ips)];
    const found = await IPv6.findAll({
      where: { ip: { [Op.in]: unique } },
      attributes: ['ip'],
      raw: true
    });
    return new Set(found.map((r) => r.ip as string));
  }

  /**
   * Buscar IPs existentes com id, data_fim_bloqueio e links (para atualização condicional)
   */
  static async findByIpsWithData(ips: string[]): Promise<Map<string, {
    id: number;
    data_fim_bloqueio: string | null;
    link_oficio_anatel: string | null;
    link_oficio_justica: string | null;
    link_planilha_dominios: string | null;
    numero_sei_anatel: string | null;
  }>> {
    if (ips.length === 0) return new Map();
    const unique = [...new Set(ips)];
    const found = await IPv6.findAll({
      where: { ip: { [Op.in]: unique } },
      attributes: ['id', 'ip', 'data_fim_bloqueio', 'link_oficio_anatel', 'link_oficio_justica', 'link_planilha_dominios'],
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
      map.set(row.ip as string, {
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
   * Criar múltiplos IPv6 em lote. Atualiza existentes apenas quando data_fim_bloqueio mudar (incluindo ficar vazia). data_inicio_bloqueio é obrigatória. Não usa data_inicio na decisão de atualizar para evitar reatualizar todo dia ao reimportar os mesmos itens.
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
    const valid = items.filter((ip) => isValidIPv6(ip));
    const existingMap = valid.length > 0 ? await this.findByIpsWithData(valid) : new Map();
    const toCreate: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: number }> = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const newDataFim = metadata.data_fim_bloqueio ?? null;
    const seiIdNovo = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(metadata.numero_sei_anatel ?? null);

    for (const ip of items) {
      if (!isValidIPv6(ip)) {
        errors.push(`${ip}: IPv6 inválido`);
        continue;
      }
      if (seen.has(ip)) continue;
      seen.add(ip);

      const existing = existingMap.get(ip);
      if (existing) {
        const dataFimMudou = newDataFim !== (existing.data_fim_bloqueio ?? null);
        const hasNoUrls = !(existing.link_oficio_anatel?.trim() || existing.link_oficio_justica?.trim() || existing.link_planilha_dominios?.trim());
        const hasUrlsToAdd = !!(metadata.link_oficio_anatel?.trim() || metadata.link_oficio_justica?.trim() || metadata.link_planilha_dominios?.trim());
        const hasNoSei = !(existing.numero_sei_anatel?.trim());
        const hasSeiToAdd = !!(metadata.numero_sei_anatel?.trim());
        if (dataFimMudou || (hasNoUrls && hasUrlsToAdd) || (hasNoSei && hasSeiToAdd)) {
          toUpdate.push({ id: existing.id });
        }
        continue;
      }

      toCreate.push({
        ip,
        descricao: null,
        nome_oficio: metadata.nome_oficio ?? null,
        data_inicio_bloqueio: metadata.data_inicio_bloqueio ?? null,
        data_fim_bloqueio: metadata.data_fim_bloqueio ?? null,
        link_oficio_anatel: metadata.link_oficio_anatel ?? null,
        link_oficio_justica: metadata.link_oficio_justica ?? null,
        link_planilha_dominios: metadata.link_planilha_dominios ?? null,
        numero_sei_anatel_id: seiIdNovo,
        empresa_id: metadata.empresa_id ?? null,
        ativo: true
      });
    }

    let primeiraVersao: string | undefined;
    let versaoId: number | null = metadata.versaoId ?? null;

    const metaEmpresaId = metadata.empresa_id ?? null;
    if (toCreate.length > 0 || toUpdate.length > 0) {
      if (versaoId == null && !metadata.getVersoesForNewRecords) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, metaEmpresaId);
        versaoId = versao.id;
        primeiraVersao = versao.numero;
      } else if (metadata.getVersoesForNewRecords && toCreate.length > 0) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = versoes[0]?.numero;
      }
      if (toUpdate.length > 0 && versaoId == null) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, metaEmpresaId);
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
      await IPv6.bulkCreate(batch as never);
      created += batch.length;
    }

    let createdIds: number[] = [];
    if (toCreate.length > 0) {
      const ipsCriados = toCreate.map((c) => c.ip as string);
      const registros = await IPv6.findAll({
        where: { ip: { [Op.in]: ipsCriados } },
        attributes: ['id'],
        raw: true
      });
      createdIds = registros.map((r) => r.id as number);
    }

    let updated = 0;
    const updatedIds = toUpdate.map((u) => u.id);
    if (toUpdate.length > 0 && versaoId != null) {
      await IPv6.update(
        {
          nome_oficio: metadata.nome_oficio ?? null,
          data_inicio_bloqueio: metadata.data_inicio_bloqueio ?? null,
          data_fim_bloqueio: newDataFim ?? null,
          link_oficio_anatel: metadata.link_oficio_anatel ?? null,
          link_oficio_justica: metadata.link_oficio_justica ?? null,
          link_planilha_dominios: metadata.link_planilha_dominios ?? null,
          numero_sei_anatel_id: seiIdNovo,
          versao_id: versaoId
        },
        { where: { id: { [Op.in]: updatedIds } } }
      );
      updated = toUpdate.length;
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors, primeiraVersao, createdIds, updatedIds };
  }

  /**
   * Criar IPv6 (individual). Atribui versão automaticamente.
   */
  static async create(dadosIPv6: Partial<IPv6> & { numero_sei_anatel?: string | null }): Promise<IPv6> {
    if (dadosIPv6.descricao === undefined) {
      dadosIPv6.descricao = null;
    }
    const empresaId = dadosIPv6.empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, empresaId);
    const dados = { ...dadosIPv6, versao_id: versaoId } as Record<string, unknown>;
    if ('numero_sei_anatel' in dados) {
      const raw = dados.numero_sei_anatel;
      delete dados.numero_sei_anatel;
      dados.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(
        raw as string | null | undefined
      );
    }
    const row = await IPv6.create(dados as never);
    await row.reload({ include: BLOCKDOMI_LIST_INCLUDES });
    return row;
  }

  /**
   * Atualizar IPv6. Gera nova versão automaticamente.
   */
  static async update(id: string | number, dadosIPv6: Partial<IPv6> & { numero_sei_anatel?: string | null }): Promise<IPv6> {
    const existingIPv6 = await IPv6.findByPk(id);
    
    if (!existingIPv6) {
      throw new Error('IPv6 não encontrado');
    }

    const allowedFields: Array<keyof IPv6> = [
      'ip',
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'link_planilha_dominios',
      'ativo'
    ];

    const updateData: Partial<IPv6> = {};
    Object.keys(dadosIPv6).forEach(key => {
      if (allowedFields.includes(key as keyof IPv6)) {
        const value = dadosIPv6[key as keyof IPv6];
        if (value !== undefined) {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    });

    const ext = dadosIPv6 as Partial<IPv6> & { numero_sei_anatel?: string | null };
    if (ext.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(ext.numero_sei_anatel);
    }

    const empresaId = (existingIPv6 as { empresa_id?: number | null }).empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, empresaId);
    updateData.versao_id = versaoId;
    
    await existingIPv6.update(updateData);
    await existingIPv6.reload({ include: BLOCKDOMI_LIST_INCLUDES });

    return existingIPv6;
  }

  /**
   * Deletar IPv6. Gera versão de exclusão e registra em operacoes_blockdomi.
   */
  static async delete(id: string | number): Promise<IPv6> {
    const ipv6 = await IPv6.findByPk(id);
    
    if (!ipv6) {
      throw new Error('IPv6 não encontrado');
    }

    const empresaId = (ipv6 as { empresa_id?: number | null }).empresa_id ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6_delete', undefined, empresaId);
    await ipv6.destroy();

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO blockdomi_operacoes (tipo, versao_id, quantidade, ids_deletados, created_at) 
       VALUES ('ipv6_delete', :versaoId, 1, :ids, NOW())`,
      {
        replacements: { versaoId, ids: JSON.stringify([Number(id)]) },
        type: QueryTypes.INSERT
      }
    );
    
    return ipv6;
  }

  /**
   * Deletar IPv6 em massa. Gera uma versão para toda a operação.
   */
  static async bulkDelete(ids: (string | number)[]): Promise<{ deleted: number; versao: string; versaoId: number }> {
    if (ids.length === 0) {
      return { deleted: 0, versao: '', versaoId: 0 };
    }

    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) {
      return { deleted: 0, versao: '', versaoId: 0 };
    }

    const { id: versaoId, numero: versao } = await VersaoBlockdomiService.obterProximaVersao('ipv6_delete', undefined, null);

    const { Op } = await import('sequelize');
    const deleted = await IPv6.destroy({ where: { id: { [Op.in]: idsNum } } });

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO blockdomi_operacoes (tipo, versao_id, quantidade, ids_deletados, created_at) 
       VALUES ('ipv6_delete', :versaoId, :qtd, :ids, NOW())`,
      {
        replacements: { versaoId, qtd: deleted, ids: JSON.stringify(idsNum) },
        type: QueryTypes.INSERT
      }
    );

    return { deleted, versao, versaoId };
  }
}
