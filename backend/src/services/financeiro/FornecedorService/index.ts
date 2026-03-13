import { Fornecedor } from '../../../models/financeiro/Fornecedor';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { FORNECEDOR_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListFornecedoresFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  tipo_pessoa?: string;
  ativo?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

export interface ListFornecedoresResponse {
  success: boolean;
  data: Fornecedor[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class FornecedorService {
  /**
   * Listar fornecedores com filtros e paginação
   */
  static async list(filters: ListFornecedoresFilters): Promise<ListFornecedoresResponse> {
    const { page = 1, limit = 15, search = '', searchField, tipo_pessoa, ativo, sortColumn, sortDirection, empresa_id } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;

    const where: WhereOptions = {};

    if (empresa_id !== undefined) {
      where.empresa_id = empresa_id;
    }
    
    if (search) {
      const searchPattern = `%${search}%`;
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      if (searchField === 'id') {
        where.id = numExact !== null ? numExact : { [Op.lt]: 0 };
      } else if (searchField) {
        const allowedFields = ['nome_razao_social', 'nome_fantasia', 'cpf_cnpj', 'cep', 'logradouro', 'bairro', 'cidade', 'estado', 'pais'];
        if (allowedFields.includes(searchField)) {
          where[searchField as keyof typeof where] = { [Op.like]: searchPattern };
        }
      } else {
        const orConditions: any[] = [
          { nome_razao_social: { [Op.like]: searchPattern } },
          { nome_fantasia: { [Op.like]: searchPattern } },
          { cpf_cnpj: { [Op.like]: searchPattern } }
        ];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact });
        }
        (where as Record<symbol, unknown>)[Op.or] = orConditions;
      }
    }

    if (tipo_pessoa) {
      where.tipo_pessoa = tipo_pessoa;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        FORNECEDOR_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('FornecedorService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    const count = await Fornecedor.count({ where });
    
    const fornecedores = await Fornecedor.findAll({
      where,
      include: [
        {
          association: 'contasPagar',
          required: false,
          attributes: ['id', 'status', 'valor', 'valor_pago', 'data_vencimento']
        }
      ],
      order,
      limit: limitNum,
      offset
    });

    const totalPages = Math.ceil(count / limitNum);

    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNum, count) : 0;

    return {
      success: true,
      data: fornecedores,
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
   * Buscar fornecedor por ID
   */
  static async getById(id: string | number, includeAssociations = true): Promise<Fornecedor | null> {
    if (includeAssociations) {
      return await Fornecedor.findByPk(id, {
        include: [
          {
            association: 'contasPagar',
            required: false,
            include: [
              { association: 'pagamentos', required: false, limit: 10, order: [['created_at', 'DESC']] }
            ]
          }
        ]
      });
    }
    return await Fornecedor.findByPk(id);
  }

  /**
   * Verificar se existe fornecedor com CPF/CNPJ
   */
  static async existsByCpfCnpj(cpfCnpj: string, excludeId?: number): Promise<boolean> {
    const where: WhereOptions = { cpf_cnpj: cpfCnpj };
    
    if (excludeId) {
      where.id = { [Op.ne]: excludeId } as unknown as number;
    }
    
    const fornecedor = await Fornecedor.findOne({ where });
    return !!fornecedor;
  }

  /**
   * Criar fornecedor
   */
  static async create(dadosFornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    return await Fornecedor.create(dadosFornecedor as any);
  }

  /**
   * Atualizar fornecedor
   */
  static async update(id: string | number, dadosFornecedor: Partial<Fornecedor>): Promise<Fornecedor> {
    const fornecedor = await Fornecedor.findByPk(id);
    
    if (!fornecedor) {
      throw new Error('Fornecedor não encontrado');
    }
    
    await fornecedor.update(dadosFornecedor);
    await fornecedor.reload();
    
    return fornecedor;
  }

  /**
   * Deletar fornecedor
   */
  static async delete(id: string | number): Promise<Fornecedor> {
    const fornecedor = await Fornecedor.findByPk(id);
    
    if (!fornecedor) {
      throw new Error('Fornecedor não encontrado');
    }
    
    await fornecedor.destroy();
    
    return fornecedor;
  }
}

