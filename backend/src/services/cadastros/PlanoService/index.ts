import { Plano } from '../../../models/cadastros/Plano';
import { Contrato } from '../../../models/contratos/Contrato';
import { Op, WhereOptions, Order } from 'sequelize';
import { sequelize } from '../../../config/database';
import { cache } from '../../../utils/cache';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { PLANO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListPlanosFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tipo_servico?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListPlanosResponse {
  data: Array<Record<string, unknown> & { quantidade_clientes: number }>;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class PlanoService {
  /**
   * Listar planos com filtros e paginação
   */
  static async list(filters: ListPlanosFilters): Promise<ListPlanosResponse> {
    const { page = 1, limit = 15, search, status, tipo_servico, sortColumn, sortDirection } = filters;
    const offset = (page - 1) * limit;

    // Cache key para planos ativos sem filtros
    const cacheKey = `planos:list:${page}:${limit}:${status || 'all'}:${tipo_servico || 'all'}:${search || ''}:${sortColumn || 'id'}:${sortDirection || 'DESC'}`;
    
    // Verificar cache apenas para listagem simples (sem busca)
    if (!search && !sortColumn) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached as ListPlanosResponse;
      }
    }

    // Construir filtros
    const whereConditions: Array<WhereOptions<Plano>> = [];
    
    if (search) {
      whereConditions.push({
        [Op.or]: [
          { id: { [Op.like]: `%${search}%` } },
          { nome_plano: { [Op.like]: `%${search}%` } },
          { descricao: { [Op.like]: `%${search}%` } },
          { tipo_servico: { [Op.like]: `%${search}%` } },
          { valor_mensal: { [Op.like]: `%${search}%` } },
          { quantidade_usuarios: { [Op.like]: `%${search}%` } },
          { periodicidade: { [Op.like]: `%${search}%` } },
          { status: { [Op.like]: `%${search}%` } }
        ]
      } as WhereOptions<Plano>);
    }

    if (status) {
      whereConditions.push({ status: status as 'ativo' | 'inativo' });
    }

    if (tipo_servico) {
      whereConditions.push({ tipo_servico: tipo_servico as 'infraestrutura' | 'consultoria' });
    }

    const where: WhereOptions<Plano> = whereConditions.length > 0
      ? { [Op.and]: whereConditions } as WhereOptions<Plano>
      : {};

    // Construir ordenação - ordena TODOS os dados antes da paginação
    // Se for ordenar por quantidade_clientes, usar subquery especial
    let order: Order = [['id', 'DESC']]; // Padrão
    const isOrderingByQuantidadeClientes = sortColumn === 'quantidade_clientes' || sortColumn === 'clientes';
    
    if (sortColumn && sortDirection && !isOrderingByQuantidadeClientes) {
      const sortResult = SortHelper.buildOrder(
        PLANO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('PlanoService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    } else if (isOrderingByQuantidadeClientes && sortDirection) {
      // Ordenação especial por quantidade_clientes usando subquery
      // IMPORTANTE: Usar o alias 'Plano' que o Sequelize gera para a tabela 'planos'
      const upperDirection = sortDirection.toUpperCase() as 'ASC' | 'DESC';
      const subquerySql = `(SELECT COUNT(DISTINCT contratos.cliente_id) FROM contratos WHERE contratos.plano_id = Plano.id AND contratos.status = 'ativo')`;
      order = [[sequelize.literal(subquerySql), upperDirection]];
    }

    const count = await Plano.count({ where });
    
    let planos;
    try {
      planos = await Plano.findAll({
      where,
      attributes: [
        'id', 'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
        'quantidade_usuarios', 'valor_mensal', 'periodicidade', 'renovacao_automatica', 'data_inicio',
        'data_fim', 'status', 'observacoes', 'created_at', 'updated_at'
      ],
      include: [
        { 
          association: 'clientes', 
          attributes: ['id', 'razao_social', 'nome_fantasia'],
          through: { 
            attributes: ['desconto_percentual', 'desconto_valor', 'valor_final', 'status']
          },
          required: false
        }
      ],
      order,
      limit,
      offset,
      raw: false
      });
      
    } catch (queryError: any) {
      logger.error('PlanoService.list - Erro na query', {
        error: queryError.message,
        errorName: queryError.name,
        sql: queryError.sql,
        stack: queryError.stack,
        sortColumn,
        sortDirection,
        order: JSON.stringify(order).substring(0, 300),
        where: JSON.stringify(where).substring(0, 300),
        isOrderingByQuantidadeClientes
      });
      throw queryError;
    }

    // Buscar quantidade de contratos ativos por plano
    const planoIds = planos.map(p => p.id);
    const contratosAtivosPorPlano = await Contrato.findAll({
      attributes: [
        'plano_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total']
      ],
      where: {
        plano_id: { [Op.in]: planoIds },
        status: 'ativo'
      },
      group: ['plano_id'],
      raw: true
    });

    interface ContratoCountResult {
      plano_id: number;
      total: string | number;
    }
    const quantidadeClientesMap = (contratosAtivosPorPlano as unknown as ContratoCountResult[]).reduce((acc, item) => {
      acc[item.plano_id] = typeof item.total === 'string' ? parseInt(item.total, 10) : item.total;
      return acc;
    }, {} as Record<number, number>);

    interface PlanoWithCount extends Record<string, unknown> {
      quantidade_clientes: number;
      servicos_inclusos?: string | string[];
    }
    
    const planosProcessados: PlanoWithCount[] = planos.map(plano => {
      const planoJson = plano.toJSON();
      const planoData = { ...planoJson, quantidade_clientes: 0 } as PlanoWithCount;
      
      if (typeof planoData.servicos_inclusos === 'string') {
        try {
          planoData.servicos_inclusos = JSON.parse(planoData.servicos_inclusos);
        } catch {
          planoData.servicos_inclusos = [];
        }
      }
      const planoId = Number(plano.id);
      planoData.quantidade_clientes = quantidadeClientesMap[planoId] || 0;
      return planoData;
    });

    const response = {
      data: planosProcessados,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
        from: offset + 1,
        to: Math.min(offset + limit, count)
      }
    };

    // Cachear apenas se não tiver busca ou ordenação
    if (!search && !sortColumn) {
      cache.set(cacheKey, response, 600000);
    }

    return response;
  }

  /**
   * Buscar plano por ID
   */
  static async getById(id: string | number, transaction?: any): Promise<Plano | null> {
    const plano = await Plano.findByPk(id, {
      include: [
        { 
          association: 'clientes', 
          attributes: ['id', 'razao_social', 'nome_fantasia'],
          through: { attributes: ['desconto_percentual', 'desconto_valor', 'valor_final', 'status'] }
        }
      ],
      transaction
    });

    return plano;
  }

  /**
   * Buscar planos ativos
   */
  static async findAtivos(): Promise<Plano[]> {
    return await Plano.findAll({
      where: { status: 'ativo' },
      order: [['nome_plano', 'ASC']]
    });
  }

  /**
   * Contar planos com filtros (para dashboard)
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await Plano.count({ where });
  }

  /**
   * Criar plano
   */
  static async create(dadosPlano: Partial<Plano>): Promise<Plano> {
    // Normalizar strings vazias e 'Invalid date' para null
    const dataInicio = dadosPlano.data_inicio as any;
    const dataFim = dadosPlano.data_fim as any;
    
    if (dataInicio === '' || dataInicio === 'Invalid date' || (typeof dataInicio === 'string' && dataInicio === 'Invalid date')) {
      dadosPlano.data_inicio = null;
    }
    if (dataFim === '' || dataFim === 'Invalid date' || (typeof dataFim === 'string' && dataFim === 'Invalid date')) {
      dadosPlano.data_fim = null;
    }
    
    if (dadosPlano.descricao === undefined) {
      dadosPlano.descricao = null;
    }

    const plano = await Plano.create(dadosPlano as any);
    
    // Invalidar cache
    cache.deletePattern('planos:list:.*');
    
    return plano;
  }

  /**
   * Atualizar plano
   */
  static async update(id: string | number, dadosPlano: Partial<Plano>): Promise<Plano> {
    const existingPlano = await Plano.findByPk(id);
    
    if (!existingPlano) {
      throw new Error('Plano não encontrado');
    }

    type AllowedField = 'nome_plano' | 'descricao' | 'tipo_servico' | 'servicos_inclusos' |
      'quantidade_usuarios' | 'valor_mensal' | 'periodicidade' | 'renovacao_automatica' | 'data_inicio' |
      'data_fim' | 'status' | 'observacoes';
    
    const allowedFields: AllowedField[] = [
      'nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos',
      'quantidade_usuarios', 'valor_mensal', 'periodicidade', 'renovacao_automatica', 'data_inicio',
      'data_fim', 'status', 'observacoes'
    ];
    
    interface PlanoUpdateData {
      nome_plano?: string;
      descricao?: string | null;
      tipo_servico?: 'infraestrutura' | 'consultoria';
      servicos_inclusos?: string[] | null;
      quantidade_usuarios?: number | null;
      valor_mensal?: number;
      periodicidade?: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'bimestral' | 'quinzenal' | 'semanal' | null;
      renovacao_automatica?: boolean;
      data_inicio?: Date | null;
      data_fim?: Date | null;
      status?: 'ativo' | 'inativo';
      observacoes?: string | null;
    }
    
    const updateData: PlanoUpdateData = {};
    Object.keys(dadosPlano).forEach(key => {
      if (allowedFields.includes(key as AllowedField)) {
        const fieldKey = key as AllowedField;
        if (fieldKey === 'data_inicio' || fieldKey === 'data_fim') {
          const dateValue = dadosPlano[fieldKey] as any;
          if (dateValue && dateValue !== '' && dateValue !== 'Invalid date') {
            if (typeof dateValue === 'string') {
              const [year, month, day] = String(dateValue).split('-').map(Number);
              if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
                const date = new Date(year, month - 1, day);
                (updateData as Record<string, Date | null>)[fieldKey] = date;
              }
            } else if (dateValue instanceof Date) {
              (updateData as Record<string, Date | null>)[fieldKey] = dateValue;
            }
          }
        } else {
          const value = dadosPlano[fieldKey];
          if (value === undefined) {
            (updateData as Record<string, unknown>)[fieldKey] = null;
          } else {
            (updateData as Record<string, unknown>)[fieldKey] = value;
          }
        }
      }
    });
    
    await Plano.update(updateData, {
      where: { id }
    });

    const plano = await Plano.findByPk(id);
    
    if (!plano) {
      throw new Error('Plano não encontrado após atualização');
    }

    // Invalidar cache
    cache.deletePattern('planos:list:.*');
    
    return plano;
  }

  /**
   * Deletar plano
   */
  static async delete(id: string | number): Promise<Plano> {
    const plano = await Plano.findByPk(id);
    
    if (!plano) {
      throw new Error('Plano não encontrado');
    }
    
    const titulosCount = await plano.countTitulos();
    
    if (titulosCount > 0) {
      throw new Error(`Plano possui ${titulosCount} título(s) associado(s). Remova os títulos antes de excluir o plano.`);
    }
    
    const contratosCount = await plano.countClientes();
    
    if (contratosCount > 0) {
      throw new Error(`Plano possui ${contratosCount} contrato(s) de cliente(s) associado(s). Remova os contratos antes de excluir o plano.`);
    }
    
    await plano.destroy();
    
    // Invalidar cache
    cache.deletePattern('planos:list:.*');
    
    return plano;
  }

  /**
   * Atualizar status do plano
   */
  static async updateStatus(id: string | number, status: 'ativo' | 'inativo'): Promise<Plano> {
    const plano = await Plano.findByPk(id);
    
    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    await plano.update({ status });
    
    // Invalidar cache
    cache.deletePattern('planos:list:.*');
    
    return plano;
  }
}

