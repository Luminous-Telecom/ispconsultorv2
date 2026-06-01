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
import { buildPagination } from '../../../utils/pagination';

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
  tipo_servico?: string;
  /** Contratos ativos com pelo menos um título não pago e vencido (vencimento antes de hoje) */
  em_atraso?: boolean;
  /**
   * Quando true (e sem `em_atraso`), exclui contratos que tenham título pendente/vencido não pago com vencimento antes de hoje.
   * Usado para alinhar a fatia "Ativos" do dashboard com a listagem (ativos sem sobrepor "em atraso").
   */
  excluir_em_atraso?: boolean;
  empresa_id?: number;
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
  /** Includes padrão do contrato — deve ser o mesmo em getById e após update/reload para auditoria/toJSON coerentes */
  private static getDefaultIncludes() {
    return [
      { model: Cliente, as: 'cliente' },
      { model: Plano, as: 'plano' },
      { model: Banco, as: 'bancoBoleto' },
      { model: TipoCobrancaContrato, as: 'tipoCobrancaContrato', required: false },
    ];
  }

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
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      searchField,
      sortColumn,
      sortDirection,
      isento_mensalidade,
      plano_id,
      tipo_servico,
      em_atraso,
      excluir_em_atraso,
      empresa_id,
    } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const whereClause: WhereOptions = {};

    if (empresa_id !== undefined) {
      whereClause.empresa_id = empresa_id;
    }
    
    if (search) {
      const searchString = typeof search === 'string' ? search : String(search);
      const searchPattern = `%${searchString}%`;
      const escapedSearch = searchString.replace(/'/g, "''");
      const escapedPattern = `%${escapedSearch}%`;
      
      if (searchField && typeof searchField === 'string') {
        if (searchField === 'cliente' || searchField === 'cliente_razao_social') {
          const clienteIdNum = /^\d+$/.test(searchString) ? parseInt(searchString, 10) : null;
          const conditions: any[] = [
            sequelize.literal(`EXISTS (SELECT 1 FROM adm_clientes_clientes WHERE adm_clientes_clientes.id = Contrato.cliente_id AND (adm_clientes_clientes.razao_social LIKE '${escapedPattern}' OR adm_clientes_clientes.nome_fantasia LIKE '${escapedPattern}'))`)
          ];
          if (clienteIdNum !== null) {
            conditions.push(sequelize.literal(`Contrato.cliente_id = ${clienteIdNum}`));
          }
          (whereClause as Record<symbol, unknown>)[Op.or] = conditions;
        } else if (searchField === 'plano' || searchField === 'plano_nome') {
          const planoIdNum = /^\d+$/.test(searchString) ? parseInt(searchString, 10) : null;
          const conditions: any[] = [
            sequelize.literal(`EXISTS (SELECT 1 FROM adm_cadastros_planos WHERE adm_cadastros_planos.id = Contrato.plano_id AND adm_cadastros_planos.nome_plano LIKE '${escapedPattern}')`)
          ];
          if (planoIdNum !== null) {
            conditions.push(sequelize.literal(`Contrato.plano_id = ${planoIdNum}`));
          }
          (whereClause as Record<symbol, unknown>)[Op.or] = conditions;
        } else {
          const dbField = searchField === 'valor_final_num' ? 'valor_final' : searchField;
          const numExactField = /^\d+$/.test(searchString) ? parseInt(searchString, 10) : null;
          // cliente_id/plano_id com LIKE quebrava o filtro (ex.: cliente 1 retornava 10, 11, 21…)
          const isNumericField =
            dbField === 'valor_final' ||
            dbField === 'id' ||
            dbField === 'cliente_id' ||
            dbField === 'plano_id';
          const fieldCondition = (isNumericField && numExactField !== null)
            ? { [dbField]: numExactField }
            : { [dbField]: { [Op.like]: searchPattern } };
          (whereClause as Record<symbol, unknown>)[Op.or] = [fieldCondition];
        }
      } else {
        const numExact = /^\d+$/.test(searchString) ? parseInt(searchString, 10) : null;
        const conditions: any[] = [
          { status: { [Op.like]: searchPattern } },
          sequelize.literal(`EXISTS (SELECT 1 FROM adm_clientes_clientes WHERE adm_clientes_clientes.id = Contrato.cliente_id AND (adm_clientes_clientes.razao_social LIKE '${escapedPattern}' OR adm_clientes_clientes.nome_fantasia LIKE '${escapedPattern}'))`),
          sequelize.literal(`EXISTS (SELECT 1 FROM adm_cadastros_planos WHERE adm_cadastros_planos.id = Contrato.plano_id AND adm_cadastros_planos.nome_plano LIKE '${escapedPattern}')`)
        ];
        if (numExact !== null) {
          conditions.unshift({ id: numExact });
          conditions.push({ cliente_id: numExact }, { plano_id: numExact }, { valor_final: numExact });
        } else {
          conditions.unshift({ id: { [Op.like]: searchPattern } });
        }
        (whereClause as Record<symbol, unknown>)[Op.or] = conditions;
      }
    }

    if (em_atraso) {
      whereClause.status = 'ativo';
      const emAtrasoLiteral = sequelize.literal(`EXISTS (
        SELECT 1 FROM adm_financeiro_titulos t
        WHERE t.contrato_id = \`Contrato\`.\`id\`
        AND t.pago = 0
        AND t.status IN ('pendente', 'vencido')
        AND DATE(t.data_vencimento) < CURDATE()
      )`);
      const wc = whereClause as Record<symbol, unknown>;
      const prevAnd = wc[Op.and];
      wc[Op.and] = Array.isArray(prevAnd)
        ? [...prevAnd, emAtrasoLiteral]
        : prevAnd != null
          ? [prevAnd, emAtrasoLiteral]
          : [emAtrasoLiteral];
    } else if (status) {
      whereClause.status = status;
    }

    if (excluir_em_atraso && !em_atraso) {
      const semAtrasoLiteral = sequelize.literal(`NOT EXISTS (
        SELECT 1 FROM adm_financeiro_titulos t
        WHERE t.contrato_id = \`Contrato\`.\`id\`
        AND t.pago = 0
        AND t.status IN ('pendente', 'vencido')
        AND DATE(t.data_vencimento) < CURDATE()
      )`);
      const wc2 = whereClause as Record<symbol, unknown>;
      const prevAnd2 = wc2[Op.and];
      wc2[Op.and] = Array.isArray(prevAnd2)
        ? [...prevAnd2, semAtrasoLiteral]
        : prevAnd2 != null
          ? [prevAnd2, semAtrasoLiteral]
          : [semAtrasoLiteral];
    }

    if (isento_mensalidade !== undefined && isento_mensalidade !== null) {
      whereClause.isento_mensalidade = isento_mensalidade;
    }

    if (plano_id) {
      whereClause.plano_id = plano_id;
    }

    if (tipo_servico) {
      const escaped = String(tipo_servico).replace(/'/g, "''");
      const subquery = `(
        SELECT c.id FROM adm_contratos_contratos c
        WHERE EXISTS (SELECT 1 FROM adm_cadastros_planos p WHERE p.id = c.plano_id AND p.tipo_servico = '${escaped}')
        OR EXISTS (
          SELECT 1 FROM adm_contratos_contrato_planos_adicionais cpa
          INNER JOIN adm_cadastros_planos p ON cpa.plano_id = p.id
          WHERE cpa.contrato_id = c.id AND cpa.status = 'ativo' AND p.tipo_servico = '${escaped}'
        )
      )`;
      (whereClause as any).id = { [Op.in]: sequelize.literal(subquery) };
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
      logger.error('[ContratoService.list] Erro na query', {
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

    return {
      data: rows,
      pagination: buildPagination(pageNum, limitNum, count),
    };
  }

  /**
   * Buscar contrato por ID
   */
  static async getById(id: string | number): Promise<Contrato | null> {
    return await Contrato.findByPk(id, {
      include: ContratoService.getDefaultIncludes(),
    });
  }

  /**
   * Buscar contrato ativo por cliente
   */
  static async findAtivoByCliente(clienteId: number): Promise<Contrato | null> {
    return await Contrato.findOne({
      where: { cliente_id: clienteId, status: 'ativo' },
      order: [['id', 'DESC']],
      include: ContratoService.getDefaultIncludes(),
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
    await contrato.reload({
      transaction,
      include: ContratoService.getDefaultIncludes(),
    });

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

