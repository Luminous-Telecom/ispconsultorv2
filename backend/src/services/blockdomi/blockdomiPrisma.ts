import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { buildPagination } from '../../utils/pagination';

export type BlockdomiTabela = 'blockdomi_dominios' | 'blockdomi_ipv4' | 'blockdomi_ipv6';

const TEXT_FIELDS = [
  'descricao',
  'nome_oficio',
  'link_oficio_anatel',
  'link_oficio_justica',
  'link_planilha_dominios',
] as const;

const SCALAR_SORT = new Set([
  'id',
  'dominio',
  'ip',
  'descricao',
  'ativo',
  'created_at',
  'updated_at',
  'nome_oficio',
  'data_inicio_bloqueio',
  'data_fim_bloqueio',
  'link_oficio_anatel',
  'link_oficio_justica',
  'link_planilha_dominios',
  'versao_id',
  'empresa_id',
  'numero_sei_anatel_id',
]);

export const BLOCKDOMI_INCLUDE = {
  blockdomi_versoes: { select: { numero: true } },
  blockdomi_numeros_sei_anatel: { select: { numero: true } },
} satisfies Prisma.blockdomi_dominiosInclude;

export function dateOnlyString(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
  }
  if (Number.isNaN(value.getTime())) return null;
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateOrNull(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

const DATE_FIELDS = ['data_inicio_bloqueio', 'data_fim_bloqueio'] as const;

export function normalizeBlockdomiWrite(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data };
  for (const field of DATE_FIELDS) {
    if (field in out) out[field] = toDateOrNull(out[field]);
  }
  return out;
}

type BlockdomiRow = {
  id: number;
  empresa_id?: number | null;
  data_inicio_bloqueio?: Date | string | null;
  data_fim_bloqueio?: Date | string | null;
  blockdomi_versoes?: { numero: string } | null;
  blockdomi_numeros_sei_anatel?: { numero: string } | null;
};

export function plainBlockdomi<T extends BlockdomiRow>(row: T, withRefs: boolean): T & Record<string, unknown> {
  const { blockdomi_versoes, blockdomi_numeros_sei_anatel, ...rest } = row;
  const plain: Record<string, unknown> = {
    ...rest,
    data_inicio_bloqueio: dateOnlyString(row.data_inicio_bloqueio),
    data_fim_bloqueio: dateOnlyString(row.data_fim_bloqueio),
  };
  if (withRefs) {
    plain.versaoRef = blockdomi_versoes ? { numero: blockdomi_versoes.numero } : null;
    plain.numeroSeiRef = blockdomi_numeros_sei_anatel ? { numero: blockdomi_numeros_sei_anatel.numero } : null;
  }
  return plain as T & Record<string, unknown>;
}

type BlockdomiClient = {
  findUnique(args: {
    where: { id: number };
    include?: typeof BLOCKDOMI_INCLUDE;
  }): Promise<Parameters<typeof plainBlockdomi>[0] | null>;
  count(args: { where: Prisma.blockdomi_dominiosWhereInput }): Promise<number>;
  findMany(args: {
    where: Prisma.blockdomi_dominiosWhereInput;
    orderBy: unknown;
    skip: number;
    take: number;
    include?: typeof BLOCKDOMI_INCLUDE;
  }): Promise<Array<Parameters<typeof plainBlockdomi>[0]>>;
};

function delegate(tabela: BlockdomiTabela): BlockdomiClient {
  return prisma[tabela] as unknown as BlockdomiClient;
}

export async function findBlockdomiById(tabela: BlockdomiTabela, id: string | number) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  const row = await delegate(tabela).findUnique({
    where: { id: numericId },
    include: BLOCKDOMI_INCLUDE,
  });
  return row ? plainBlockdomi(row, true) : null;
}

