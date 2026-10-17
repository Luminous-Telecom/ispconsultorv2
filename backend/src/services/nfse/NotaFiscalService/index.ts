import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { buildDateFilter, buildNumericSearchFilter, combineFilters } from '../../../utils/queryFilters';
import { buildListPagination } from '../../../utils/pagination';
import { logger } from '../../../utils/logger';

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
  empresa_id?: number | null;
}

const clienteSelect = {
  id: true,
  razao_social: true,
  nome_fantasia: true,
  cnpj: true,
} satisfies Prisma.clientesSelect;

const notaListInclude = {
  clientes: { select: clienteSelect },
} satisfies Prisma.nfse_notas_fiscaisInclude;

type NotaListItem = Prisma.nfse_notas_fiscaisGetPayload<{ include: typeof notaListInclude }>;

export interface ListNotasFiscaisResponse {
  success: boolean;
  data: NotaListItem[] | Prisma.nfse_notas_fiscaisGetPayload<object>[];
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

const SORT_COLUMNS = new Set([
  'id',
  'numero',
  'status',
  'data_emissao',
  'valor_total',
  'created_at',
  'chave_acesso',
  'protocolo',
  'nfse_status',
  'titulo_id',
]);

function orderByNota(
  sortColumn?: string,
  sortDirection?: string
): Prisma.nfse_notas_fiscaisOrderByWithRelationInput[] {
  const direction = sortDirection?.toUpperCase() === 'ASC' ? 'asc' : 'desc';
  if (sortColumn === 'cliente') {
    return [{ clientes: { razao_social: direction } }];
  }
  if (sortColumn && SORT_COLUMNS.has(sortColumn)) {
    return [{ [sortColumn]: direction }];
  }
  if (sortColumn) {
    logger.warn('NotaFiscalService.list - Coluna de ordenação inválida', { column: sortColumn });
  }
  return [{ id: 'desc' }];
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
      sortDirection,
      empresa_id,
    } = filters;

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 15);
    const offset = (pageNumber - 1) * limitNumber;

    const whereConditions: Array<Prisma.nfse_notas_fiscaisWhereInput | null> = [];

    if (empresa_id !== undefined && empresa_id !== null) {
      whereConditions.push({ empresa_id });
    }
    if (status) {
      whereConditions.push({ status: status as Prisma.nfse_notas_fiscaisWhereInput['status'] });
    }
    if (cliente_id) {
      whereConditions.push({ cliente_id });
    }
    whereConditions.push(buildDateFilter(data_inicio, data_fim, 'data_emissao'));

    let clienteWhere: Prisma.clientesWhereInput | undefined;

    if (search) {
      const searchTerm = (search as string).trim();
      const isNumericSearch = !isNaN(Number(searchTerm));
      const termNum = parseInt(searchTerm, 10);
      const orConditions: Prisma.nfse_notas_fiscaisWhereInput[] = [];

      if (searchField && typeof searchField === 'string') {
        switch (searchField) {
          case 'id':
            if (isNumericSearch) orConditions.push({ id: termNum });
            else whereConditions.push({ id: -1 });
            break;
          case 'numero':
            orConditions.push({ numero: { contains: searchTerm } });
            break;
          case 'chave_acesso':
            orConditions.push({ chave_acesso: { contains: searchTerm } });
            break;
          case 'protocolo':
            orConditions.push({ protocolo: { contains: searchTerm } });
            break;
          case 'valor':
            if (isNumericSearch) {
              const numericFilter = buildNumericSearchFilter(searchTerm, 'valor_total', 0.1);
              if (numericFilter) orConditions.push(numericFilter);
            } else {
              whereConditions.push({ id: -1 });
            }
            break;
          case 'status':
            orConditions.push({ status: { contains: searchTerm } } as Prisma.nfse_notas_fiscaisWhereInput);
            break;
          case 'nfse_status':
            orConditions.push({ nfse_status: { contains: searchTerm } } as Prisma.nfse_notas_fiscaisWhereInput);
            break;
          case 'titulo_id':
            if (isNumericSearch) orConditions.push({ titulo_id: termNum });
            else whereConditions.push({ id: -1 });
            break;
          case 'cliente':
            clienteWhere = {
              OR: [
                { razao_social: { contains: searchTerm } },
                { nome_fantasia: { contains: searchTerm } },
              ],
            };
            break;
          default:
            orConditions.push(
              { numero: { contains: searchTerm } },
              { chave_acesso: { contains: searchTerm } },
              { protocolo: { contains: searchTerm } }
            );
            break;
        }
      } else {
        orConditions.push(
          { numero: { contains: searchTerm } },
          { chave_acesso: { contains: searchTerm } },
          { protocolo: { contains: searchTerm } }
        );
        if (isNumericSearch) {
          orConditions.push({ id: termNum }, { titulo_id: termNum });
        }
      }

      if (orConditions.length > 0) {
        whereConditions.push({ OR: orConditions });
      }
      if (clienteWhere) {
        whereConditions.push({ clientes: { is: clienteWhere } });
      }
    }

    const where = (combineFilters(...whereConditions) || {}) as Prisma.nfse_notas_fiscaisWhereInput;
    const orderBy = orderByNota(sortColumn, sortDirection);
    const include: Prisma.nfse_notas_fiscaisInclude = {
      clientes: { select: clienteSearchIncludeSelect() },
    };

    try {
      const [count, rows] = await Promise.all([
        prisma.nfse_notas_fiscais.count({ where }),
        prisma.nfse_notas_fiscais.findMany({
          where,
          include,
          orderBy,
          take: limitNumber,
          skip: offset,
        }),
      ]);

      return {
        success: true,
        data: rows,
        pagination: buildListPagination(pageNumber, limitNumber, count),
      };
    } catch (queryError: unknown) {
      const message = queryError instanceof Error ? queryError.message : String(queryError);
      logger.error('NotaFiscalService.list - Erro na query', {
        error: message,
        where: JSON.stringify(where).substring(0, 200),
        order: JSON.stringify(orderBy),
      });
      throw queryError;
    }
  }

  /**
   * Buscar nota fiscal por ID
   */
  static async getById(id: string | number) {
    return prisma.nfse_notas_fiscais.findUnique({
      where: { id: Number(id) },
      include: {
        clientes: {
          select: {
            id: true,
            empresa_id: true,
            razao_social: true,
            nome_fantasia: true,
            cnpj: true,
            email: true,
            telefone: true,
            endereco: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            estado: true,
            cep: true,
          },
        },
      },
    });
  }

  /**
   * Buscar notas fiscais por cliente com paginação (filtra por empresa_id quando informado)
   */
  static async findByCliente(
    cliente_id: number,
    page = 1,
    limit = 15,
    empresaId?: number | null
  ): Promise<ListNotasFiscaisResponse> {
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 15);
    const offset = (pageNumber - 1) * limitNumber;

    const where: Prisma.nfse_notas_fiscaisWhereInput = { cliente_id };
    if (empresaId !== undefined && empresaId !== null) {
      where.empresa_id = empresaId;
    }

    const [count, rows] = await Promise.all([
      prisma.nfse_notas_fiscais.count({ where }),
      prisma.nfse_notas_fiscais.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limitNumber,
        skip: offset,
      }),
    ]);

    return {
      success: true,
      data: rows,
      pagination: buildListPagination(pageNumber, limitNumber, count),
    };
  }
}

function clienteSearchIncludeSelect() {
  return {
    id: true,
    razao_social: true,
    nome_fantasia: true,
    cnpj: true,
  };
}
