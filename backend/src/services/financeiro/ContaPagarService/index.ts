import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { dateBounds, enumMatches, numericBounds, orderPageBySql, reorderByIds, sortDirection, sqlDirection } from '../../cadastros/prismaWhere';

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
  empresa_id?: number;
}

const STATUS_VALUES = ['A_PAGAR', 'PAGO', 'PARCIAL', 'CANCELADO'] as const;
const TIPO_PAGAMENTO = ['DINHEIRO', 'BOLETO', 'CARTAO', 'DEPOSITO', 'DEBITO_CONTA', 'TRANSFERENCIA', 'PIX'] as const;
const SORT_COLUMNS = [
  'id', 'fornecedor_id', 'data_vencimento', 'valor', 'tipo_pagamento', 'numero_documento', 'nota_fiscal',
  'status', 'valor_pago', 'data_pagamento', 'data_cadastro', 'created_at', 'updated_at', 'empresa_id',
] as const;

const contaInclude = {
  financeiro_fornecedores: true,
  financeiro_conta_pagar_pagamentos: { orderBy: { created_at: 'desc' as const } },
};

function shapeConta<T extends { financeiro_fornecedores?: unknown; financeiro_conta_pagar_pagamentos?: unknown; valor: unknown; valor_pago: unknown }>(row: T) {
  return {
    ...row,
    fornecedor: row.financeiro_fornecedores ?? null,
    pagamentos: row.financeiro_conta_pagar_pagamentos ?? [],
    saldo_devedor: Number(row.valor) - Number(row.valor_pago || 0),
  };
}

function enumFilter<T extends string>(values: readonly T[], term: string): { in: T[] } | { in: [] } {
  const matches = enumMatches(values, term);
  return { in: matches };
}

export class ContaPagarService {
  static async list(filters: ListContasPagarFilters) {
    const {
      page = 1, limit = 15, search, searchField, status, tipo_pagamento, fornecedor_id,
      data_inicio, data_fim, sortColumn, sortDirection: direction, empresa_id,
    } = filters;
    const offset = (page - 1) * limit;
    const and: Prisma.financeiro_contas_pagarWhereInput[] = [];

    if (empresa_id !== undefined) and.push({ empresa_id });
    if (status) and.push({ status: status as (typeof STATUS_VALUES)[number] });
    if (tipo_pagamento) and.push({ tipo_pagamento: tipo_pagamento as (typeof TIPO_PAGAMENTO)[number] });
    if (fornecedor_id) {
      const fornecedorIdNum = parseInt(fornecedor_id, 10);
      if (!Number.isNaN(fornecedorIdNum)) and.push({ fornecedor_id: fornecedorIdNum });
    }
    const vencimento = dateBounds(data_inicio, data_fim);
    if (vencimento) and.push({ data_vencimento: vencimento });

    const term = search?.trim() ?? '';
    const shouldSearchFornecedor = Boolean(term && (searchField === 'fornecedor' || !searchField));
    if (term) {
      const numExact = /^\d+$/.test(term) ? parseInt(term, 10) : null;
      switch (searchField) {
        case 'id':
          and.push(numExact !== null ? { id: numExact } : { id: { lt: 0 } });
          break;
        case 'numero_documento':
          and.push({ numero_documento: { contains: term } });
          break;
        case 'nota_fiscal':
          and.push({ nota_fiscal: { contains: term } });
          break;
        case 'fornecedor':
          break;
        case 'vencimento': {
          const day = dateBounds(term, term);
          if (day) and.push({ data_vencimento: day });
          break;
        }
        case 'valor': {
          const range = numericBounds(term, 0.1);
          if (range) and.push({ valor: range });
          break;
        }
        case 'status':
          and.push({ status: enumFilter(STATUS_VALUES, term.toUpperCase()) });
          break;
        case 'tipo':
          and.push({ tipo_pagamento: enumFilter(TIPO_PAGAMENTO, term.toUpperCase()) });
          break;
        default: {
          const orConditions: Prisma.financeiro_contas_pagarWhereInput[] = [
            { numero_documento: { contains: term } },
            { nota_fiscal: { contains: term } },
          ];
          if (numExact !== null) orConditions.unshift({ id: numExact });
          and.push({ OR: orConditions });
          break;
        }
      }
    }

    if (shouldSearchFornecedor) {
      and.push({
        financeiro_fornecedores: {
          OR: [
            { nome_razao_social: { contains: term } },
            { nome_fantasia: { contains: term } },
          ],
        },
      });
    }

    const where: Prisma.financeiro_contas_pagarWhereInput = and.length > 0 ? { AND: and } : {};
    const dir = sortDirection(direction);
    let orderBy: Prisma.financeiro_contas_pagarOrderByWithRelationInput[] = [
      { data_vencimento: 'asc' },
      { created_at: 'desc' },
    ];
    let virtual: string | null = null;
    if (sortColumn === 'saldo_devedor') {
      virtual = 'COALESCE(`valor`, 0) - COALESCE(`valor_pago`, 0)';
    } else if (sortColumn === 'fornecedor') {
      orderBy = [{ financeiro_fornecedores: { nome_razao_social: dir } }];
    } else if (sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)) {
      orderBy = [{ [sortColumn]: dir }];
    } else if (sortColumn) {
      logger.warn('ContaPagarService.list - Coluna de ordenação inválida', { column: sortColumn });
    }