export async function listBlockdomi(options: {
  tabela: BlockdomiTabela;
  primaryField: 'dominio' | 'ip';
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    searchField?: string;
    ativo?: boolean;
    sortColumn?: string;
    sortDirection?: string;
  };
  logContext: string;
}) {
  const { tabela, primaryField, filters, logContext } = options;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 15;
  const where = buildListWhere(filters, primaryField);
  const orderBy = buildOrder(filters.sortColumn, filters.sortDirection, logContext);

  const [total, rows] = await Promise.all([
    delegate(tabela).count({ where }),
    delegate(tabela).findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: BLOCKDOMI_INCLUDE,
    }),
  ]);

  return {
    data: rows.map((row) => plainBlockdomi(row, true)),
    pagination: buildPagination(page, limit, total),
  };
}

function buildListWhere(
  filters: { search?: string; searchField?: string; ativo?: boolean },
  primaryField: 'dominio' | 'ip'
): Prisma.blockdomi_dominiosWhereInput {
  const parts: Prisma.blockdomi_dominiosWhereInput[] = [];
  const searchWhere = buildSearchWhere(filters.search, filters.searchField, primaryField);
  if (searchWhere) parts.push(searchWhere);
  if (filters.ativo !== undefined) parts.push({ ativo: filters.ativo });
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return { AND: parts };
}

function buildSearchWhere(
  search: string | undefined,
  searchField: string | undefined,
  primaryField: 'dominio' | 'ip'
): Prisma.blockdomi_dominiosWhereInput | null {
  if (!search?.trim()) return null;
  const term = search.trim();
  const textFields = [primaryField, ...TEXT_FIELDS];
  const numExact = /^\d+$/.test(term) ? parseInt(term, 10) : null;

  if (searchField === 'id') {
    return numExact !== null ? { id: numExact } : { id: { lt: 0 } };
  }
  if (searchField === 'numero_sei_anatel') {
    return { blockdomi_numeros_sei_anatel: { numero: { contains: term } } };
  }
  if (searchField && (textFields as readonly string[]).includes(searchField)) {
    return { [searchField]: { contains: term } } as Prisma.blockdomi_dominiosWhereInput;
  }

  const or: Prisma.blockdomi_dominiosWhereInput[] = [
    { [primaryField]: { contains: term } } as Prisma.blockdomi_dominiosWhereInput,
    { descricao: { contains: term } },
    { nome_oficio: { contains: term } },
    { link_oficio_anatel: { contains: term } },
    { link_oficio_justica: { contains: term } },
    { link_planilha_dominios: { contains: term } },
    { blockdomi_numeros_sei_anatel: { numero: { contains: term } } },
  ];
  if (numExact !== null) or.unshift({ id: numExact });
  return { OR: or };
}

function buildOrder(sortColumn: string | undefined, sortDirection: string | undefined, logContext: string) {
  if (!sortColumn || !sortDirection) return { id: 'desc' as const };
  const dir = sortDirection.toUpperCase() === 'ASC' ? 'asc' as const : 'desc' as const;
  if (sortColumn === 'versao') return { blockdomi_versoes: { numero: dir } };
  if (sortColumn === 'numero_sei_anatel') return { blockdomi_numeros_sei_anatel: { numero: dir } };
  if (SCALAR_SORT.has(sortColumn)) return { [sortColumn]: dir };
  logger.warn(`${logContext} - Coluna de ordenação inválida`, { column: sortColumn });
  return { id: 'desc' as const };
}

export async function registrarOperacaoDelete(
  tipo: string,
  versaoId: number,
  quantidade: number,
  ids: number[],
  empresaId?: number | null
): Promise<void> {
  await prisma.sistema_logs_operacionais.create({
    data: {
      empresa_id: empresaId ?? null,
      canal: 'sistema',
      tipo,
      recurso: 'blockdomi_operacao',
      recurso_id: String(versaoId),
      payload: JSON.stringify({
        log_contexto: 'blockdomi_operacao',
        versao_id: versaoId,
        quantidade,
        ids_deletados: ids,
      }),
      mensagem: `${tipo}: ${quantidade}`,
    },
  });
}
