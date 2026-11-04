import type { Prisma } from '@prisma/client';
import { normalizeDnsIps } from '../../../utils/dnsIps';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildPagination } from '../../../utils/pagination';
import { dateBounds, sortDirection, toPrismaWhere } from '../../cadastros/prismaWhere';
import { cnpjLookupValues } from '../../../utils/cnpj';
import { buildPrismaColumnFilters, type ColumnFilterKind, type ColumnFilterRule } from '../../../utils/columnFilters';

export interface ListClientesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: string;
  cidade?: string;
  estado?: string;
  created_at_inicio?: string;
  created_at_fim?: string;
  sortColumn?: string;
  sortDirection?: string;
  columnFilters?: ColumnFilterRule[];
  empresa_id?: number;
}

const CLIENTE_COLUMNS = [
  'id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'telefone', 'whatsapp', 'cep',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'observacoes', 'ativo',
  'tipo_cobranca', 'valor_primeiro_titulo', 'recebe_email', 'recebe_sms', 'recebe_whatsapp',
  'created_at', 'updated_at', 'empresa_id',
] as const;

const SEARCH_FIELDS = ['id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'whatsapp', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as const;

const CLIENTE_FILTER_ALLOW: Record<string, ColumnFilterKind> = {
  id: 'number',
  cnpj: 'string',
  razao_social: 'string',
  nome_fantasia: 'string',
  email: 'string',
  telefone: 'string',
  whatsapp: 'string',
  cep: 'string',
  endereco: 'string',
  numero: 'string',
  complemento: 'string',
  bairro: 'string',
  cidade: 'string',
  estado: 'string',
  observacoes: 'string',
  ativo: 'boolean',
  tipo_cobranca: 'string',
  valor_primeiro_titulo: 'string',
  recebe_email: 'boolean',
  recebe_sms: 'boolean',
  recebe_whatsapp: 'boolean',
  created_at: 'date',
  updated_at: 'date',
};

const planoListaSelect = { id: true, nome_plano: true, valor_mensal: true, status: true } as const;
const tituloListaSelect = { id: true, numero_titulo: true, status: true, valor: true } as const;
const bancoTituloSelect = {
  id: true, nome: true, tipo_banco: true, client_id_producao: true, client_secret_producao: true,
} as const;

function planosDeContratos(contratos: Array<{ cadastros_planos?: { id: number } | null }> | undefined, limitFields: boolean) {
  const planos: Array<Record<string, unknown>> = [];
  const seen = new Set<number>();
  for (const contrato of contratos ?? []) {
    const plano = contrato.cadastros_planos;
    if (!plano || seen.has(plano.id)) continue;
    seen.add(plano.id);
    if (limitFields) {
      const item = plano as { id: number; nome_plano?: string; valor_mensal?: unknown; status?: string };
      planos.push({
        id: item.id,
        nome_plano: item.nome_plano,
        valor_mensal: item.valor_mensal,
        status: item.status,
      });
    } else {
      const full = plano as { contratos?: Array<{ clientes?: { id: number; razao_social: string } | null }> };
      const clientes: Array<{ id: number; razao_social: string }> = [];
      const clientesVistos = new Set<number>();
      for (const vinculo of full.contratos ?? []) {
        const cliente = vinculo.clientes;
        if (!cliente || clientesVistos.has(cliente.id)) continue;
        clientesVistos.add(cliente.id);
        clientes.push({ id: cliente.id, razao_social: cliente.razao_social });
      }
      planos.push({ ...plano, clientes });
    }
  }
  return planos;
}

function shapeCliente<T extends { contratos?: Array<{ cadastros_planos?: { id: number } | null }> }>(
  row: T,
  limitPlanoFields: boolean,
) {
  return { ...row, planos: planosDeContratos(row.contratos, limitPlanoFields) };
}

type ClienteComIpsDns = Prisma.clientesUncheckedCreateInput & {
  central_assinante_senha?: string | null;
  ips_dns?: string | null;
};

async function syncIpsDns(clienteId: number, empresaId: number | null, ipsDns: string | null | undefined): Promise<void> {
  if (ipsDns === undefined) return;
  const faixa = normalizeDnsIps(ipsDns);
  if (!faixa) {
    await prisma.blockdomi_ips_permitidos.deleteMany({ where: { cliente_id: clienteId } });
    return;
  }
  await prisma.blockdomi_ips_permitidos.upsert({
    where: { cliente_id: clienteId },
    create: { cliente_id: clienteId, faixa_ips: faixa, empresa_id: empresaId },
    update: { faixa_ips: faixa },
  });
}

export class ClienteService {
  static async list(filters: ListClientesFilters) {
    const { page = 1, limit = 15, search, searchField, ativo, cidade, estado, created_at_inicio, created_at_fim, sortColumn, sortDirection: direction, columnFilters, empresa_id } = filters;
    const offset = (page - 1) * limit;
    const where: Prisma.clientesWhereInput = {};

    if (empresa_id !== undefined) where.empresa_id = empresa_id;

    if (search) {
      const trimmed = String(search).trim();
      const field = searchField?.trim();
      if (field === 'todos' || !field) {
        const orConditions: Prisma.clientesWhereInput[] = [
          { cnpj: { contains: search } },
          { razao_social: { contains: search } },
          { nome_fantasia: { contains: search } },
          { email: { contains: search } },
          { telefone: { contains: search } },
          { whatsapp: { contains: search } },
          { endereco: { contains: search } },
          { numero: { contains: search } },
          { complemento: { contains: search } },
          { bairro: { contains: search } },
          { cidade: { contains: search } },
          { estado: { contains: search } },
        ];
        if (/^\d+$/.test(trimmed)) orConditions.push({ id: parseInt(trimmed, 10) });
        if (/^ativo$/i.test(trimmed)) orConditions.push({ ativo: true });
        if (/^inativo$/i.test(trimmed)) orConditions.push({ ativo: false });
        where.OR = orConditions;
      } else if ((SEARCH_FIELDS as readonly string[]).includes(field)) {
        if (field === 'id') {
          where.id = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : { lt: 0 };
        } else {
          (where as Record<string, unknown>)[field] = { contains: search };
        }
      }
    }

    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (cidade) where.cidade = { contains: cidade };
    if (estado) where.estado = estado.toUpperCase();
    const createdBounds = dateBounds(created_at_inicio, created_at_fim);
    if (createdBounds) where.created_at = createdBounds;
    const columnClauses = buildPrismaColumnFilters(columnFilters, CLIENTE_FILTER_ALLOW);
    if (columnClauses.length > 0) {
      const currentAnd = where.AND;
      const andList = Array.isArray(currentAnd) ? currentAnd : currentAnd ? [currentAnd] : [];
      where.AND = [...andList, ...(columnClauses as Prisma.clientesWhereInput[])];
    }

    const dir = sortDirection(direction);
    const orderBy: Prisma.clientesOrderByWithRelationInput =
      sortColumn && (CLIENTE_COLUMNS as readonly string[]).includes(sortColumn)
        ? { [sortColumn]: dir }
        : { id: 'desc' };
    if (sortColumn && !(CLIENTE_COLUMNS as readonly string[]).includes(sortColumn)) {
      logger.warn('ClienteService.list - Coluna de ordenação inválida', { column: sortColumn });
    }

    try {
      const [count, clientes] = await Promise.all([
        prisma.clientes.count({ where }),
        prisma.clientes.findMany({
          where,
          include: {
            contratos: { include: { cadastros_planos: { select: planoListaSelect } } },
            financeiro_titulos: { select: tituloListaSelect },
          },
          orderBy,
          take: limit,
          skip: offset,
        }),
      ]);
      return {
        success: true,
        data: clientes.map((cliente) => ({
          ...shapeCliente(cliente, true),
          titulos: cliente.financeiro_titulos,
        })),
        pagination: buildPagination(page, limit, count),
      };
    } catch (queryError: unknown) {
      const error = queryError instanceof Error ? queryError : new Error('Erro desconhecido');
      logger.error('ClienteService.list - Erro na query', { error: error.message, stack: error.stack });
      throw queryError;
    }
  }

  static async getById(id: string | number) {
    const cliente = await prisma.clientes.findUnique({
      where: { id: Number(id) },
      include: {
        blockdomi_ips_permitidos: { select: { faixa_ips: true } },
        contratos: {
          include: {
            cadastros_planos: {
              include: {
                contratos: { include: { clientes: { select: { id: true, razao_social: true } } } },
              },
            },
          },
        },
        financeiro_titulos: {
          include: {
            cadastros_planos: { select: { id: true, nome_plano: true } },
            cadastros_bancos: { select: bancoTituloSelect },
          },
        },
      },
    });
    if (!cliente) return null;
    const { blockdomi_ips_permitidos, ...rest } = cliente;
    return {
      ...shapeCliente(rest, false),
      ips_dns: blockdomi_ips_permitidos?.faixa_ips ?? '',
      titulos: cliente.financeiro_titulos.map((titulo) => ({
        ...titulo,
        plano: titulo.cadastros_planos,
        banco: titulo.cadastros_bancos,
      })),
    };
  }

  static async existsByCnpj(cnpj: string, excludeId?: number, empresaId?: number): Promise<boolean> {
    const cliente = await prisma.clientes.findFirst({
      where: {
        cnpj,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(empresaId !== undefined ? { empresa_id: empresaId } : {}),
      },
      select: { id: true },
    });
    return !!cliente;
  }

  static async create(dadosCliente: ClienteComIpsDns) {
    const { ips_dns, ...resto } = dadosCliente;
    const dadosParaSalvar = { ...resto };
    if (dadosParaSalvar.central_assinante_senha) {
      dadosParaSalvar.central_assinante_senha = await bcrypt.hash(dadosParaSalvar.central_assinante_senha, 10);
    }
    const cliente = await prisma.clientes.create({ data: dadosParaSalvar });
    await syncIpsDns(cliente.id, cliente.empresa_id ?? null, ips_dns);
    return cliente;
  }

  static async update(id: string | number, dadosCliente: Prisma.clientesUncheckedUpdateInput & { central_assinante_senha?: string | null; ips_dns?: string | null }) {
    const numericId = Number(id);
    const cliente = await prisma.clientes.findUnique({ where: { id: numericId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const { ips_dns, ...resto } = dadosCliente;
    const dadosParaSalvar = { ...resto };
    if (dadosParaSalvar.central_assinante_senha !== undefined) {
      const senha = dadosParaSalvar.central_assinante_senha;
      if (typeof senha === 'string' && senha.trim() !== '') {
        dadosParaSalvar.central_assinante_senha = await bcrypt.hash(senha, 10);
      } else {
        delete dadosParaSalvar.central_assinante_senha;
      }
    }

    await prisma.clientes.update({ where: { id: numericId }, data: dadosParaSalvar });
    await syncIpsDns(numericId, cliente.empresa_id ?? null, ips_dns);
    const atualizado = await ClienteService.getById(numericId);
    if (!atualizado) throw new Error('Cliente não encontrado');
    return atualizado;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const cliente = await prisma.clientes.findUnique({ where: { id: numericId } });
    if (!cliente) throw new Error('Cliente não encontrado');

    const titulosCount = await prisma.financeiro_titulos.count({ where: { cliente_id: numericId } });
    if (titulosCount > 0) {
      throw new Error('Não é possível excluir cliente com títulos associados.');
    }

    await prisma.clientes.delete({ where: { id: numericId } });
    return cliente;
  }

  static async count(where?: unknown): Promise<number> {
    return prisma.clientes.count({
      where: (toPrismaWhere(where) ?? {}) as Prisma.clientesWhereInput,
    });
  }

  static async findAllWithFilters(
    where?: unknown,
    options?: { orderBy?: Prisma.clientesOrderByWithRelationInput; take?: number; select?: Prisma.clientesSelect },
  ) {
    return prisma.clientes.findMany({
      where: (toPrismaWhere(where) ?? {}) as Prisma.clientesWhereInput,
      select: options?.select,
      orderBy: options?.orderBy ?? { created_at: 'desc' },
      take: options?.take,
    });
  }

  static async findByCnpj(cnpj: string, empresaId?: number) {
    const formatos = cnpjLookupValues(cnpj);
    const cliente = await prisma.clientes.findFirst({
      where: {
        cnpj: { in: [...new Set(formatos)] },
        ...(empresaId !== undefined ? { empresa_id: empresaId } : {}),
      },
      include: {
        financeiro_titulos: true,
        contratos: { include: { cadastros_planos: true } },
      },
    });
    if (!cliente) return null;
    return {
      ...shapeCliente(cliente, false),
      titulos: cliente.financeiro_titulos,
    };
  }

  static async findAtivos(empresaId?: number) {
    return prisma.clientes.findMany({
      where: {
        ativo: true,
        ...(empresaId !== undefined ? { empresa_id: empresaId } : {}),
      },
      orderBy: { razao_social: 'asc' },
    });
  }
}
