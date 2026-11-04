import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { buildPagination } from '../../../utils/pagination';
import { impedirExclusaoComVinculos } from '../../../utils/exclusaoVinculo';
import { sortDirection } from '../prismaWhere';

export interface ListVendedorFilters {
  search?: string;
  searchField?: string;
  ativo?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number | null;
}

export const NOME_VENDEDOR_PADRAO = 'Vendedor padrão';
export const MENSAGEM_UNICO_VENDEDOR = 'Não é possível excluir o único vendedor.';

export class UnicoVendedorError extends Error {
  readonly code = 'UNICO_VENDEDOR';

  constructor() {
    super(MENSAGEM_UNICO_VENDEDOR);
    this.name = 'UnicoVendedorError';
  }
}

const SORT_COLUMNS = [
  'id', 'nome', 'comissao_percentual', 'comissao_valor', 'cidade', 'telefone',
  'celular', 'cpf_cnpj', 'email', 'ativo', 'created_at', 'updated_at',
] as const;

const NULLABLE_STRINGS = [
  'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
  'telefone', 'celular', 'cpf_cnpj', 'email', 'banco_nome', 'codigo_banco',
  'chave_pix', 'nome_titular', 'cpf_cnpj_titular', 'agencia', 'digito_agencia',
  'conta', 'digito_conta', 'codigo_operacao', 'forma_recebimento', 'tipo_conta',
  'tipo_chave_pix', 'tipo_pessoa_titular',
] as const;

function blankToNull<T extends Record<string, unknown>>(dados: T): T {
  const next: Record<string, unknown> = { ...dados };
  for (const key of NULLABLE_STRINGS) {
    if (key in next && (next[key] === '' || next[key] === undefined)) {
      next[key] = null;
    }
  }
  if ('comissao_percentual' in next && (next.comissao_percentual === '' || next.comissao_percentual == null)) {
    next.comissao_percentual = null;
  }
  if ('comissao_valor' in next && (next.comissao_valor === '' || next.comissao_valor == null)) {
    next.comissao_valor = null;
  }
  if (typeof next.estado === 'string' && next.estado) {
    next.estado = next.estado.toUpperCase();
  }
  return next as T;
}

export class VendedorService {
  static async list(filters: ListVendedorFilters) {
    const { search, searchField, ativo, page = 1, limit = 15, sortColumn, sortDirection: direction, empresa_id } = filters;
    const andConditions: Prisma.cadastros_vendedoresWhereInput[] = [];

    if (empresa_id != null) {
      andConditions.push({ OR: [{ empresa_id }, { empresa_id: null }] });
    }

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.cadastros_vendedoresWhereInput[] = [];

      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'nome') {
        orConditions = [{ nome: { contains: search } }];
      } else if (searchField === 'cpf_cnpj') {
        orConditions = [{ cpf_cnpj: { contains: search } }];
      } else if (searchField === 'email') {
        orConditions = [{ email: { contains: search } }];
      } else if (searchField === 'cidade') {
        orConditions = [{ cidade: { contains: search } }];
      } else {
        orConditions = [
          { nome: { contains: search } },
          { cpf_cnpj: { contains: search } },
          { email: { contains: search } },
          { cidade: { contains: search } },
          { telefone: { contains: search } },
          { celular: { contains: search } },
        ];
        if (numExact !== null) orConditions.unshift({ id: numExact });
      }

      andConditions.push({ OR: orConditions });
    }

    if (ativo !== undefined && ativo !== '') {
      andConditions.push({ ativo: ativo === 'ativo' || ativo === 'true' });
    }

    const where: Prisma.cadastros_vendedoresWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};
    const dir = sortDirection(direction);
    const orderBy: Prisma.cadastros_vendedoresOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const [count, data] = await Promise.all([
      prisma.cadastros_vendedores.count({ where }),
      prisma.cadastros_vendedores.findMany({ where, orderBy, take: limitNum, skip: offset }),
    ]);

    return {
      success: true,
      data,
      pagination: buildPagination(pageNum, limitNum, count),
    };
  }

  static async getById(id: string | number) {
    return prisma.cadastros_vendedores.findUnique({ where: { id: Number(id) } });
  }

  static async findAtivos(empresaId?: number | null) {
    const where: Prisma.cadastros_vendedoresWhereInput =
      empresaId != null
        ? { ativo: true, OR: [{ empresa_id: empresaId }, { empresa_id: null }] }
        : { ativo: true };
    return prisma.cadastros_vendedores.findMany({ where, orderBy: { nome: 'asc' } });
  }

  static async existsByCpfCnpj(cpfCnpj: string, ignoreId?: number, empresaId?: number | null) {
    const documento = cpfCnpj.trim();
    if (!documento) return false;
    const found = await prisma.cadastros_vendedores.findFirst({
      where: {
        cpf_cnpj: documento,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
        ...(empresaId != null ? { OR: [{ empresa_id: empresaId }, { empresa_id: null }] } : {}),
      },
      select: { id: true },
    });
    return !!found;
  }

  static async create(dados: Prisma.cadastros_vendedoresUncheckedCreateInput) {
    return prisma.cadastros_vendedores.create({
      data: blankToNull(dados as Record<string, unknown>) as Prisma.cadastros_vendedoresUncheckedCreateInput,
    });
  }

  static async update(id: string | number, dados: Prisma.cadastros_vendedoresUncheckedUpdateInput) {
    const numericId = Number(id);
    const item = await prisma.cadastros_vendedores.findUnique({ where: { id: numericId } });
    if (!item) throw new Error('Vendedor não encontrado');
    return prisma.cadastros_vendedores.update({
      where: { id: numericId },
      data: blankToNull(dados as Record<string, unknown>) as Prisma.cadastros_vendedoresUncheckedUpdateInput,
    });
  }

  static async garantirPadrao() {
    const existente = await prisma.cadastros_vendedores.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    const padrao = existente ?? await prisma.cadastros_vendedores.create({
      data: {
        nome: NOME_VENDEDOR_PADRAO,
        comissao_percentual: 0,
        comissao_valor: 0,
        ativo: true,
        empresa_id: null,
      },
      select: { id: true },
    });
    await prisma.contratos.updateMany({
      where: { vendedor_id: null },
      data: { vendedor_id: padrao.id },
    });
    return padrao;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const item = await prisma.cadastros_vendedores.findUnique({ where: { id: numericId } });
    if (!item) throw new Error('Vendedor não encontrado');
    const total = await prisma.cadastros_vendedores.count();
    if (total <= 1) throw new UnicoVendedorError();
    await impedirExclusaoComVinculos([
      {
        rotulo: 'contrato(s)',
        contar: () => prisma.contratos.count({ where: { vendedor_id: numericId } }),
      },
    ]);
    await prisma.cadastros_vendedores.delete({ where: { id: numericId } });
    return item;
  }
}
