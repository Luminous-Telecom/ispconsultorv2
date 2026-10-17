import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { resolveStatusPagamentoTitulo } from '../../../utils/tituloVencimentoUtils';
import { BancoApiService } from '../../bancos/BancoApiService';
import {
  dateBounds,
  enumMatches,
  numericBounds,
  orderPageBySql,
  reorderByIds,
  sortDirection,
  sqlDirection,
  toPrismaWhere,
  withToJson,
} from '../../cadastros/prismaWhere';

export interface ListTitulosFilters {
  page?: number;
  limit?: number;
  status?: string;
  cliente_id?: string | number;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_pagamento_inicio?: string;
  data_pagamento_fim?: string;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

const TITULO_STATUS = ['pendente', 'pago', 'vencido', 'cancelado', 'parcial', 'pago_atraso'] as const;
const SORT_COLUMNS = [
  'id', 'cliente_id', 'plano_id', 'banco_id', 'contrato_id', 'numero_titulo', 'valor',
  'data_vencimento', 'status', 'pago', 'data_pagamento', 'valor_pago', 'valor_aberto',
  'charge_id', 'nosso_numero', 'created_at', 'updated_at', 'is_avulso', 'empresa_id',
] as const;

const BANCO_SELECT = {
  id: true, nome: true, tipo_banco: true, logo: true, codigo: true, api_key: true, sandbox: true,
} as const;

const NOTA_RELATION = 'nfse_notas_fiscais_financeiro_titulos_nota_fiscal_idTonfse_notas_fiscais' as const;

const detalheInclude = {
  clientes: true,
  cadastros_planos: true,
  cadastros_bancos: { select: BANCO_SELECT },
  contratos: { include: { cadastros_bancos: { select: BANCO_SELECT } } },
  [NOTA_RELATION]: true,
} as const;

type TituloComRelacoesRow = {
  id: number;
  banco_id: number;
  valor?: unknown;
  data_vencimento?: Date | string | null;
  charge_id?: string | null;
  empresa_id?: number | null;
  status?: string;
  pago?: boolean;
  clientes?: unknown;
  cadastros_planos?: unknown;
  cadastros_bancos?: { id: number } | null;
  contratos?: {
    clientes?: unknown;
    cadastros_planos?: unknown;
    cadastros_bancos?: { id: number } | null;
  } | null;
  [NOTA_RELATION]?: unknown;
};

function shapeTitulo<T extends TituloComRelacoesRow>(row: T) {
  const contrato = row.contratos ?? null;
  let banco = row.cadastros_bancos ?? null;
  let bancoId = row.banco_id;
  if (!banco && contrato?.cadastros_bancos) {
    banco = contrato.cadastros_bancos;
    bancoId = contrato.cadastros_bancos.id;
  }
  const nota = row[NOTA_RELATION] ?? null;
  const shaped = {
    ...row,
    banco_id: bancoId,
    cliente: row.clientes ?? null,
    plano: row.cadastros_planos ?? null,
    banco,
    contrato: contrato
      ? {
          ...contrato,
          cliente: contrato.clientes ?? null,
          plano: contrato.cadastros_planos ?? null,
          bancoBoleto: contrato.cadastros_bancos ?? null,
        }
      : null,
    nota_fiscal: nota,
  };

  return withToJson(Object.assign(shaped, {
    async marcarComoPago(valorPago?: number, dataPagamento?: Date, skipLiquidacaoBanco = false) {
      const valor = valorPago ?? Number(shaped.valor);
      const agora = new Date();
      let data: Date;
      if (dataPagamento) {
        const dp = new Date(dataPagamento);
        if (dp.getHours() === 0 && dp.getMinutes() === 0 && dp.getSeconds() === 0 && dp.getMilliseconds() === 0) {
          data = new Date(dp.getFullYear(), dp.getMonth(), dp.getDate(), agora.getHours(), agora.getMinutes(), agora.getSeconds(), agora.getMilliseconds());
        } else {
          data = new Date(dp.getFullYear(), dp.getMonth(), dp.getDate(), dp.getHours(), dp.getMinutes(), dp.getSeconds(), dp.getMilliseconds());
        }
      } else {
        data = new Date(agora);
      }
      const valorTotal = Number(shaped.valor);
      const valorPagoNum = Number(valor);
      const novoStatus = resolveStatusPagamentoTitulo(shaped.data_vencimento as Date, data, valorPagoNum, valorTotal);
      const parcial = novoStatus === 'parcial';
      const valorAberto = parcial ? valorTotal - valorPagoNum : null;
      const estaPago = !parcial;
      await prisma.financeiro_titulos.update({
        where: { id: shaped.id },
        data: {
          pago: estaPago,
          data_pagamento: data,
          valor_pago: valor,
          valor_aberto: valorAberto,
          status: novoStatus,
        },
      });
      Object.assign(shaped, { pago: estaPago, data_pagamento: data, valor_pago: valor, valor_aberto: valorAberto, status: novoStatus });
      if (estaPago && (novoStatus === 'pago' || novoStatus === 'pago_atraso')) {
        const { metrics, isMetricsEnabled } = await import('../../../utils/metrics');
        if (isMetricsEnabled() && metrics) metrics.businessBoletosPagos.inc();
      }
      if (shaped.charge_id && !skipLiquidacaoBanco) {
        try {
          const bancoAtual = shaped.banco ?? await prisma.cadastros_bancos.findUnique({ where: { id: shaped.banco_id } });
          if (!bancoAtual) return;
          shaped.banco = bancoAtual;
          const resultado = await BancoApiService.liquidarTitulo(shaped as unknown as Parameters<typeof BancoApiService.liquidarTitulo>[0]);
          if (!resultado.success) {
            logger.warn('Falha ao liquidar título no banco externo', { titulo_id: shaped.id, charge_id: shaped.charge_id, message: resultado.message });
          }
        } catch (error) {
          logger.error('Erro ao integrar com banco externo', {
            titulo_id: shaped.id,
            charge_id: shaped.charge_id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }
    },
    async desmarcarPago() {
      await prisma.financeiro_titulos.update({
        where: { id: shaped.id },
        data: { pago: false, data_pagamento: null, valor_pago: null, status: 'pendente' },
      });
      Object.assign(shaped, { pago: false, data_pagamento: null, valor_pago: null, status: 'pendente' });
    },
  }));
}

function statusFilter(term: string): Prisma.financeiro_titulosWhereInput {
  const matches = enumMatches(TITULO_STATUS, term);
  return matches.length > 0 ? { status: { in: matches } } : { id: { lt: 0 } };
}

function legacyOrder(order: unknown): Prisma.financeiro_titulosOrderByWithRelationInput[] | undefined {
  if (!Array.isArray(order)) return undefined;
  const mapped: Prisma.financeiro_titulosOrderByWithRelationInput[] = [];
  for (const item of order) {
    if (!Array.isArray(item) || typeof item[0] !== 'string') continue;
    const dir = sortDirection(String(item[1] ?? 'DESC'));
    if ((SORT_COLUMNS as readonly string[]).includes(item[0])) mapped.push({ [item[0]]: dir });
  }
  return mapped.length > 0 ? mapped : undefined;
}

export class TituloService {
  static async getClienteIdsByStatus(statuses: string[]): Promise<number[]> {
    const titulos = await prisma.financeiro_titulos.findMany({
      where: { status: { in: statuses as typeof TITULO_STATUS[number][] } },
      select: { cliente_id: true },
      distinct: ['cliente_id'],
    });
    return titulos.map((titulo) => titulo.cliente_id);
  }

  static async list(filters: ListTitulosFilters) {
    const {
      page = 1, limit = 10, status, cliente_id, data_vencimento_inicio, data_vencimento_fim,
      data_pagamento_inicio, data_pagamento_fim, search, searchField, sortColumn,
      sortDirection: direction, empresa_id,
    } = filters;
    const limitNum = Number(limit);
    const pageNum = Number(page);
    const offset = (pageNum - 1) * limitNum;
    const and: Prisma.financeiro_titulosWhereInput[] = [];

    if (empresa_id !== undefined) and.push({ empresa_id });
    if (status) {
      if (typeof status === 'string' && status.startsWith('!')) {
        const excluded = status.substring(1);
        if ((TITULO_STATUS as readonly string[]).includes(excluded)) {
          and.push({ status: { not: excluded as (typeof TITULO_STATUS)[number] } });
        }
      } else if (typeof status === 'string' && status.includes(',')) {
        const statuses = status.split(',').map((item) => item.trim()).filter((item) => (TITULO_STATUS as readonly string[]).includes(item));
        if (statuses.length > 0) and.push({ status: { in: statuses as typeof TITULO_STATUS[number][] } });
      } else if ((TITULO_STATUS as readonly string[]).includes(status)) {
        and.push({ status: status as (typeof TITULO_STATUS)[number] });
      }
    }
    if (cliente_id) {
      const clienteIdNum = Number(cliente_id);
      if (!Number.isNaN(clienteIdNum)) and.push({ cliente_id: clienteIdNum });
    }
    const vencimento = dateBounds(data_vencimento_inicio, data_vencimento_fim);
    if (vencimento) and.push({ data_vencimento: vencimento });
    const pagamento = dateBounds(data_pagamento_inicio, data_pagamento_fim);
    if (pagamento) and.push({ data_pagamento: pagamento });

    if (search && String(search).trim()) {
      const term = String(search).trim();
      const termNum = Number(term);
      const isNumericSearch = term !== '' && !Number.isNaN(termNum);
      const field = typeof searchField === 'string' ? searchField : undefined;
      const orConditions: Prisma.financeiro_titulosWhereInput[] = [];
      const addMultiFieldSearch = () => {
        orConditions.push(
          { numero_titulo: { contains: term } },
          statusFilter(term),
          { charge_id: { contains: term } },
          { nosso_numero: { contains: term } },
          { clientes: { razao_social: { contains: term } } },
          { clientes: { nome_fantasia: { contains: term } } },
          { cadastros_planos: { nome_plano: { contains: term } } },
        );
        if (isNumericSearch) {
          orConditions.push(
            { id: termNum },
            { valor: termNum },
            { valor_pago: termNum },
            { contrato_id: termNum },
          );
        }
      };

      if (field) {
        switch (field) {
          case 'id':
            if (isNumericSearch) orConditions.push({ id: termNum });
            break;
          case 'numero_titulo':
            orConditions.push({ numero_titulo: { contains: term } });
            break;
          case 'status':
            orConditions.push(statusFilter(term));
            break;
          case 'charge_id':
            orConditions.push({ charge_id: { contains: term } });
            break;
          case 'nosso_numero':
            orConditions.push({ nosso_numero: { contains: term } });
            break;
          case 'contrato_id':
            if (isNumericSearch) orConditions.push({ contrato_id: termNum });
            break;
          case 'valor':
            if (isNumericSearch) {
              const range = numericBounds(term, 0.1);
              if (range) orConditions.push({ valor: range });
            }
            break;
          case 'valor_pago':
            if (isNumericSearch) {
              const range = numericBounds(term, 0.1);
              if (range) orConditions.push({ valor_pago: range });
            }
            break;
          case 'cliente':
            orConditions.push(
              { clientes: { razao_social: { contains: term } } },
              { clientes: { nome_fantasia: { contains: term } } },
            );
            break;
          case 'plano':
            orConditions.push({ cadastros_planos: { nome_plano: { contains: term } } });
            break;
          default:
            addMultiFieldSearch();
        }
      } else {
        addMultiFieldSearch();
      }

      and.push(orConditions.length > 0 ? { OR: orConditions } : { id: { lt: 0 } });
    }

    const where: Prisma.financeiro_titulosWhereInput = and.length > 0 ? { AND: and } : {};
    const dir = sortDirection(direction);
    const listInclude = {
      clientes: { select: { id: true, razao_social: true, nome_fantasia: true, cnpj: true, email: true } },
      cadastros_planos: { select: { id: true, nome_plano: true, valor_mensal: true } },
      cadastros_bancos: { select: BANCO_SELECT },
      [NOTA_RELATION]: { select: { id: true, numero: true, nfse_status: true } },
    };

    try {
      let rows;
      let count: number;
      if (sortColumn === 'valor_aberto') {
        const matching = await prisma.financeiro_titulos.findMany({ where, select: { id: true } });
        const pageIds = await orderPageBySql(
          'financeiro_titulos',
          'COALESCE(`valor_aberto`, `valor` - COALESCE(`valor_pago`, 0))',
          sqlDirection(direction),
          matching.map((item) => item.id),
          limitNum,
          offset,
        );
        count = matching.length;
        const found = pageIds.length
          ? await prisma.financeiro_titulos.findMany({ where: { id: { in: pageIds } }, include: listInclude })
          : [];
        rows = reorderByIds(found, pageIds);
      } else {
        let orderBy: Prisma.financeiro_titulosOrderByWithRelationInput = { id: 'desc' };
        if (sortColumn === 'cliente') orderBy = { clientes: { razao_social: dir } };
        else if (sortColumn === 'plano_nome') orderBy = { cadastros_planos: { nome_plano: dir } };
        else if (sortColumn === 'nfse_numero') orderBy = { [NOTA_RELATION]: { numero: dir } };
        else if (sortColumn === 'nfse_status') orderBy = { [NOTA_RELATION]: { nfse_status: dir } };
        else if (sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)) orderBy = { [sortColumn]: dir };
        else if (sortColumn) logger.warn('TituloService.list - Coluna de ordenação inválida', { column: sortColumn });

        [count, rows] = await Promise.all([
          prisma.financeiro_titulos.count({ where }),
          prisma.financeiro_titulos.findMany({
            where,
            include: listInclude,
            orderBy,
            take: limitNum,
            skip: offset,
          }),
        ]);
      }

      return {
        success: true,
        data: rows.map((row) => shapeTitulo(row)),
        pagination: buildPagination(pageNum, limitNum, count),
      };
    } catch (queryError: unknown) {
      const error = queryError instanceof Error ? queryError : new Error('Erro desconhecido');
      logger.error('TituloService.list - Erro na query', { error: error.message, sortColumn, sortDirection: direction });
      throw queryError;
    }
  }

  static async getById(id: string | number, _transaction?: unknown) {
    const titulo = await prisma.financeiro_titulos.findUnique({
      where: { id: Number(id) },
      include: detalheInclude,
    });
    return titulo ? shapeTitulo(titulo) : null;
  }

  static async getByIds(ids: number[], status?: string[]) {
    const where: Prisma.financeiro_titulosWhereInput = { id: { in: ids } };
    if (status && status.length > 0) {
      where.status = { in: status as typeof TITULO_STATUS[number][] };
    }
    const titulos = await prisma.financeiro_titulos.findMany({
      where,
      include: {
        clientes: true,
        cadastros_planos: true,
        cadastros_bancos: { select: BANCO_SELECT },
        contratos: { include: { cadastros_bancos: { select: BANCO_SELECT } } },
      },
    });

    const completos = [];
    for (const titulo of titulos) {
      let row: TituloComRelacoesRow = titulo;
      if (!row.cadastros_bancos && row.banco_id) {
        const banco = await prisma.cadastros_bancos.findUnique({
          where: { id: row.banco_id },
          select: BANCO_SELECT,
        });
        if (banco) row = { ...row, cadastros_bancos: banco };
      }
      completos.push(shapeTitulo(row));
    }
    return completos;
  }

  static async reloadTituloComRelacoes(titulo: { id: number }, _transaction?: unknown): Promise<void> {
    const atualizado = await TituloService.getById(titulo.id);
    if (atualizado) Object.assign(titulo, atualizado);
  }

  static async create(dadosTitulo: Prisma.financeiro_titulosUncheckedCreateInput, _transaction?: unknown) {
    return prisma.financeiro_titulos.create({ data: dadosTitulo });
  }

  static async update(id: string | number, dadosTitulo: Prisma.financeiro_titulosUncheckedUpdateInput) {
    const numericId = Number(id);
    const titulo = await prisma.financeiro_titulos.findUnique({ where: { id: numericId } });
    if (!titulo) throw new Error('Título não encontrado');
    await prisma.financeiro_titulos.update({ where: { id: numericId }, data: dadosTitulo });
    const atualizado = await TituloService.getById(numericId);
    if (!atualizado) throw new Error('Título não encontrado');
    return atualizado;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const titulo = await prisma.financeiro_titulos.findUnique({ where: { id: numericId } });
    if (!titulo) throw new Error('Título não encontrado');
    await prisma.financeiro_titulos.delete({ where: { id: numericId } });
    return titulo;
  }

  static async count(where?: unknown): Promise<number> {
    return prisma.financeiro_titulos.count({
      where: (toPrismaWhere(where) ?? {}) as Prisma.financeiro_titulosWhereInput,
    });
  }

  static async findAllWithFilters(
    where?: unknown,
    options?: { include?: unknown[]; order?: unknown; limit?: number; attributes?: string[] },
  ) {
    const prismaWhere = (toPrismaWhere(where) ?? {}) as Prisma.financeiro_titulosWhereInput;
    const orderBy = legacyOrder(options?.order) ?? [{ created_at: 'desc' as const }];
    const titulos = await prisma.financeiro_titulos.findMany({
      where: prismaWhere,
      include: {
        clientes: true,
        cadastros_planos: true,
        cadastros_bancos: { select: BANCO_SELECT },
        contratos: { include: { cadastros_bancos: { select: BANCO_SELECT } } },
      },
      orderBy,
      take: options?.limit,
    });

    return titulos.map((titulo) => shapeTitulo(titulo));
  }
}
