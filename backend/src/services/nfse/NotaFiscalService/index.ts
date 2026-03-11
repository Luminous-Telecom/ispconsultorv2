import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import { buildDateFilter, buildNumericSearchFilter, combineFilters } from '../../../utils/queryFilters';
import { logger } from '../../../utils/logger';
import { SortHelper } from '../../../utils/sortHelper';
import { NOTA_FISCAL_SORT_CONFIG } from '../../../config/sortConfigs';

export interface ListNotasFiscaisFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: string;
  cliente_id?: number;
  data_inicio?: string;
  data_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
}

export interface ListNotasFiscaisResponse {
  success: boolean;
  data: NotaFiscal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    current_page: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export class NotaFiscalService {
  /**
   * Listar notas fiscais com filtros e paginação
   */
  static async list(filters: ListNotasFiscaisFilters): Promise<ListNotasFiscaisResponse> {
    const {
      page = 1,
      limit = 15,
      search = '',
      searchField,
      status,
      cliente_id,
      data_inicio,
      data_fim,
      sortColumn,
      sortDirection
    } = filters;

    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);
    const offset = (pageNumber - 1) * limitNumber;

    // Construir filtros usando helpers
    const whereConditions: (WhereOptions | null)[] = [];

    // Filtro de status
    if (status) {
      whereConditions.push({ status } as WhereOptions);
    }

    // Filtro de cliente
    if (cliente_id) {
      whereConditions.push({ cliente_id } as WhereOptions);
    }

    // Filtro de data usando helper
    whereConditions.push(buildDateFilter(data_inicio, data_fim, 'data_emissao'));

    // Filtro de busca
    if (search) {
      const searchTerm = (search as string).trim();
      const isNumericSearch = !isNaN(Number(searchTerm));
      const termNum = parseInt(searchTerm, 10);
      const likePattern = `%${searchTerm}%`;
      const orConditions: WhereOptions[] = [];

      if (searchField && typeof searchField === 'string') {
        switch (searchField) {
          case 'id':
            if (isNumericSearch) {
              orConditions.push({ id: termNum } as WhereOptions);
            } else {
              whereConditions.push({ id: { [Op.eq]: -1 } } as WhereOptions);
            }
            break;
          case 'numero':
            orConditions.push({ numero: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'chave_acesso':
            orConditions.push({ chave_acesso: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'protocolo':
            orConditions.push({ protocolo: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'valor':
            if (isNumericSearch) {
              const numericFilter = buildNumericSearchFilter(searchTerm, 'valor_total', 0.1);
              if (numericFilter) orConditions.push(numericFilter);
            } else {
              whereConditions.push({ id: { [Op.eq]: -1 } } as WhereOptions);
            }
            break;
          case 'status':
            orConditions.push({ status: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'nfse_status':
            orConditions.push({ nfse_status: { [Op.like]: likePattern } } as WhereOptions);
            break;
          case 'titulo_id':
            if (isNumericSearch) {
              orConditions.push({ titulo_id: termNum } as WhereOptions);
            } else {
              whereConditions.push({ id: { [Op.eq]: -1 } } as WhereOptions);
            }
            break;
          case 'cliente':
            orConditions.push(
              sequelize.literal(`EXISTS (SELECT 1 FROM adm_clientes WHERE adm_clientes.id = adm_notas_fiscais.cliente_id AND (adm_clientes.razao_social LIKE '${searchTerm.replace(/'/g, "''")}' OR adm_clientes.nome_fantasia LIKE '${searchTerm.replace(/'/g, "''")}'))`) as any
            );
            break;
          default:
            orConditions.push(
              { numero: { [Op.like]: likePattern } } as WhereOptions,
              { chave_acesso: { [Op.like]: likePattern } } as WhereOptions,
              { protocolo: { [Op.like]: likePattern } } as WhereOptions
            );
            break;
        }
      } else {
        // Busca genérica
        orConditions.push(
          { numero: { [Op.like]: likePattern } } as WhereOptions,
          { chave_acesso: { [Op.like]: likePattern } } as WhereOptions,
          { protocolo: { [Op.like]: likePattern } } as WhereOptions
        );
        if (isNumericSearch) {
          orConditions.push({ id: termNum } as WhereOptions, { titulo_id: termNum } as WhereOptions);
        }
      }

      if (orConditions.length > 0) {
        whereConditions.push({ [Op.or]: orConditions } as WhereOptions);
      }
    }

    // Combinar todos os filtros
    const where = combineFilters(...whereConditions) || {};

    // Construir ordenação - ordena TODOS os dados antes da paginação
    let order: any[] = [['id', 'DESC']]; // Padrão
    if (sortColumn && sortDirection) {
      const sortResult = SortHelper.buildOrder(
        NOTA_FISCAL_SORT_CONFIG,
        sortColumn,
        sortDirection.toUpperCase() as 'ASC' | 'DESC'
      );

      if (sortResult.isValid) {
        order = sortResult.order;
      } else {
        logger.warn('NotaFiscalService.list - Coluna de ordenação inválida', {
          column: sortColumn,
          error: sortResult.error
        });
        // Manter ordenação padrão se coluna inválida
      }
    }

    let count: number;
    let rows: any[];
    try {
      const result = await NotaFiscal.findAndCountAll({
        where,
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
          }
        ],
        order,
        limit: limitNumber,
        offset
      });
      count = result.count as number;
      rows = result.rows;
    } catch (queryError: any) {
      logger.error('NotaFiscalService.list - Erro na query', {
        error: queryError.message,
        stack: queryError.stack,
        where: JSON.stringify(where).substring(0, 200),
        order: JSON.stringify(order).substring(0, 200)
      });
      throw queryError;
    }

    const totalPages = Math.ceil(count / limitNumber);
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNumber, count) : 0;

    return {
      success: true,
      data: rows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count,
        totalPages,
        current_page: pageNumber,
        per_page: limitNumber,
        last_page: totalPages,
        from,
        to
      }
    };
  }

  /**
   * Buscar nota fiscal por ID
   */
  static async getById(id: string | number): Promise<NotaFiscal | null> {
    return await NotaFiscal.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'empresa_id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep']
        }
      ]
    });
  }

  /**
   * Buscar notas fiscais por cliente com paginação
   */
  static async findByCliente(cliente_id: number, page = 1, limit = 15): Promise<ListNotasFiscaisResponse> {
    const pageNumber = parseInt(String(page), 10);
    const limitNumber = parseInt(String(limit), 10);
    const offset = (pageNumber - 1) * limitNumber;

    const { count, rows } = await NotaFiscal.findAndCountAll({
      where: { cliente_id },
      order: [['created_at', 'DESC']],
      limit: limitNumber,
      offset
    });

    const totalPages = Math.ceil(count / limitNumber);
    const from = count > 0 ? offset + 1 : 0;
    const to = count > 0 ? Math.min(offset + limitNumber, count) : 0;

    return {
      success: true,
      data: rows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count,
        totalPages,
        current_page: pageNumber,
        per_page: limitNumber,
        last_page: totalPages,
        from,
        to
      }
    };
  }
}

