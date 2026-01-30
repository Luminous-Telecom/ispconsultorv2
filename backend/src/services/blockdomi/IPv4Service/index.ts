import { IPv4 } from '../../../models/blockdomi/IPv4';
import { Op, WhereOptions, Order } from 'sequelize';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { IPV4_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListIPv4Filters {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListIPv4Response {
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

export class IPv4Service {
  /**
   * Listar IPv4 com filtros e paginação
   */
  static async list(filters: ListIPv4Filters): Promise<ListIPv4Response> {
    const { page = 1, limit = 15, search, ativo, sortColumn, sortDirection } = filters;
    const offset = (page - 1) * limit;

    // Construir filtros
    const whereConditions: Array<WhereOptions<IPv4>> = [];
    
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          { ip: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } },
          { nome_oficio: { [Op.like]: `%${search}%` } },
          { link_oficio_anatel: { [Op.like]: `%${search}%` } },
          { link_oficio_justica: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<IPv4>);
    }

    if (ativo !== undefined) {
      whereConditions.push({ ativo });
    }

    const where: WhereOptions<IPv4> = whereConditions.length > 0
      ? { [Op.and]: whereConditions } as WhereOptions<IPv4>
      : {};

    // Construir ordenação
    let order: Order = [['id', 'DESC']]; // Padrão
    
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        IPV4_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('IPv4Service.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
      }
    }

    const count = await IPv4.count({ where });
    
    const ipv4s = await IPv4.findAll({
      where,
      order,
      limit,
      offset,
      raw: false
    });

    const ipv4sProcessados = ipv4s.map(ipv4 => ipv4.toJSON());

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limit, count) : 0;

    return {
      data: ipv4sProcessados,
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
   * Buscar IPv4 por ID
   */
  static async getById(id: string | number): Promise<IPv4 | null> {
    return await IPv4.findByPk(id);
  }

  /**
   * Buscar IPv4 por IP (para verificar duplicata)
   */
  static async findByIp(ip: string): Promise<IPv4 | null> {
    return await IPv4.findOne({ where: { ip } });
  }

  /**
   * Criar IPv4
   */
  static async create(dadosIPv4: Partial<IPv4>): Promise<IPv4> {
    if (dadosIPv4.descricao === undefined) {
      dadosIPv4.descricao = null;
    }

    return await IPv4.create(dadosIPv4 as any);
  }

  /**
   * Atualizar IPv4
   */
  static async update(id: string | number, dadosIPv4: Partial<IPv4>): Promise<IPv4> {
    const existingIPv4 = await IPv4.findByPk(id);
    
    if (!existingIPv4) {
      throw new Error('IPv4 não encontrado');
    }

    const allowedFields: Array<keyof IPv4> = [
      'ip',
      'descricao',
      'nome_oficio',
      'data_inicio_bloqueio',
      'data_fim_bloqueio',
      'link_oficio_anatel',
      'link_oficio_justica',
      'ativo'
    ];
    
    const updateData: Partial<IPv4> = {};
    Object.keys(dadosIPv4).forEach(key => {
      if (allowedFields.includes(key as keyof IPv4)) {
        const value = dadosIPv4[key as keyof IPv4];
        if (value !== undefined) {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }
    });
    
    await existingIPv4.update(updateData);
    await existingIPv4.reload();

    return existingIPv4;
  }

  /**
   * Deletar IPv4
   */
  static async delete(id: string | number): Promise<IPv4> {
    const ipv4 = await IPv4.findByPk(id);
    
    if (!ipv4) {
      throw new Error('IPv4 não encontrado');
    }
    
    await ipv4.destroy();
    
    return ipv4;
  }
}
