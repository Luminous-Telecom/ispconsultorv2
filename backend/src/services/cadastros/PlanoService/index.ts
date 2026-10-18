import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { cache } from '../../../utils/cache';
import { normalizeDateForDb } from '../../../utils/dateUtils';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { enumMatches, orderPageBySql, reorderByIds, sortDirection, sqlDirection } from '../prismaWhere';

/** Converte YYYY-MM-DD / Date / vazio para Date|null aceito pelo Prisma DateTime. */
function normalizePlanoDate(value: unknown): Date | null {
  if (value === '' || value === 'Invalid date' || value == null) return null;
  if (value instanceof Date || typeof value === 'string') {
    return normalizeDateForDb(value);
  }
  return null;
}

export interface ListPlanosFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  status?: string;
  tipo_servico?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

const STATUS = ['ativo', 'inativo'] as const;
const TIPO_SERVICO = ['infraestrutura', 'consultoria', 'blockdomi'] as const;
const PERIODICIDADE = ['mensal', 'trimestral', 'semestral', 'anual', 'bimestral', 'quinzenal', 'semanal'] as const;
const SORT_COLUMNS = [
  'id', 'nome_plano', 'descricao', 'tipo_servico', 'quantidade_usuarios', 'valor_mensal',
  'periodicidade', 'data_inicio', 'data_fim', 'status', 'created_at', 'updated_at', 'empresa_id',
] as const;

const LIST_SELECT = {
  id: true, nome_plano: true, descricao: true, tipo_servico: true, servicos_inclusos: true,
  quantidade_usuarios: true, valor_mensal: true, periodicidade: true, data_inicio: true,
  data_fim: true, status: true, observacoes: true, created_at: true, updated_at: true,
} as const;

function shapePlano<T extends {
  id: number;
  servicos_inclusos?: string | null;
  contratos?: Array<{
    desconto_percentual: unknown;
    desconto_valor: unknown;
    valor_final: unknown;
    status: string;
    clientes: { id: number; razao_social: string; nome_fantasia: string | null };
  }>;
}>(plano: T, quantidade: number) {
  let servicos: unknown = plano.servicos_inclusos;
  if (typeof servicos === 'string') {
    try {
      servicos = JSON.parse(servicos);
    } catch {
      servicos = [];
    }
  }
  const clientes = (plano.contratos ?? []).map((contrato) => ({
    id: contrato.clientes.id,
    razao_social: contrato.clientes.razao_social,
    nome_fantasia: contrato.clientes.nome_fantasia,
    Contrato: {
      desconto_percentual: contrato.desconto_percentual,
      desconto_valor: contrato.desconto_valor,
      valor_final: contrato.valor_final,
      status: contrato.status,
    },
  }));
  return { ...plano, servicos_inclusos: servicos, clientes, quantidade_clientes: quantidade };
}

