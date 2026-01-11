import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';
import { buildDateFilter, buildNumericSearchFilter, combineFilters } from '../../../utils/queryFilters';

export interface ListNotasFiscaisFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: string;
  cliente_id?: number;
  data_inicio?: string;
  data_fim?: string;
}

export interface ListNotasFiscaisResponse {
  success: boolean;
  data: NotaFiscal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
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
      data_fim
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
              sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = notas_fiscais.cliente_id AND (clientes.razao_social LIKE '${searchTerm.replace(/'/g, "''")}' OR clientes.nome_fantasia LIKE '${searchTerm.replace(/'/g, "''")}'))`) as any
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

    const { count, rows } = await NotaFiscal.findAndCountAll({
      where,
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: limitNumber,
      offset
    });

    return {
      success: true,
      data: rows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count,
        totalPages: Math.ceil(count / limitNumber)
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
          attributes: ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'cep']
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

    return {
      success: true,
      data: rows,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count,
        totalPages: Math.ceil(count / limitNumber)
      }
    };
  }
}

