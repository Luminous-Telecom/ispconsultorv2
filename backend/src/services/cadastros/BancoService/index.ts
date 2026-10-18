import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { cache } from '../../../utils/cache';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { BancoApiService } from '../../bancos/BancoApiService';
import { NFSeConfigService } from '../../nfse/NFSeConfigService';
import { enumMatches, sortDirection, toPrismaWhere } from '../prismaWhere';

export interface ListBancosFilters {
  search?: string;
  searchField?: string;
  status?: string;
  tipo_banco?: string;
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: string;
  empresa_id?: number;
}

const TIPO_BANCO = ['efi', 'asaas', 'bancario', 'outros'] as const;
const SORT_COLUMNS = [
  'id', 'nome', 'codigo', 'descricao', 'ativo', 'tipo_banco', 'sandbox', 'created_at', 'updated_at', 'empresa_id',
] as const;

/** Escalares de `cadastros_bancos` — ignora campos fantasma do frontend (ex.: layout_carne). */
const BANCO_WRITE_FIELDS = [
  'nome', 'codigo', 'descricao', 'ativo', 'tipo_banco', 'api_url', 'api_key', 'api_secret', 'sandbox',
  'identificador_conta', 'client_id_producao', 'client_secret_producao', 'url_retorno', 'webhook_secret',
  'repassar_email_cliente', 'percentual_multa', 'percentual_juros', 'desconto_tipo', 'desconto_valor',
  'contra_apresentacao', 'recalcular_segunda_via', 'maximo_dias_recalcular', 'layout_web', 'layout_pdf',
  'local_pagamento', 'dados_avalista', 'exibir_mes_referente', 'taxa_cobranca', 'incluir_taxa',
  'observacao_linha_1', 'observacao_linha_2', 'observacao_linha_3', 'observacao_linha_4',
  'instrucao_linha_1', 'instrucao_linha_2', 'instrucao_linha_3', 'instrucao_linha_4', 'instrucao_linha_5',
  'configuracoes', 'logo', 'empresa_id', 'usar_integracao_banco_nfse',
] as const;

const BANCO_PADRAO: Record<string, Record<string, unknown>> = {
  efi: {
    percentual_multa: 2, percentual_juros: 1, contra_apresentacao: false, recalcular_segunda_via: true,
    maximo_dias_recalcular: 30, exibir_mes_referente: true, incluir_taxa: true, taxa_cobranca: 3.5,
  },
  asaas: {
    percentual_multa: 2, percentual_juros: 1, contra_apresentacao: false, recalcular_segunda_via: true,
    maximo_dias_recalcular: 30, exibir_mes_referente: true, incluir_taxa: true, taxa_cobranca: 3.5,
  },
  bancario: {
    percentual_multa: 2, percentual_juros: 1, contra_apresentacao: true, recalcular_segunda_via: false,
    exibir_mes_referente: false, incluir_taxa: false,
  },
  outros: {
    percentual_multa: 2, percentual_juros: 1, contra_apresentacao: false, recalcular_segunda_via: false,
    exibir_mes_referente: false, incluir_taxa: false,
  },
};

function aplicarPadraoCreate(dados: Record<string, unknown>) {
  const tipo = String(dados.tipo_banco ?? 'bancario');
  const padrao = BANCO_PADRAO[tipo] ?? BANCO_PADRAO.outros;
  const merged: Record<string, unknown> = { ...dados, ...padrao, tipo_banco: tipo };
  if (tipo !== 'asaas') merged.usar_integracao_banco_nfse = false;
  const codigo = BancoApiService.getCodigoBanco(tipo);
  if (codigo) merged.codigo = codigo;
  return merged as Prisma.cadastros_bancosUncheckedCreateInput;
}

function shapeBanco<T extends { financeiro_titulos?: unknown }>(row: T) {
  return { ...row, titulos: row.financeiro_titulos ?? [] };
}