    const include = {
      financeiro_fornecedores: true,
      financeiro_conta_pagar_pagamentos: { orderBy: { created_at: 'desc' as const }, take: 5 },
    };

    let rows;
    let count: number;
    if (virtual) {
      const matching = await prisma.financeiro_contas_pagar.findMany({ where, select: { id: true } });
      const pageIds = await orderPageBySql('financeiro_contas_pagar', virtual, sqlDirection(direction), matching.map((item) => item.id), limit, offset);
      count = matching.length;
      const found = pageIds.length
        ? await prisma.financeiro_contas_pagar.findMany({ where: { id: { in: pageIds } }, include })
        : [];
      rows = reorderByIds(found, pageIds);
    } else {
      [count, rows] = await Promise.all([
        prisma.financeiro_contas_pagar.count({ where }),
        prisma.financeiro_contas_pagar.findMany({ where, include, orderBy, take: limit, skip: offset }),
      ]);
    }

    return {
      success: true,
      data: rows.map(shapeConta),
      pagination: buildPagination(page, limit, count),
    };
  }

  static async getById(id: string | number, _transaction?: unknown) {
    const row = await prisma.financeiro_contas_pagar.findUnique({
      where: { id: Number(id) },
      include: contaInclude,
    });
    return row ? shapeConta(row) : null;
  }

  static async create(dadosContaPagar: Prisma.financeiro_contas_pagarUncheckedCreateInput, _transaction?: unknown) {
    const data = { ...dadosContaPagar };
    if (!data.data_cadastro) data.data_cadastro = new Date();
    return prisma.financeiro_contas_pagar.create({ data });
  }

  static async update(id: string | number, dadosContaPagar: Prisma.financeiro_contas_pagarUncheckedUpdateInput) {
    const numericId = Number(id);
    const conta = await prisma.financeiro_contas_pagar.findUnique({ where: { id: numericId } });
    if (!conta) throw new Error('Conta a pagar não encontrada');
    await prisma.financeiro_contas_pagar.update({ where: { id: numericId }, data: dadosContaPagar });
    const atualizada = await ContaPagarService.getById(numericId);
    if (!atualizada) throw new Error('Conta a pagar não encontrada');
    return atualizada;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const conta = await prisma.financeiro_contas_pagar.findUnique({ where: { id: numericId } });
    if (!conta) throw new Error('Conta a pagar não encontrada');
    await prisma.financeiro_contas_pagar.delete({ where: { id: numericId } });
    return conta;
  }

  static async createPagamento(
    dados: {
      conta_pagar_id: number;
      empresa_id?: number | null;
      data: Date;
      valor: number;
      tipo_pagamento: (typeof TIPO_PAGAMENTO)[number];
      usuario_id?: number | null;
      observacao?: string | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    return db.financeiro_conta_pagar_pagamentos.create({
      data: { ...dados, empresa_id: dados.empresa_id ?? null },
    });
  }

  static async updateInstance(
    conta: { id: number },
    dados: Prisma.financeiro_contas_pagarUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? prisma;
    await db.financeiro_contas_pagar.update({ where: { id: conta.id }, data: dados });
    const row = await db.financeiro_contas_pagar.findUnique({
      where: { id: conta.id },
      include: contaInclude,
    });
    if (!row) throw new Error('Conta a pagar não encontrada');
    return shapeConta(row);
  }

  static async findAllWithAttributes(attributes: string[], where?: Prisma.financeiro_contas_pagarWhereInput) {
    const select = attributes.reduce<Record<string, boolean>>((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    return prisma.financeiro_contas_pagar.findMany({
      where,
      select: select as Prisma.financeiro_contas_pagarSelect,
    });
  }

  static async count(where?: Prisma.financeiro_contas_pagarWhereInput): Promise<number> {
    return prisma.financeiro_contas_pagar.count({ where });
  }
}
