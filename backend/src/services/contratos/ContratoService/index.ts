import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { orderPageBySql, reorderByIds, sortDirection, sqlDirection, toPrismaWhere } from '../../cadastros/prismaWhere';

export interface ListContratosFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: string;
  isento_mensalidade?: boolean;
  plano_id?: number;
  tipo_servico?: string;
  em_atraso?: boolean;
  excluir_em_atraso?: boolean;
  empresa_id?: number;
  cliente_id?: number;
}

const CONTRATO_COLUMNS = [
  'id', 'cliente_id', 'plano_id', 'desconto_percentual', 'desconto_valor', 'valor_final',
  'data_inicio', 'data_fim', 'status', 'observacoes', 'isento_mensalidade', 'dia_vencimento_id',
  'conta_boleto', 'data_validade_desconto', 'modelo_documento_id', 'created_at', 'updated_at',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'usar_endereco_cliente',
  'tipo_cobranca_contrato_id', 'empresa_id',
] as const;

const TEXT_FIELDS = ['observacoes', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as const;
const NUMERIC_FIELDS = ['valor_final', 'id', 'cliente_id', 'plano_id'] as const;
const STATUS_VALUES = ['ativo', 'inativo', 'suspenso'] as const;
const TIPO_SERVICO = ['infraestrutura', 'consultoria', 'blockdomi'] as const;

const contratoInclude = {
  clientes: true,
  cadastros_planos: true,
  cadastros_bancos: true,
  cadastros_tipos_cobranca_contrato: true,
} as const;

function shapeContrato<T extends {
  clientes?: unknown;
  cadastros_planos?: unknown;
  cadastros_bancos?: unknown;
  cadastros_tipos_cobranca_contrato?: unknown;
}>(row: T) {
  return {
    ...row,
    cliente: row.clientes ?? null,
    plano: row.cadastros_planos ?? null,
    bancoBoleto: row.cadastros_bancos ?? null,
    tipoCobrancaContrato: row.cadastros_tipos_cobranca_contrato ?? null,
  };
}

function inicioDeHoje(): Date {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function filtroEmAtraso(): Prisma.contratosWhereInput {
  return {
    financeiro_titulos: {
      some: {
        pago: false,
        status: { in: ['pendente', 'vencido'] },
        data_vencimento: { lt: inicioDeHoje() },
      },
    },
  };
}

function statusMatches(term: string): Prisma.contratosWhereInput | null {
  const matches = STATUS_VALUES.filter((value) => value.includes(term.toLowerCase()));
  if (matches.length === 0) return null;
  return { status: { in: matches } };
}

export class ContratoService {
  private static normalizeDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    return null;
  }

  static async getClienteIdsByContratoFilters(where: unknown): Promise<number[]> {
    const contratos = await prisma.contratos.findMany({
      where: (toPrismaWhere(where) ?? {}) as Prisma.contratosWhereInput,
      select: { cliente_id: true },
      distinct: ['cliente_id'],
    });
    return contratos.map((contrato) => contrato.cliente_id);
  }

  static async list(filters: ListContratosFilters) {
    const {
      page = 1, limit = 10, search = '', status, searchField, sortColumn, sortDirection: direction,
      isento_mensalidade, plano_id, tipo_servico, em_atraso, excluir_em_atraso, empresa_id, cliente_id,
    } = filters;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const and: Prisma.contratosWhereInput[] = [];

    if (empresa_id !== undefined) and.push({ empresa_id });

    if (search) {
      const searchString = typeof search === 'string' ? search : String(search);
      const numExact = /^\d+$/.test(searchString) ? parseInt(searchString, 10) : null;
      if (searchField === 'cliente' || searchField === 'cliente_razao_social') {
        const conditions: Prisma.contratosWhereInput[] = [
          { clientes: { razao_social: { contains: searchString } } },
          { clientes: { nome_fantasia: { contains: searchString } } },
        ];
        if (numExact !== null) conditions.push({ cliente_id: numExact });
        and.push({ OR: conditions });
      } else if (searchField === 'plano' || searchField === 'plano_nome') {
        const conditions: Prisma.contratosWhereInput[] = [
          { cadastros_planos: { nome_plano: { contains: searchString } } },
        ];
        if (numExact !== null) conditions.push({ plano_id: numExact });
        and.push({ OR: conditions });
      } else if (searchField) {
        const dbField = searchField === 'valor_final_num' ? 'valor_final' : searchField;
        if ((NUMERIC_FIELDS as readonly string[]).includes(dbField)) {
          and.push(numExact !== null ? { [dbField]: numExact } : { id: { lt: 0 } });
        } else if (dbField === 'status') {
          const match = statusMatches(searchString);
          and.push(match ?? { id: { lt: 0 } });
        } else if ((TEXT_FIELDS as readonly string[]).includes(dbField)) {
          and.push({ [dbField]: { contains: searchString } });
        } else {
          and.push({ id: { lt: 0 } });
        }
      } else {
        const conditions: Prisma.contratosWhereInput[] = [
          { clientes: { razao_social: { contains: searchString } } },
          { clientes: { nome_fantasia: { contains: searchString } } },
          { cadastros_planos: { nome_plano: { contains: searchString } } },
        ];
        const statusMatch = statusMatches(searchString);
        if (statusMatch) conditions.unshift(statusMatch);
        if (numExact !== null) {
          conditions.unshift({ id: numExact });
          conditions.push({ cliente_id: numExact }, { plano_id: numExact }, { valor_final: numExact });
        }
        and.push({ OR: conditions });
      }
    }

    if (em_atraso) {
      and.push({ status: 'ativo' });
      and.push(filtroEmAtraso());
    } else if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
      and.push({ status: status as (typeof STATUS_VALUES)[number] });
    }

    if (excluir_em_atraso && !em_atraso) {
      and.push({ financeiro_titulos: { none: filtroEmAtraso().financeiro_titulos!.some } });
    }

    if (isento_mensalidade !== undefined && isento_mensalidade !== null) {
      and.push({ isento_mensalidade });
    }
    if (plano_id) and.push({ plano_id });
    if (cliente_id) and.push({ cliente_id });
    if (tipo_servico && (TIPO_SERVICO as readonly string[]).includes(tipo_servico)) {
      const tipo = tipo_servico as (typeof TIPO_SERVICO)[number];
      and.push({
        OR: [
          { cadastros_planos: { tipo_servico: tipo } },
          {
            contratos_planos_adicionais: {
              some: { status: 'ativo', cadastros_planos: { tipo_servico: tipo } },
            },
          },
        ],
      });
    }

    const where: Prisma.contratosWhereInput = and.length > 0 ? { AND: and } : {};
    const dir = sortDirection(direction);
    const virtualSql: Record<string, string> = {
      desconto: 'COALESCE(`desconto_valor`, 0)',
      desconto_num: 'COALESCE(`desconto_valor`, 0)',
      valor_final_num: 'COALESCE(`valor_final`, 0)',
    };
    const relationOrder: Record<string, Prisma.contratosOrderByWithRelationInput> = {
      cliente: { clientes: { razao_social: dir } },
      cliente_razao_social: { clientes: { razao_social: dir } },
      plano: { cadastros_planos: { nome_plano: dir } },
      plano_nome: { cadastros_planos: { nome_plano: dir } },
      valor_plano_num: { cadastros_planos: { valor_mensal: dir } },
      valor_mensal: { cadastros_planos: { valor_mensal: dir } },
      banco_nome: { cadastros_bancos: { nome: dir } },
    };

    try {
      let rows;
      let count: number;
      if (sortColumn && virtualSql[sortColumn]) {
        const matching = await prisma.contratos.findMany({ where, select: { id: true } });
        const pageIds = await orderPageBySql(
          'contratos',
          virtualSql[sortColumn],
          sqlDirection(direction),
          matching.map((item) => item.id),
          limitNum,
          offset,
        );
        count = matching.length;
        const found = pageIds.length
          ? await prisma.contratos.findMany({ where: { id: { in: pageIds } }, include: contratoInclude })
          : [];
        rows = reorderByIds(found, pageIds);
      } else {
        let orderBy: Prisma.contratosOrderByWithRelationInput = { id: 'desc' };
        if (sortColumn && relationOrder[sortColumn]) {
          orderBy = relationOrder[sortColumn];
        } else if (sortColumn && (CONTRATO_COLUMNS as readonly string[]).includes(sortColumn)) {
          orderBy = { [sortColumn]: dir };
        } else if (sortColumn) {
          logger.warn('ContratoService.list - Coluna de ordenação inválida', { column: sortColumn });
        }
        [count, rows] = await Promise.all([
          prisma.contratos.count({ where }),
          prisma.contratos.findMany({
            where,
            include: contratoInclude,
            orderBy,
            take: limitNum,
            skip: offset,
          }),
        ]);
      }

      return {
        data: rows.map(shapeContrato),
        pagination: buildPagination(pageNum, limitNum, count),
      };
    } catch (queryError: unknown) {
      const error = queryError instanceof Error ? queryError : new Error('Erro desconhecido');
      logger.error('[ContratoService.list] Erro na query', {
        error: error.message,
        sortColumn,
        sortDirection: direction,
      });
      throw queryError;
    }
  }

  static async getById(id: string | number) {
    const row = await prisma.contratos.findUnique({
      where: { id: Number(id) },
      include: contratoInclude,
    });
    return row ? shapeContrato(row) : null;
  }

  static async findAtivoByCliente(clienteId: number) {
    const row = await prisma.contratos.findFirst({
      where: { cliente_id: clienteId, status: 'ativo' },
      orderBy: { id: 'desc' },
      include: contratoInclude,
    });
    return row ? shapeContrato(row) : null;
  }

  static async create(dadosContrato: Prisma.contratosUncheckedCreateInput, _transaction?: unknown) {
    const dados = { ...dadosContrato };
    if (dados.data_inicio) dados.data_inicio = ContratoService.normalizeDate(dados.data_inicio as string | Date);
    if (dados.data_fim) dados.data_fim = ContratoService.normalizeDate(dados.data_fim as string | Date);
    if (dados.data_validade_desconto) {
      dados.data_validade_desconto = ContratoService.normalizeDate(dados.data_validade_desconto as string | Date);
    }
    return prisma.contratos.create({ data: dados });
  }

  static async update(id: string | number, dadosContrato: Prisma.contratosUncheckedUpdateInput, _transaction?: unknown) {
    const numericId = Number(id);
    const contrato = await prisma.contratos.findUnique({ where: { id: numericId } });
    if (!contrato) throw new Error('Contrato não encontrado');

    const dados = { ...dadosContrato };
    if (dados.data_inicio !== undefined) {
      dados.data_inicio = ContratoService.normalizeDate(dados.data_inicio as string | Date | null);
    }
    if (dados.data_fim !== undefined) {
      dados.data_fim = ContratoService.normalizeDate(dados.data_fim as string | Date | null);
    }
    if (dados.data_validade_desconto !== undefined) {
      dados.data_validade_desconto = ContratoService.normalizeDate(dados.data_validade_desconto as string | Date | null);
    }

    await prisma.contratos.update({ where: { id: numericId }, data: dados });
    const atualizado = await ContratoService.getById(numericId);
    if (!atualizado) throw new Error('Contrato não encontrado');
    return atualizado;
  }

  static async delete(id: string | number, _transaction?: unknown) {
    const numericId = Number(id);
    const contrato = await prisma.contratos.findUnique({ where: { id: numericId } });
    if (!contrato) throw new Error('Contrato não encontrado');
    await prisma.contratos.delete({ where: { id: numericId } });
    return contrato;
  }
}