export class BancoService {
  static async findAsaasNFSeIntegracao(empresaId?: number | null, _transaction?: unknown) {
    const where: Prisma.cadastros_bancosWhereInput = {
      ativo: true,
      tipo_banco: 'asaas',
      usar_integracao_banco_nfse: true,
      api_key: { not: null },
    };
    if (empresaId != null) {
      where.OR = [{ empresa_id: empresaId }, { empresa_id: null }];
    }
    return prisma.cadastros_bancos.findFirst({ where, orderBy: { id: 'asc' } });
  }

  private static prepararDadosBanco(dadosBanco: Record<string, unknown>) {
    const filtrados: Record<string, unknown> = {};
    for (const key of BANCO_WRITE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(dadosBanco, key) && dadosBanco[key] !== undefined) {
        filtrados[key] = dadosBanco[key];
      }
    }
    if (filtrados.tipo_banco && filtrados.tipo_banco !== 'asaas') {
      filtrados.usar_integracao_banco_nfse = false;
    }
    return filtrados;
  }

  private static async sincronizarNFSeAsaas(banco: { tipo_banco: string; usar_integracao_banco_nfse: boolean; api_key: string | null; sandbox: boolean; empresa_id: number | null }) {
    if (banco.tipo_banco !== 'asaas' || !banco.usar_integracao_banco_nfse) return;
    if (!banco.api_key) {
      throw new Error('API Key do Asaas é obrigatória para usar a integração do banco na NFS-e.');
    }
    await NFSeConfigService.update({
      provider: 'ASAAS',
      asaas_api_key: null,
      asaas_sandbox: banco.sandbox,
    }, banco.empresa_id);
  }

  static async findAtivos(empresaId?: number) {
    const cacheKey = `bancos:ativos:${empresaId || 0}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached as Awaited<ReturnType<typeof prisma.cadastros_bancos.findMany>>;

    const bancos = await prisma.cadastros_bancos.findMany({
      where: { ativo: true, ...(empresaId !== undefined ? { empresa_id: empresaId } : {}) },
      include: { financeiro_titulos: true },
      orderBy: { nome: 'asc' },
    });
    const shaped = bancos.map(shapeBanco);
    cache.set(cacheKey, shaped, 600000);
    return shaped;
  }

  static async list(filters: ListBancosFilters) {
    const { search, searchField, status, tipo_banco, page = 1, limit = 15, sortColumn, sortDirection: direction, empresa_id } = filters;
    const where: Prisma.cadastros_bancosWhereInput = {};
    if (empresa_id !== undefined) where.empresa_id = empresa_id;

    if (search) {
      const numExact = /^\d+$/.test(search) ? parseInt(search, 10) : null;
      let orConditions: Prisma.cadastros_bancosWhereInput[] = [];
      if (searchField === 'id') {
        orConditions = numExact !== null ? [{ id: numExact }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'nome' || searchField === 'descricao') {
        orConditions = [{ [searchField]: { contains: search } }];
      } else if (searchField === 'tipo_banco') {
        const matches = enumMatches(TIPO_BANCO, search);
        orConditions = matches.length ? [{ tipo_banco: { in: matches } }] : [{ id: { lt: 0 } }];
      } else if (searchField === 'sandbox' || searchField === 'ativo') {
        const flag = /^(1|true|sim|ativo)$/i.test(search) ? true : /^(0|false|nao|não|inativo)$/i.test(search) ? false : null;
        orConditions = flag === null ? [{ id: { lt: 0 } }] : [{ [searchField]: flag }];
      } else {
        orConditions = [
          { nome: { contains: search } },
          { descricao: { contains: search } },
        ];
        const tipos = enumMatches(TIPO_BANCO, search);
        if (tipos.length) orConditions.push({ tipo_banco: { in: tipos } });
        if (numExact !== null) orConditions.unshift({ id: numExact });
      }
      where.OR = orConditions;
    }

    if (status) where.ativo = status === 'ativo';
    if (tipo_banco && (TIPO_BANCO as readonly string[]).includes(tipo_banco)) {
      where.tipo_banco = tipo_banco as (typeof TIPO_BANCO)[number];
    }

    const dir = sortDirection(direction);
    const orderBy: Prisma.cadastros_bancosOrderByWithRelationInput =
      sortColumn && (SORT_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };
    if (sortColumn && !(SORT_COLUMNS as readonly string[]).includes(sortColumn)) {
      logger.warn('BancoService.list - Coluna de ordenação inválida', { column: sortColumn });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    try {
      const [count, bancos] = await Promise.all([
        prisma.cadastros_bancos.count({ where }),
        prisma.cadastros_bancos.findMany({
          where,
          orderBy,
          take: limitNum,
          skip: (pageNum - 1) * limitNum,
          include: { financeiro_titulos: true },
        }),
      ]);
      return {
        success: true,
        data: bancos.map(shapeBanco),
        pagination: buildPagination(pageNum, limitNum, count),
      };
    } catch (queryError: unknown) {
      const error = queryError instanceof Error ? queryError : new Error('Erro desconhecido');
      logger.error('BancoService.list - Erro na query', { error: error.message });
      throw queryError;
    }
  }

  static async getById(id: string | number) {
    const banco = await prisma.cadastros_bancos.findUnique({
      where: { id: Number(id) },
      include: { financeiro_titulos: true },
    });
    return banco ? shapeBanco(banco) : null;
  }

  static async findFirstAtivo() {
    return prisma.cadastros_bancos.findFirst({
      where: { ativo: true },
      orderBy: { id: 'desc' },
    });
  }

  static async existsByName(nome: string, excludeId?: number): Promise<boolean> {
    const banco = await prisma.cadastros_bancos.findFirst({
      where: { nome, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    return !!banco;
  }

  static async create(dadosBanco: Record<string, unknown>) {
    const preparados = BancoService.prepararDadosBanco(dadosBanco);
    const data = aplicarPadraoCreate(preparados);
    const banco = await prisma.cadastros_bancos.create({ data });
    try {
      await BancoService.sincronizarNFSeAsaas(banco);
    } catch (error) {
      await prisma.cadastros_bancos.delete({ where: { id: banco.id } });
      throw error;
    }
    return BancoService.getById(banco.id);
  }

  static async update(id: string | number, dadosBanco: Record<string, unknown>) {
    const numericId = Number(id);
    const banco = await prisma.cadastros_bancos.findUnique({ where: { id: numericId } });
    if (!banco) throw new Error('Banco não encontrado');

    const preparados = BancoService.prepararDadosBanco(dadosBanco);
    if (preparados.tipo_banco) {
      const codigo = BancoApiService.getCodigoBanco(String(preparados.tipo_banco));
      if (codigo) preparados.codigo = codigo;
    }

    const atualizado = await prisma.cadastros_bancos.update({
      where: { id: numericId },
      data: preparados as Prisma.cadastros_bancosUncheckedUpdateInput,
    });
    try {
      await BancoService.sincronizarNFSeAsaas(atualizado);
    } catch (error) {
      await prisma.cadastros_bancos.update({
        where: { id: numericId },
        data: {
          nome: banco.nome,
          codigo: banco.codigo,
          descricao: banco.descricao,
          ativo: banco.ativo,
          tipo_banco: banco.tipo_banco,
          usar_integracao_banco_nfse: banco.usar_integracao_banco_nfse,
          api_key: banco.api_key,
          sandbox: banco.sandbox,
        },
      });
      throw error;
    }

    if (dadosBanco.ativo !== undefined) cache.delete('bancos:ativos');
    return BancoService.getById(numericId);
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const banco = await prisma.cadastros_bancos.findUnique({ where: { id: numericId } });
    if (!banco) throw new Error('Banco não encontrado');
    const titulosCount = await prisma.financeiro_titulos.count({ where: { banco_id: numericId } });
    if (titulosCount > 0) throw new Error('Não é possível excluir banco com títulos associados.');
    await prisma.cadastros_bancos.delete({ where: { id: numericId } });
    cache.delete('bancos:ativos');
    return banco;
  }

  static async count(where?: unknown): Promise<number> {
    return prisma.cadastros_bancos.count({
      where: (toPrismaWhere(where) ?? {}) as Prisma.cadastros_bancosWhereInput,
    });
  }
}
