import { Dominio } from '../../../models/blockdomi/Dominio';
import { Op, WhereOptions, Order } from 'sequelize';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { DOMINIO_SORT_CONFIG } from '../../../config/sortConfigs';

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
          { link_oficio_justica: { [Op.like]: `%${search}%` } }
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
   * Criar domínio
   */
  static async create(dadosDominio: Partial<Dominio>): Promise<Dominio> {
    if (dadosDominio.descricao === undefined) {
      dadosDominio.descricao = null;
    }

    return await Dominio.create(dadosDominio as any);
  }

  /**
   * Atualizar domínio
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
    
    await existingDominio.update(updateData);
    await existingDominio.reload();

    return existingDominio;
  }

  /**
   * Deletar domínio
   */
  static async delete(id: string | number): Promise<Dominio> {
    const dominio = await Dominio.findByPk(id);
    
    if (!dominio) {
      throw new Error('Domínio não encontrado');
    }
    
    await dominio.destroy();
    
    return dominio;
  }
}
