import { Banco } from '../../../models/cadastros/Banco';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import { cache } from '../../../utils/cache';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { BANCO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListBancosFilters {
  search?: string;
  status?: string;
  tipo_banco?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

export interface ListBancosResponse {
  success: boolean;
  data: Banco[];
  pagination?: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class BancoService {
  /**
   * Buscar bancos ativos
   */
  static async findAtivos(empresaId?: number): Promise<{ success: boolean; data: Banco[] }> {
    const cacheKey = `bancos:ativos:${empresaId || 0}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached as { success: boolean; data: Banco[] };
    }

    const where: WhereOptions = { ativo: true };
    if (empresaId !== undefined) {
      where.empresa_id = empresaId;
    }

    const bancos = await Banco.findAll({
      where,
      include: [
        { association: 'titulos' }
      ],
      order: [['nome', 'ASC']]
    });

    const response = {
      success: true,
      data: bancos
    };

    cache.set(cacheKey, response, 600000);
    return response;
  }

  /**
   * Listar bancos com filtros e paginação
   */
  static async list(filters: ListBancosFilters): Promise<ListBancosResponse> {
    const { search, status, tipo_banco, page = 1, limit = 15, sortColumn, sortDirection, empresa_id } = filters;
    
    const where: WhereOptions<Banco> = {};

    if (empresa_id !== undefined) {
      where.empresa_id = empresa_id;
    }
    
    if (search) {
      (where as Record<symbol, unknown>)[Op.or] = [
        { id: { [Op.like]: `%${search}%` } },
        { nome: { [Op.like]: `%${search}%` } },
        { descricao: { [Op.like]: `%${search}%` } },
        { tipo_banco: { [Op.like]: `%${search}%` } },
        { sandbox: { [Op.like]: `%${search}%` } },
        { ativo: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      where.ativo = status === 'ativo';
    }
    
    if (tipo_banco) {
      where.tipo_banco = tipo_banco as 'efi' | 'asaas' | 'bancario' | 'outros';
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        BANCO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('BancoService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }
    
    const offset = (Number(page) - 1) * Number(limit);

    const count = await Banco.count({ where });
    
    let bancos;
    try {
      bancos = await Banco.findAll({
        where,
        order,
        limit: Number(limit),
        offset,
        include: [
          { association: 'titulos' }
        ]
      });
    } catch (queryError: any) {
      logger.error('BancoService.list - Erro na query', {
        error: queryError.message,
        stack: queryError.stack,
        where: JSON.stringify(where).substring(0, 200),
        order: JSON.stringify(order).substring(0, 200)
      });
      throw queryError;
    }
    
    const limitNum = Number(limit);
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      success: true,
      data: bancos,
      pagination: {
        current_page: Number(page),
        per_page: limitNum,
        total: count,
        last_page: Math.ceil(count / limitNum),
        from,
        to
      }
    };
  }

  /**
   * Buscar banco por ID
   */
  static async getById(id: string | number): Promise<Banco | null> {
    return await Banco.findByPk(id, {
      include: [
        { association: 'titulos' }
      ]
    });
  }

  /**
   * Buscar primeiro banco ativo
   */
  static async findFirstAtivo(): Promise<Banco | null> {
    return await Banco.findOne({
      where: { ativo: true },
      order: [['id', 'DESC']]
    });
  }

  /**
   * Verificar se existe banco com nome
   */
  static async existsByName(nome: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions<Banco> = { nome };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    
    const banco = await Banco.findOne({ where });
    return !!banco;
  }

  /**
   * Criar banco
   */
  static async create(dadosBanco: Partial<Banco>): Promise<Banco> {
    return await Banco.create(dadosBanco as any);
  }

  /**
   * Atualizar banco
   */
  static async update(id: string | number, dadosBanco: Partial<Banco>): Promise<Banco> {
    const banco = await Banco.findByPk(id);
    
    if (!banco) {
      throw new Error('Banco não encontrado');
    }
    
    await banco.update(dadosBanco);
    await banco.reload();
    
    // Invalidar cache se status mudou
    if (dadosBanco.ativo !== undefined) {
      cache.delete('bancos:ativos');
    }
    
    return banco;
  }

  /**
   * Deletar banco
   */
  static async delete(id: string | number): Promise<Banco> {
    const banco = await Banco.findByPk(id);
    
    if (!banco) {
      throw new Error('Banco não encontrado');
    }
    
    const titulosCount = await banco.countTitulos();
    
    if (titulosCount > 0) {
      throw new Error('Não é possível excluir banco com títulos associados.');
    }
    
    await banco.destroy();
    
    // Invalidar cache
    cache.delete('bancos:ativos');
    
    return banco;
  }

  /**
   * Contar bancos com filtros (para dashboard)
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await Banco.count({ where });
  }
}

