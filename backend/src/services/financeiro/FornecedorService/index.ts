import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { sortDirection } from '../../cadastros/prismaWhere';

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

const SORT_COLUMNS = [
  'id', 'tipo_pessoa', 'nome_razao_social', 'nome_fantasia', 'cpf_cnpj', 'cep', 'logradouro',
  'numero', 'complemento', 'bairro', 'cidade', 'estado', 'pais', 'created_at', 'updated_at', 'empresa_id',
] as const;

const TEXT_FIELDS = ['nome_razao_social', 'nome_fantasia', 'cpf_cnpj', 'cep', 'logradouro', 'bairro', 'cidade', 'estado', 'pais'] as const;

function shapeFornecedor<T extends { financeiro_contas_pagar?: unknown }>(row: T) {
  return { ...row, contasPagar: row.financeiro_contas_pagar ?? [] };
}

export class FornecedorService {
  static async list(filters: ListFornecedoresFilters) {
    const { page = 1, limit = 15, search = '', searchField, tipo_pessoa, sortColumn, sortDirection: direction, empresa_id } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const where: Prisma.financeiro_fornecedoresWhereInput = {};

    if (empresa_id !== undefined) where.empresa_id = empresa_id;

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      if (searchField === 'id') {
        where.id = numExact !== null ? numExact : { lt: 0 };
      } else if (searchField && (TEXT_FIELDS as readonly string[]).includes(searchField)) {
        (where as Record<string, unknown>)[searchField] = { contains: search };
      } else if (!searchField) {
        const orConditions: Prisma.financeiro_fornecedoresWhereInput[] = [
          { nome_razao_social: { contains: search } },
          { nome_fantasia: { contains: search } },
          { cpf_cnpj: { contains: search } },
        ];
        if (numExact !== null) orConditions.unshift({ id: numExact });
        where.OR = orConditions;
      }
    }

    if (tipo_pessoa) {
      where.tipo_pessoa = tipo_pessoa as Prisma.financeiro_fornecedoresWhereInput['tipo_pessoa'];
    }

    const dir = sortDirection(direction);
    const orderBy: Prisma.financeiro_fornecedoresOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };
    if (sortColumn && !(SORT_COLUMNS as readonly string[]).includes(sortColumn)) {
      logger.warn('FornecedorService.list - Coluna de ordenação inválida', { column: sortColumn });
    }

    const [count, fornecedores] = await Promise.all([
      prisma.financeiro_fornecedores.count({ where }),
      prisma.financeiro_fornecedores.findMany({
        where,
        include: {
          financeiro_contas_pagar: {
            select: { id: true, status: true, valor: true, valor_pago: true, data_vencimento: true },
          },
        },
        orderBy,
        take: limitNum,
        skip: offset,
      }),
    ]);

    return {
      success: true,
      data: fornecedores.map(shapeFornecedor),
      pagination: buildPagination(pageNum, limitNum, count),
    };
  }

  static async getById(id: string | number, includeAssociations = true) {
    if (!includeAssociations) {
      return prisma.financeiro_fornecedores.findUnique({ where: { id: Number(id) } });
    }
    const row = await prisma.financeiro_fornecedores.findUnique({
      where: { id: Number(id) },
      include: {
        financeiro_contas_pagar: {
          include: {
            financeiro_conta_pagar_pagamentos: { orderBy: { created_at: 'desc' }, take: 10 },
          },
        },
      },
    });
    if (!row) return null;
    const contas = row.financeiro_contas_pagar.map((conta) => ({
      ...conta,
      pagamentos: conta.financeiro_conta_pagar_pagamentos,
    }));
    return { ...row, financeiro_contas_pagar: contas, contasPagar: contas };
  }

  static async existsByCpfCnpj(cpfCnpj: string, excludeId?: number): Promise<boolean> {
    const fornecedor = await prisma.financeiro_fornecedores.findFirst({
      where: {
        cpf_cnpj: cpfCnpj,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!fornecedor;
  }

  static async create(dadosFornecedor: Prisma.financeiro_fornecedoresUncheckedCreateInput) {
    return prisma.financeiro_fornecedores.create({ data: dadosFornecedor });
  }

  static async update(id: string | number, dadosFornecedor: Prisma.financeiro_fornecedoresUncheckedUpdateInput) {
    const numericId = Number(id);
    const fornecedor = await prisma.financeiro_fornecedores.findUnique({ where: { id: numericId } });
    if (!fornecedor) throw new Error('Fornecedor não encontrado');
    await prisma.financeiro_fornecedores.update({ where: { id: numericId }, data: dadosFornecedor });
    const atualizado = await FornecedorService.getById(numericId);
    if (!atualizado) throw new Error('Fornecedor não encontrado');
    return atualizado;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const fornecedor = await prisma.financeiro_fornecedores.findUnique({ where: { id: numericId } });
    if (!fornecedor) throw new Error('Fornecedor não encontrado');
    await prisma.financeiro_fornecedores.delete({ where: { id: numericId } });
    return fornecedor;
  }
}
