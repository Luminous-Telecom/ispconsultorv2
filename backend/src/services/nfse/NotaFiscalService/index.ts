import { NotaFiscal } from '../../../models/nfse/NotaFiscal';
import { Cliente } from '../../../models/clientes/Cliente';
import { Op, WhereOptions } from 'sequelize';
import { sequelize } from '../../../config/database';

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

    const where: any = {};

    if (search) {
      const searchTerm = (search as string).trim();
      const isNumericSearch = !isNaN(Number(searchTerm));
      const termNum = parseInt(searchTerm, 10);
      const likePattern = `%${searchTerm}%`;

      if (searchField && typeof searchField === 'string') {
        switch (searchField) {
          case 'id':
            if (isNumericSearch) {
              where.id = termNum;
            } else {
              where.id = { [Op.eq]: -1 };
            }
            break;
          case 'numero':
            where.numero = { [Op.like]: likePattern };
            break;
          case 'chave_acesso':
            where.chave_acesso = { [Op.like]: likePattern };
            break;
          case 'protocolo':
            where.protocolo = { [Op.like]: likePattern };
            break;
          case 'valor':
            if (isNumericSearch) {
              where.valor_total = {
                [Op.between]: [termNum * 0.9, termNum * 1.1]
              };
            } else {
              where.id = { [Op.eq]: -1 };
            }
            break;
          case 'status':
            where.status = { [Op.like]: likePattern };
            break;
          case 'nfse_status':
            where.nfse_status = { [Op.like]: likePattern };
            break;
          case 'titulo_id':
            if (isNumericSearch) {
              where.titulo_id = termNum;
            } else {
              where.id = { [Op.eq]: -1 };
            }
            break;
          case 'cliente':
            where[Op.or] = [
              sequelize.literal(`EXISTS (SELECT 1 FROM clientes WHERE clientes.id = notas_fiscais.cliente_id AND (clientes.razao_social LIKE '${searchTerm.replace(/'/g, "''")}' OR clientes.nome_fantasia LIKE '${searchTerm.replace(/'/g, "''")}'))`)
            ];
            break;
          default:
            where[Op.or] = [
              { numero: { [Op.like]: likePattern } },
              { chave_acesso: { [Op.like]: likePattern } },
              { protocolo: { [Op.like]: likePattern } }
            ];
        }
      } else {
        const orConditions: any[] = [
          { numero: { [Op.like]: likePattern } },
          { chave_acesso: { [Op.like]: likePattern } },
          { protocolo: { [Op.like]: likePattern } }
        ];
        
        if (isNumericSearch) {
          orConditions.push({ id: termNum });
          orConditions.push({ titulo_id: termNum });
        }
        
        where[Op.or] = orConditions;
      }
    }

    if (status) {
      where.status = status;
    }

    if (cliente_id) {
      where.cliente_id = cliente_id;
    }

    if (data_inicio || data_fim) {
      where.data_emissao = {};
      if (data_inicio) {
        where.data_emissao[Op.gte] = new Date(data_inicio as string);
      }
      if (data_fim) {
        where.data_emissao[Op.lte] = new Date(data_fim as string);
      }
    }

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
  static async findByCliente(cliente_id: number, page: number = 1, limit: number = 15): Promise<ListNotasFiscaisResponse> {
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

