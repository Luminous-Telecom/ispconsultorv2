import { Contrato } from '../../../models/contratos/Contrato';
import { Cliente } from '../../../models/clientes/Cliente';
import { Plano } from '../../../models/cadastros/Plano';
import { Banco } from '../../../models/cadastros/Banco';
import { TipoCobrancaContrato } from '../../../models/cadastros/TipoCobrancaContrato';
import { Op, WhereOptions, Transaction } from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { CONTRATO_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListContratosFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: string;
  isento_mensalidade?: boolean;
  plano_id?: number;
}

export interface ListContratosResponse {
  data: Contrato[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class ContratoService {
  /**
   * Normalizar data (evitar problemas de timezone)
   */
  private static normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    
    return null;
  }

  /**
   * Buscar IDs de clientes que têm contratos com critérios específicos
   * Usado para filtros em webhooks
   */
  static async getClienteIdsByContratoFilters(where: WhereOptions): Promise<number[]> {
    const contratos = await Contrato.findAll({
      attributes: ['cliente_id'],
      where,
      group: ['cliente_id'],
      raw: true
    });

    return contratos.map((c: { cliente_id: number }) => c.cliente_id);
  }

  /**
   * Listar contratos com filtros e paginação
   */
  static async list(filters: ListContratosFilters): Promise<ListContratosResponse> {
    const { page = 1, limit = 10, search = '', status, searchField, sortColumn, sortDirection, isento_mensalidade, plano_id } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: WhereOptions = {};
    
    if (search) {
      const searchString = typeof search === 'string' ? search : String(search);
      const searchPattern = `%${searchString}%`;
      const escapedSearch = searchString.replace(/'/g, "''");
      
      if (searchField && typeof searchField === 'string') {
        if (searchField === 'cliente') {
          (whereClause as Record<symbol, unknown>)[Op.or] = [
            sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = contratos.cliente_id AND clientes.razao_social LIKE '${escapedSearch}')`)
          ];
        } else if (searchField === 'plano') {
          (whereClause as Record<symbol, unknown>)[Op.or] = [
            sequelize.literal(`EXISTS (SELECT 1 FROM planos WHERE planos.id = contratos.plano_id AND planos.nome_plano LIKE '${escapedSearch}')`)
          ];
        } else {
          (whereClause as Record<symbol, unknown>)[Op.or] = [
            { [searchField]: { [Op.like]: searchPattern } }
          ];
        }
      } else {
        (whereClause as Record<symbol, unknown>)[Op.or] = [
          { id: { [Op.like]: searchPattern } },
          { status: { [Op.like]: searchPattern } },
          { valor_final: { [Op.like]: searchPattern } },
          sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = contratos.cliente_id AND clientes.razao_social LIKE '${escapedSearch}')`),
          sequelize.literal(`EXISTS (SELECT 1 FROM planos WHERE planos.id = contratos.plano_id AND planos.nome_plano LIKE '${escapedSearch}')`)
        ];
      }
    }

    if (status) {
      whereClause.status = status;
    }

    if (isento_mensalidade !== undefined && isento_mensalidade !== null) {
      whereClause.isento_mensalidade = isento_mensalidade;
    }

    if (plano_id) {
      whereClause.plano_id = plano_id;
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        CONTRATO_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('ContratoService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    let count: number;
    let rows: Contrato[];
    try {
      const result = await Contrato.findAndCountAll({
        where: whereClause,
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plano, as: 'plano' },
        { model: Banco, as: 'bancoBoleto' },
        { model: TipoCobrancaContrato, as: 'tipoCobrancaContrato', required: false }
      ],
      order,
      limit: limitNum,
      offset
      });
      count = result.count as number;
      rows = result.rows;
    } catch (queryError: any) {
      logger.error('ContratoService.list - Erro na query', {
        error: queryError.message,
        errorName: queryError.name,
        sql: queryError.sql,
        stack: queryError.stack,
        sortColumn,
        sortDirection,
        where: JSON.stringify(whereClause).substring(0, 300),
        order: JSON.stringify(order).substring(0, 300)
      });
      throw queryError;
    }

    const totalPages = Math.ceil(count / limitNum);
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      data: rows,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: count,
        last_page: totalPages,
        from,
        to
      }
    };
  }

  /**
   * Buscar contrato por ID
   */
  static async getById(id: string | number): Promise<Contrato | null> {
    return await Contrato.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plano, as: 'plano' },
        { model: Banco, as: 'bancoBoleto' },
        { model: TipoCobrancaContrato, as: 'tipoCobrancaContrato', required: false }
      ]
    });
  }

  /**
   * Buscar contrato ativo por cliente
   */
  static async findAtivoByCliente(clienteId: number): Promise<Contrato | null> {
    return await Contrato.findOne({
      where: { cliente_id: clienteId, status: 'ativo' },
      order: [['id', 'DESC']],
      include: [
        { model: Cliente, as: 'cliente' },
        { model: Plano, as: 'plano' },
        { model: Banco, as: 'bancoBoleto' },
        { model: TipoCobrancaContrato, as: 'tipoCobrancaContrato', required: false }
      ]
    });
  }

  /**
   * Criar contrato
   */
  static async create(dadosContrato: Partial<Contrato>, transaction?: Transaction): Promise<Contrato> {
    // Normalizar datas
    if (dadosContrato.data_inicio) {
      dadosContrato.data_inicio = this.normalizeDate(dadosContrato.data_inicio as string | Date) as Date | null;
    }
    if (dadosContrato.data_fim) {
      dadosContrato.data_fim = this.normalizeDate(dadosContrato.data_fim as string | Date) as Date | null;
    }
    if (dadosContrato.data_validade_desconto) {
      dadosContrato.data_validade_desconto = this.normalizeDate(dadosContrato.data_validade_desconto as string | Date) as Date | null;
    }

    return await Contrato.create(dadosContrato as any, { transaction });
  }

  /**
   * Atualizar contrato
   */
  static async update(id: string | number, dadosContrato: Partial<Contrato>, transaction?: Transaction): Promise<Contrato> {
    const contrato = await Contrato.findByPk(id, { transaction });
    
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }

    // Normalizar datas
    if (dadosContrato.data_inicio !== undefined) {
      dadosContrato.data_inicio = this.normalizeDate(dadosContrato.data_inicio as string | Date) as Date | null;
    }
    if (dadosContrato.data_fim !== undefined) {
      dadosContrato.data_fim = this.normalizeDate(dadosContrato.data_fim as string | Date) as Date | null;
    }
    if (dadosContrato.data_validade_desconto !== undefined) {
      dadosContrato.data_validade_desconto = this.normalizeDate(dadosContrato.data_validade_desconto as string | Date) as Date | null;
    }

    await contrato.update(dadosContrato, { transaction });
    await contrato.reload({ transaction });
    
    return contrato;
  }

  /**
   * Deletar contrato
   */
  static async delete(id: string | number, transaction?: Transaction): Promise<Contrato> {
    const contrato = await Contrato.findByPk(id, { transaction });
    
    if (!contrato) {
      throw new Error('Contrato não encontrado');
    }
    
    await contrato.destroy({ transaction });
    
    return contrato;
  }
}

