import { Dominio } from '../../../models/blockdomi/Dominio';
import { VersaoBlockdomi } from '../../../models/blockdomi/VersaoBlockdomi';
import { Op, WhereOptions, Order } from 'sequelize';
import { sanitizeDominio } from '../../../utils/sanitize';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { DOMINIO_SORT_CONFIG } from '../../../config/sortConfigs';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';

/** Converte string vazia em null para campos DATEONLY/TEXT que aceitam null */
function emptyToNull<T>(v: T): T | null {
  if (v === '' || (typeof v === 'string' && v.trim() === '')) return null;
  return v;
}

export interface ListDominiosFilters {
  page?: number;
  limit?: number;
  search?: string;
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

export class DominioService {
  /**
   * Listar domínios com filtros e paginação
   */
  static async list(filters: ListDominiosFilters): Promise<ListDominiosResponse> {
    const { page = 1, limit = 15, search, ativo, sortColumn, sortDirection } = filters;
    const offset = (page - 1) * limit;

    // Construir filtros
    const whereConditions: Array<WhereOptions<Dominio>> = [];
    
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          { dominio: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } },
          { nome_oficio: { [Op.like]: `%${search}%` } },
          { link_oficio_anatel: { [Op.like]: `%${search}%` } },
          { link_oficio_justica: { [Op.like]: `%${search}%` } },
          { link_planilha_dominios: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<Dominio>);
    }

    if (ativo !== undefined) {
      whereConditions.push({ ativo });
    }

    const where: WhereOptions<Dominio> = whereConditions.length > 0
      ? { [Op.and]: whereConditions } as WhereOptions<Dominio>
      : {};

    // Construir ordenação
    let order: Order = [['id', 'DESC']]; // Padrão
    
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        DOMINIO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('DominioService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
      }
    }

    const count = await Dominio.count({ where });
    
    const dominios = await Dominio.findAll({
      where,
      order,
      limit,
      offset,
      include: [{ model: VersaoBlockdomi, as: 'versaoRef', attributes: ['numero'], required: false }],
      raw: false
    });

    const dominiosProcessados = dominios.map(dominio => dominio.toJSON());

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    return {
      data: dominiosProcessados,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
        from,
        to
      }
    };
  }

  /**
   * Buscar domínio por ID
   */
  static async getById(id: string | number): Promise<Dominio | null> {
    return await Dominio.findByPk(id);
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
  static async create(dadosDominio: Partial<Dominio>): Promise<Dominio> {
    if (dadosDominio.descricao === undefined) {
      dadosDominio.descricao = null;
    }
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio');
    const dados = { ...dadosDominio, versao_id: versaoId };
    return await Dominio.create(dados as never);
  }

  /**
   * Atualizar domínio. Gera nova versão automaticamente.
   */
  static async update(id: string | number, dadosDominio: Partial<Dominio>): Promise<Dominio> {
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

    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio');
    updateData.versao_id = versaoId;
    
    await existingDominio.update(updateData);
    await existingDominio.reload();

    return existingDominio;
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
   * Buscar domínios existentes com id e data_fim_bloqueio (para atualização condicional; só data_fim dispara atualização)
   */
  static async findByDominiosWithData(dominios: string[]): Promise<Map<string, { id: number; data_fim_bloqueio: string | null }>> {
    if (dominios.length === 0) return new Map();
    const unique = [...new Set(dominios)];
    const found = await Dominio.findAll({
      where: { dominio: { [Op.in]: unique } },
      attributes: ['id', 'dominio', 'data_fim_bloqueio'],
      raw: true
    });
    const map = new Map<string, { id: number; data_fim_bloqueio: string | null }>();
    for (const r of found) {
      map.set(r.dominio as string, { id: r.id as number, data_fim_bloqueio: r.data_fim_bloqueio as string | null });
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
      empresa_id?: number | null;
      getVersoesForNewRecords?: (count: number) => Promise<Array<{ id: number; numero: string }>>;
      versaoId?: number;
    }
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[]; primeiraVersao?: string }> {
    const sanitized = items.map((d) => sanitizeDominio(d)).filter(Boolean) as string[];
    const existingMap = sanitized.length > 0 ? await this.findByDominiosWithData(sanitized) : new Map();
    const toCreate: Array<{ dominio: string; [key: string]: unknown }> = [];
    const toUpdate: Array<{ id: number; dominio: string }> = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const newDataFim = metadata.data_fim_bloqueio ?? null;

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
        if (dataFimMudou) {
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
        empresa_id: metadata.empresa_id ?? null,
        ativo: true
      });
    }

    let primeiraVersao: string | undefined;
    let versaoId: number | null = metadata.versaoId ?? null;

    if (toCreate.length > 0 || toUpdate.length > 0) {
      if (versaoId == null && !metadata.getVersoesForNewRecords) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('dominio');
        versaoId = versao.id;
        primeiraVersao = versao.numero;
      } else if (metadata.getVersoesForNewRecords && toCreate.length > 0) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = versoes[0]?.numero;
      }
      if (toUpdate.length > 0 && versaoId == null) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('dominio');
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

    let updated = 0;
    if (toUpdate.length > 0 && versaoId != null) {
      const ids = toUpdate.map((u) => u.id);
      await Dominio.update(
        {
          nome_oficio: emptyToNull(metadata.nome_oficio ?? null),
          data_inicio_bloqueio: emptyToNull(metadata.data_inicio_bloqueio ?? null),
          data_fim_bloqueio: emptyToNull(newDataFim ?? null),
          link_oficio_anatel: emptyToNull(metadata.link_oficio_anatel ?? null),
          link_oficio_justica: emptyToNull(metadata.link_oficio_justica ?? null),
          link_planilha_dominios: emptyToNull(metadata.link_planilha_dominios ?? null),
          versao_id: versaoId
        },
        { where: { id: { [Op.in]: ids } } }
      );
      updated = toUpdate.length;
    }

    if (errors.length > 0) {
      logger.warn('DominioService.bulkCreate itens com erro de validação', { quantidadeErros: errors.length, erros: errors });
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors, primeiraVersao };
  }

  /**
   * Deletar domínio. Gera versão de exclusão e registra em operacoes_blockdomi.
   */
  static async delete(id: string | number): Promise<Dominio> {
    const dominio = await Dominio.findByPk(id);
    
    if (!dominio) {
      throw new Error('Domínio não encontrado');
    }

    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('dominio_delete');
    await dominio.destroy();

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO operacoes_blockdomi (tipo, versao_id, quantidade, ids_deletados, created_at) 
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

    const { id: versaoId, numero: versao } = await VersaoBlockdomiService.obterProximaVersao('dominio_delete');

    const { Op } = await import('sequelize');
    const deleted = await Dominio.destroy({ where: { id: { [Op.in]: idsNum } } });

    const { sequelize } = await import('../../../config/database');
    const { QueryTypes } = await import('sequelize');
    await sequelize.query(
      `INSERT INTO operacoes_blockdomi (tipo, versao_id, quantidade, ids_deletados, created_at) 
       VALUES ('dominio_delete', :versaoId, :qtd, :ids, NOW())`,
      {
        replacements: { versaoId, qtd: deleted, ids: JSON.stringify(idsNum) },
        type: QueryTypes.INSERT
      }
    );

    return { deleted, versao, versaoId };
  }
}