export class PlanoService {
  static async list(filters: ListPlanosFilters) {
    const { page = 1, limit = 15, search, searchField, status, tipo_servico, sortColumn, sortDirection: direction, empresa_id } = filters;
    const offset = (page - 1) * limit;
    const cacheKey = `planos:list:${empresa_id || 0}:${page}:${limit}:${status || 'all'}:${tipo_servico || 'all'}:${search || ''}:${sortColumn || 'id'}:${direction || 'DESC'}`;
    if (!search && !sortColumn) {
      const cached = cache.get(cacheKey);
      if (cached) return cached as {
        data: Array<Record<string, unknown> & { quantidade_clientes: number }>;
        pagination: ReturnType<typeof buildPagination>;
      };
    }

    const and: Prisma.cadastros_planosWhereInput[] = [];
    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.cadastros_planosWhereInput[] = [];
      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'valor_mensal' || searchField === 'quantidade_usuarios') {
        orConditions = numExact !== null ? [{ [searchField]: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'nome_plano' || searchField === 'descricao') {
        orConditions = [{ [searchField]: { contains: search } }];
      } else if (searchField === 'tipo_servico') {
        const matches = enumMatches(TIPO_SERVICO, search);
        orConditions = matches.length ? [{ tipo_servico: { in: matches } }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'periodicidade') {
        const matches = enumMatches(PERIODICIDADE, search);
        orConditions = matches.length ? [{ periodicidade: { in: matches } }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'status') {
        const matches = enumMatches(STATUS, search);
        orConditions = matches.length ? [{ status: { in: matches } }] : [{ id: { lt: 0 } }];
      } else {
        orConditions = [
          { nome_plano: { contains: search } },
          { descricao: { contains: search } },
        ];
        const tipos = enumMatches(TIPO_SERVICO, search);
        const periodos = enumMatches(PERIODICIDADE, search);
        const statuses = enumMatches(STATUS, search);
        if (tipos.length) orConditions.push({ tipo_servico: { in: tipos } });
        if (periodos.length) orConditions.push({ periodicidade: { in: periodos } });
        if (statuses.length) orConditions.push({ status: { in: statuses } });
        if (numExact !== null) {
          orConditions.unshift({ id: numExact });
          orConditions.push({ valor_mensal: numExact }, { quantidade_usuarios: numExact });
        }
      }
      and.push({ OR: orConditions });
    }
    if (status && (STATUS as readonly string[]).includes(status)) and.push({ status: status as (typeof STATUS)[number] });
    if (tipo_servico && (TIPO_SERVICO as readonly string[]).includes(tipo_servico)) {
      and.push({ tipo_servico: tipo_servico as (typeof TIPO_SERVICO)[number] });
    }
    if (empresa_id !== undefined) and.push({ empresa_id });
    const where: Prisma.cadastros_planosWhereInput = and.length > 0 ? { AND: and } : {};

    const planoQuery = {
      select: {
        ...LIST_SELECT,
        contratos: {
          select: {
            desconto_percentual: true,
            desconto_valor: true,
            valor_final: true,
            status: true,
            clientes: { select: { id: true, razao_social: true, nome_fantasia: true } },
          },
        },
      },
    };
    const isOrderingByQuantidadeClientes = sortColumn === 'quantidade_clientes' || sortColumn === 'clientes';
    const dir = sortDirection(direction);

    try {
      let planos;
      let count: number;
      if (isOrderingByQuantidadeClientes && direction) {
        const matching = await prisma.cadastros_planos.findMany({ where, select: { id: true } });
        const pageIds = await orderPageBySql(
          'cadastros_planos',
          `(SELECT COUNT(DISTINCT contratos.cliente_id) FROM contratos WHERE contratos.plano_id = cadastros_planos.id AND contratos.status = 'ativo')`,
          sqlDirection(direction),
          matching.map((item) => item.id),
          limit,
          offset,
        );
        count = matching.length;
        const found = pageIds.length
          ? await prisma.cadastros_planos.findMany({ where: { id: { in: pageIds } }, ...planoQuery })
          : [];
        planos = reorderByIds(found, pageIds);
      } else {
        let orderBy: Prisma.cadastros_planosOrderByWithRelationInput = { id: 'desc' };
        if (sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)) orderBy = { [sortColumn]: dir };
        else if (sortColumn) logger.warn('PlanoService.list - Coluna de ordenação inválida', { column: sortColumn });
        [count, planos] = await Promise.all([
          prisma.cadastros_planos.count({ where }),
          prisma.cadastros_planos.findMany({ where, ...planoQuery, orderBy, take: limit, skip: offset }),
        ]);
      }

      const planoIds = planos.map((plano) => plano.id);
      const grupos = planoIds.length
        ? await prisma.contratos.groupBy({
            by: ['plano_id'],
            where: { plano_id: { in: planoIds }, status: 'ativo' },
            _count: { id: true },
          })
        : [];
      const quantidadeClientesMap = grupos.reduce<Record<number, number>>((acc, item) => {
        acc[item.plano_id] = item._count.id;
        return acc;
      }, {});

      const response = {
        data: planos.map((plano) => shapePlano(plano, quantidadeClientesMap[plano.id] || 0)),
        pagination: buildPagination(page, limit, count),
      };
      if (!search && !sortColumn) cache.set(cacheKey, response, 600000);
      return response;
    } catch (queryError: unknown) {
      const error = queryError instanceof Error ? queryError : new Error('Erro desconhecido');
      logger.error('PlanoService.list - Erro na query', { error: error.message, sortColumn, sortDirection: direction });
      throw queryError;
    }
  }

  static async getById(id: string | number, _transaction?: unknown) {
    const plano = await prisma.cadastros_planos.findUnique({
      where: { id: Number(id) },
      include: {
        contratos: {
          include: { clientes: { select: { id: true, razao_social: true, nome_fantasia: true } } },
        },
      },
    });
    return plano ? shapePlano(plano, 0) : null;
  }

  static async findAtivos() {
    const planos = await prisma.cadastros_planos.findMany({
      where: { status: 'ativo' },
      orderBy: { nome_plano: 'asc' },
      include: { contratos: { include: { clientes: { select: { id: true, razao_social: true, nome_fantasia: true } } } } },
    });
    return planos.map((plano) => shapePlano(plano, 0));
  }

  static async count(where?: unknown): Promise<number> {
    const { toPrismaWhere } = await import('../prismaWhere');
    return prisma.cadastros_planos.count({
      where: (toPrismaWhere(where) ?? {}) as Prisma.cadastros_planosWhereInput,
    });
  }

  static async create(dadosPlano: Prisma.cadastros_planosUncheckedCreateInput & { data_inicio?: unknown; data_fim?: unknown; descricao?: unknown }) {
    const dados = { ...dadosPlano };
    dados.data_inicio = normalizePlanoDate(dados.data_inicio);
    dados.data_fim = normalizePlanoDate(dados.data_fim);
    if (dados.descricao === undefined) dados.descricao = null;
    if (Array.isArray(dados.servicos_inclusos)) dados.servicos_inclusos = JSON.stringify(dados.servicos_inclusos);
    const plano = await prisma.cadastros_planos.create({
      data: dados as Prisma.cadastros_planosUncheckedCreateInput,
    });
    cache.deletePattern('planos:list:.*');
    return plano;
  }

  static async update(id: string | number, dadosPlano: Record<string, unknown>) {
    const numericId = Number(id);
    const existing = await prisma.cadastros_planos.findUnique({ where: { id: numericId } });
    if (!existing) throw new Error('Plano não encontrado');

    const allowed = ['nome_plano', 'descricao', 'tipo_servico', 'servicos_inclusos', 'quantidade_usuarios', 'valor_mensal', 'periodicidade', 'data_inicio', 'data_fim', 'status', 'observacoes'];
    const updateData: Prisma.cadastros_planosUncheckedUpdateInput = {};
    for (const key of Object.keys(dadosPlano)) {
      if (!allowed.includes(key)) continue;
      const value = dadosPlano[key];
      if (key === 'data_inicio' || key === 'data_fim') {
        (updateData as Record<string, Date | null>)[key] = normalizePlanoDate(value);
      } else if (key === 'servicos_inclusos' && Array.isArray(value)) {
        updateData.servicos_inclusos = JSON.stringify(value);
      } else {
        (updateData as Record<string, unknown>)[key] = value === undefined ? null : value;
      }
    }

    await prisma.cadastros_planos.update({ where: { id: numericId }, data: updateData });
    const plano = await PlanoService.getById(numericId);
    if (!plano) throw new Error('Plano não encontrado após atualização');
    cache.deletePattern('planos:list:.*');
    return plano;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const plano = await prisma.cadastros_planos.findUnique({ where: { id: numericId } });
    if (!plano) throw new Error('Plano não encontrado');

    const titulosCount = await prisma.financeiro_titulos.count({ where: { plano_id: numericId } });
    if (titulosCount > 0) {
      throw new Error(`Plano possui ${titulosCount} título(s) associado(s). Remova os títulos antes de excluir o plano.`);
    }
    const contratosCount = await prisma.contratos.count({ where: { plano_id: numericId } });
    if (contratosCount > 0) {
      throw new Error(`Plano possui ${contratosCount} contrato(s) de cliente(s) associado(s). Remova os contratos antes de excluir o plano.`);
    }

    await prisma.cadastros_planos.delete({ where: { id: numericId } });
    cache.deletePattern('planos:list:.*');
    return plano;
  }

  static async updateStatus(id: string | number, status: 'ativo' | 'inativo') {
    const numericId = Number(id);
    const plano = await prisma.cadastros_planos.findUnique({ where: { id: numericId } });
    if (!plano) throw new Error('Plano não encontrado');
    await prisma.cadastros_planos.update({ where: { id: numericId }, data: { status } });
    cache.deletePattern('planos:list:.*');
    const atualizado = await PlanoService.getById(numericId);
    if (!atualizado) throw new Error('Plano não encontrado');
    return atualizado;
  }
}
