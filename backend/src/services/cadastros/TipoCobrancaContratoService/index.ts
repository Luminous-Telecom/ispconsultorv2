import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { buildPagination } from '../../../utils/pagination';
import { sortDirection } from '../prismaWhere';

export interface ListTipoCobrancaContratoFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number | null;
}

const SORT_COLUMNS = ['id', 'nome', 'quantidade_titulos', 'periodicidade', 'ativo', 'created_at', 'updated_at', 'empresa_id'] as const;

export class TipoCobrancaContratoService {
  static async list(filters: ListTipoCobrancaContratoFilters) {
    const { search, searchField, ativo, page = 1, limit = 15, sortColumn, sortDirection: direction, empresa_id } = filters;
    const andConditions: Prisma.cadastros_tipos_cobranca_contratoWhereInput[] = [];

    if (empresa_id != null) {
      andConditions.push({ OR: [{ empresa_id }, { empresa_id: null }] });
    }

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.cadastros_tipos_cobranca_contratoWhereInput[] = [];

      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'quantidade_titulos') {
        orConditions = numExact !== null ? [{ quantidade_titulos: numExact }] : [{ quantidade_titulos: { lt: 0 } }];
      } else if (searchField === 'nome') {
        orConditions = [{ nome: { contains: search } }];
      } else {
        orConditions = [{ nome: { contains: search } }];
        if (numExact !== null) {
          orConditions.unshift({ id: numExact });
          orConditions.push({ quantidade_titulos: numExact });
        }
      }

      if (orConditions.length > 0) {
        andConditions.push({ OR: orConditions });
      }
    }

    if (ativo !== undefined && ativo !== '') {
      andConditions.push({ ativo: ativo === 'ativo' });
    }

    const where: Prisma.cadastros_tipos_cobranca_contratoWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const dir = sortDirection(direction);
    const orderBy: Prisma.cadastros_tipos_cobranca_contratoOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const [count, data] = await Promise.all([
      prisma.cadastros_tipos_cobranca_contrato.count({ where }),
      prisma.cadastros_tipos_cobranca_contrato.findMany({
        where,
        orderBy,
        take: limitNum,
        skip: offset,
      }),
    ]);

    return {
      success: true,
      data,
      pagination: buildPagination(pageNum, limitNum, count),
    };
  }

  static async getById(id: string | number) {
    return prisma.cadastros_tipos_cobranca_contrato.findUnique({
      where: { id: Number(id) },
    });
  }

  static async findAtivos(empresaId?: number | null) {
    const where: Prisma.cadastros_tipos_cobranca_contratoWhereInput =
      empresaId != null
        ? { ativo: true, OR: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
    return prisma.cadastros_tipos_cobranca_contrato.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
  }

  static async create(dados: Prisma.cadastros_tipos_cobranca_contratoUncheckedCreateInput) {
    return prisma.cadastros_tipos_cobranca_contrato.create({ data: dados });
  }

  static async update(id: string | number, dados: Prisma.cadastros_tipos_cobranca_contratoUncheckedUpdateInput) {
    const numericId = Number(id);
    const item = await prisma.cadastros_tipos_cobranca_contrato.findUnique({ where: { id: numericId } });
    if (!item) throw new Error('Tipo de cobrança não encontrado');
    return prisma.cadastros_tipos_cobranca_contrato.update({
      where: { id: numericId },
      data: dados,
    });
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const item = await prisma.cadastros_tipos_cobranca_contrato.findUnique({ where: { id: numericId } });
    if (!item) throw new Error('Tipo de cobrança não encontrado');
    await prisma.cadastros_tipos_cobranca_contrato.delete({ where: { id: numericId } });
    return item;
  }
}
