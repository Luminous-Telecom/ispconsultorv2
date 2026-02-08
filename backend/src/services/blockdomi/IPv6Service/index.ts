import { IPv6 } from '../../../models/blockdomi/IPv6';
import { Op, WhereOptions, Order } from 'sequelize';
import { isValidIPv6 } from '../../../utils/sanitize';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { IPV6_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListIPv6Filters {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: string;
}

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
    const { page = 1, limit = 15, search, ativo, sortColumn, sortDirection } = filters;
    const offset = (page - 1) * limit;

    // Construir filtros
    const whereConditions: Array<WhereOptions<IPv6>> = [];
    
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          { ip: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } },
          { nome_oficio: { [Op.like]: `%${search}%` } },
          { link_oficio_anatel: { [Op.like]: `%${search}%` } },
          { link_oficio_justica: { [Op.like]: `%${search}%` } },
          { link_planilha_dominios: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<IPv6>);
    }

    if (ativo !== undefined) {
      whereConditions.push({ ativo });
    }

    const where: WhereOptions<IPv6> = whereConditions.length > 0
      ? { [Op.and]: whereConditions } as WhereOptions<IPv6>
      : {};

    // Construir ordenação
    let order: Order = [['id', 'DESC']]; // Padrão
    
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        IPV6_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('IPv6Service.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
      }
    }

    const count = await IPv6.count({ where });
    
    const ipv6s = await IPv6.findAll({
      where,
      order,
      limit,
      offset,
      raw: false
    });

    const ipv6sProcessados = ipv6s.map(ipv6 => ipv6.toJSON());

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    return {
      data: ipv6sProcessados,
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
   * Buscar IPv6 por ID
   */
  static async getById(id: string | number): Promise<IPv6 | null> {
    return await IPv6.findByPk(id);
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
   * Buscar IPs existentes com id e data_fim_bloqueio (para atualização condicional; só data_fim dispara atualização)
   */
  static async findByIpsWithData(ips: string[]): Promise<Map<string, { id: number; data_fim_bloqueio: string | null }>> {
    if (ips.length === 0) return new Map();
    const unique = [...new Set(ips)];
    const found = await IPv6.findAll({
      where: { ip: { [Op.in]: unique } },
      attributes: ['id', 'ip', 'data_fim_bloqueio'],
      raw: true
    });
    const map = new Map<string, { id: number; data_fim_bloqueio: string | null }>();
    for (const r of found) {
      map.set(r.ip as string, { id: r.id as number, data_fim_bloqueio: r.data_fim_bloqueio as string | null });
    }
    return map;
  }

  /**
   * Criar múltiplos IPv6 em lote. Atualiza existentes apenas quando data_fim_bloqueio mudar (incluindo ficar vazia). data_inicio_bloqueio é obrigatória. Não usa data_inicio na decisão de atualizar para evitar reatualizar todo dia ao reimportar os mesmos itens.
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
    }
  ): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const valid = items.filter((ip) => isValidIPv6(ip));
    const existingMap = valid.length > 0 ? await this.findByIpsWithData(valid) : new Map();
    const toCreate: Array<Record<string, unknown>> = [];
    const toUpdate: Array<{ id: number }> = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const newDataFim = metadata.data_fim_bloqueio ?? null;

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
        if (dataFimMudou) {
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
        ativo: true
      });
    }

    const BATCH = 500;
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      await IPv6.bulkCreate(batch as never);
      created += batch.length;
    }

    let updated = 0;
    for (const { id } of toUpdate) {
      await this.update(id, {
        nome_oficio: metadata.nome_oficio ?? undefined,
        data_inicio_bloqueio: metadata.data_inicio_bloqueio ?? undefined,
        data_fim_bloqueio: newDataFim ?? undefined,
        link_oficio_anatel: metadata.link_oficio_anatel ?? undefined,
        link_oficio_justica: metadata.link_oficio_justica ?? undefined,
        link_planilha_dominios: metadata.link_planilha_dominios ?? undefined
      });
      updated += 1;
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors };
  }

  /**
   * Criar IPv6
   */
  static async create(dadosIPv6: Partial<IPv6>): Promise<IPv6> {
    if (dadosIPv6.descricao === undefined) {
      dadosIPv6.descricao = null;
    }

    return await IPv6.create(dadosIPv6 as any);
  }

  /**
   * Atualizar IPv6
   */
  static async update(id: string | number, dadosIPv6: Partial<IPv6>): Promise<IPv6> {
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
    
    await existingIPv6.update(updateData);
    await existingIPv6.reload();

    return existingIPv6;
  }

  /**
   * Deletar IPv6
   */
  static async delete(id: string | number): Promise<IPv6> {
    const ipv6 = await IPv6.findByPk(id);
    
    if (!ipv6) {
      throw new Error('IPv6 não encontrado');
    }
    
    await ipv6.destroy();
    
    return ipv6;
  }
}
