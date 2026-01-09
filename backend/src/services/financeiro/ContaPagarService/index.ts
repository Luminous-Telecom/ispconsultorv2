import { ContaPagar } from '../../../models/financeiro/ContaPagar';
import { ContaPagarPagamento } from '../../../models/financeiro/ContaPagarPagamento';
import { Fornecedor } from '../../../models/financeiro/Fornecedor';
import { Op, WhereOptions, Transaction } from 'sequelize';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { buildDateFilter, buildNumericSearchFilter, buildDateSearchFilter, combineFilters } from '../../../utils/queryFilters';

export interface ListContasPagarFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: string;
  tipo_pagamento?: string;
  fornecedor_id?: string;
  data_inicio?: string;
  data_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListContasPagarResponse {
  success: boolean;
  data: ContaPagar[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class ContaPagarService {
  /**
   * Listar contas a pagar com filtros e paginação
   */
  static async list(filters: ListContasPagarFilters): Promise<ListContasPagarResponse> {
    const {
      page = 1,
      limit = 15,
      search,
      searchField,
      status,
      tipo_pagamento,
      fornecedor_id,
      data_inicio,
      data_fim,
      sortColumn,
      sortDirection
    } = filters;

    const offset = (page - 1) * limit;
    const whereConditions: Array<WhereOptions> = [];
    
    if (status) {
      whereConditions.push({ status });
    }

    if (tipo_pagamento) {
      whereConditions.push({ tipo_pagamento: tipo_pagamento });
    }

    if (fornecedor_id) {
      const fornecedorIdNum = parseInt(fornecedor_id, 10);
      if (!isNaN(fornecedorIdNum)) {
        whereConditions.push({ fornecedor_id: fornecedorIdNum });
      }
    }

    // Filtro de data usando helper
    const dateFilter = buildDateFilter(data_inicio, data_fim, 'data_vencimento');
    if (dateFilter) {
      whereConditions.push(dateFilter);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      switch (searchField) {
        case 'numero_documento':
          whereConditions.push({ numero_documento: { [Op.like]: `%${searchTerm}%` } });
          break;
        case 'nota_fiscal':
          whereConditions.push({ nota_fiscal: { [Op.like]: `%${searchTerm}%` } });
          break;
        case 'fornecedor':
          break;
        case 'vencimento':
          const dateSearchFilter = buildDateSearchFilter(searchTerm, 'data_vencimento');
          if (dateSearchFilter) {
            whereConditions.push(dateSearchFilter);
          }
          break;
        case 'valor':
          const numericFilter = buildNumericSearchFilter(searchTerm, 'valor', 0.1);
          if (numericFilter) {
            whereConditions.push(numericFilter);
          }
          break;
        case 'status':
          whereConditions.push({ status: { [Op.like]: `%${searchTerm.toUpperCase()}%` } });
          break;
        case 'tipo':
          whereConditions.push({ tipo_pagamento: { [Op.like]: `%${searchTerm.toUpperCase()}%` } });
          break;
        default:
          whereConditions.push({
            [Op.or]: [
              { numero_documento: { [Op.like]: `%${searchTerm}%` } },
              { nota_fiscal: { [Op.like]: `%${searchTerm}%` } }
            ]
          } as WhereOptions);
      }
    }

    // Combinar todos os filtros usando helper
    const where = combineFilters(...whereConditions) || {};

    // Configurar include - se buscar por fornecedor, precisa incluir a associação com where
    const shouldSearchFornecedor = Boolean(
      search && search.trim() && (searchField === 'fornecedor' || !searchField)
    );
    
    const fornecedorInclude: {
      association: string;
      required?: boolean;
      where?: WhereOptions;
    } = {
      association: 'fornecedor',
      required: shouldSearchFornecedor
    };
    
    if (shouldSearchFornecedor && search) {
      fornecedorInclude.where = {
        [Op.or]: [
          { nome_razao_social: { [Op.like]: `%${search.trim()}%` } },
          { nome_fantasia: { [Op.like]: `%${search.trim()}%` } }
        ]
      } as WhereOptions;
    }
    
    const includeOptions = [
      fornecedorInclude,
      { association: 'pagamentos', required: false, limit: 5, order: [['created_at', 'DESC']] as [string, string][] },
      { association: 'arquivos', required: false, limit: 5 }
    ];

    // Ordenação
    let order: [string, string][] = [['data_vencimento', 'ASC'], ['created_at', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const allowedColumns = [
        'id', 'numero_documento', 'nota_fiscal', 'data_vencimento', 'valor', 
        'valor_pago', 'status', 'tipo_pagamento', 'data_pagamento', 
        'created_at', 'descricao'
      ];
      if (allowedColumns.includes(sortColumn)) {
        const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        order = [[sortColumn, direction]];
      }
    }

    const count = shouldSearchFornecedor
      ? (await ContaPagar.findAll({
          where,
          include: [includeOptions[0]],
          order
        })).length
      : await ContaPagar.count({ where });

    const contasPagar = await ContaPagar.findAll({
      where,
      include: includeOptions,
      order,
      limit,
      offset
    });

    return {
      success: true,
      data: contasPagar,
      pagination: {
        current_page: page,
        per_page: limit,
        total: count,
        last_page: Math.ceil(count / limit),
        from: offset + 1,
        to: Math.min(offset + limit, count)
      }
    };
  }

  /**
   * Buscar conta a pagar por ID
   */
  static async getById(id: string | number, transaction?: Transaction): Promise<ContaPagar | null> {
    return await ContaPagar.findByPk(id, {
      include: [
        { association: 'fornecedor', required: false },
        { association: 'pagamentos', required: false, order: [['created_at', 'DESC']] },
        { association: 'arquivos', required: false }
      ],
      transaction
    });
  }

  /**
   * Criar conta a pagar
   */
  static async create(dadosContaPagar: Partial<ContaPagar>, transaction?: Transaction): Promise<ContaPagar> {
    return await ContaPagar.create(dadosContaPagar as any, { transaction });
  }

  /**
   * Atualizar conta a pagar
   */
  static async update(id: string | number, dadosContaPagar: Partial<ContaPagar>): Promise<ContaPagar> {
    const contaPagar = await ContaPagar.findByPk(id);
    
    if (!contaPagar) {
      throw new Error('Conta a pagar não encontrada');
    }
    
    await contaPagar.update(dadosContaPagar);
    await contaPagar.reload();
    
    return contaPagar;
  }

  /**
   * Deletar conta a pagar
   */
  static async delete(id: string | number): Promise<ContaPagar> {
    const contaPagar = await ContaPagar.findByPk(id);
    
    if (!contaPagar) {
      throw new Error('Conta a pagar não encontrada');
    }
    
    await contaPagar.destroy();
    
    return contaPagar;
  }

  /**
   * Criar pagamento de conta a pagar
   */
  static async createPagamento(
    dados: {
      conta_pagar_id: number;
      data: Date;
      valor: number;
      tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
      usuario_id?: number | null;
      observacao?: string | null;
    },
    transaction?: Transaction
  ): Promise<ContaPagarPagamento> {
    return await ContaPagarPagamento.create(dados, { transaction });
  }

  /**
   * Atualizar conta a pagar (método auxiliar para atualizar instância existente)
   */
  static async updateInstance(
    conta: ContaPagar,
    dados: Partial<ContaPagar>,
    transaction?: Transaction
  ): Promise<ContaPagar> {
    await conta.update(dados, { transaction });
    await conta.reload({ transaction });
    return conta;
  }

  /**
   * Buscar todas as contas a pagar com atributos específicos (para resumo/dashboard)
   */
  static async findAllWithAttributes(attributes: string[]): Promise<ContaPagar[]> {
    return await ContaPagar.findAll({
      attributes
    });
  }

  /**
   * Contar contas a pagar com filtros
   */
  static async count(where?: WhereOptions): Promise<number> {
    return await ContaPagar.count({ where });
  }
}

