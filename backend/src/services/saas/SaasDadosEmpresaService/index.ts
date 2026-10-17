import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { cache } from '../../../utils/cache';
import { buildSaasPagination } from '../../../utils/pagination';

const TENANT_LIKE_FIELDS = [
  'cnpj', 'razao_social', 'nome_fantasia', 'email', 'telefone', 'celular',
  'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
] as const;

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  created_at_inicio?: string;
  created_at_fim?: string;
  plano_id?: number;
}

export class SaasDadosEmpresaService {
  static async list(filters: ListFilters) {
    const {
      page = 1,
      limit = 20,
      search,
      searchField,
      sortColumn = 'id',
      sortDirection = 'desc',
      created_at_inicio,
      created_at_fim,
      plano_id,
    } = filters;

    const allowedColumns = [
      'id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'cidade', 'estado',
      'created_at', 'endereco', 'numero', 'complemento', 'bairro', 'telefone',
      'celular', 'bloqueado_por_atraso',
    ];

    let orderCol = allowedColumns.includes(sortColumn ?? '') ? sortColumn! : 'id';
    let orderDir: 'asc' | 'desc' = (sortDirection ?? 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    if (sortColumn === 'whatsapp') {
      orderCol = 'celular';
    } else if (sortColumn === 'ativo') {
      orderCol = 'bloqueado_por_atraso';
      orderDir = orderDir === 'asc' ? 'desc' : 'asc';
    }

    if (plano_id !== undefined && plano_id !== null && !Number.isNaN(plano_id)) {
      return { data: [], pagination: buildSaasPagination(page, limit, 0) };
    }

    const where: Prisma.sistema_tenantsWhereInput = {};
    if (created_at_inicio || created_at_fim) {
      where.created_at = {
        ...(created_at_inicio ? { gte: new Date(created_at_inicio) } : {}),
        ...(created_at_fim ? { lte: new Date(created_at_fim) } : {}),
      };
    }

    if (search) {
      const trimmed = String(search).trim();
      const field = searchField?.trim();
      if (field === 'todos' || !field) {
        const orConditions: Prisma.sistema_tenantsWhereInput[] = TENANT_LIKE_FIELDS.map((f) => ({
          [f]: { contains: search },
        }));
        const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
        if (numExact !== null) orConditions.push({ id: numExact });
        if (/^ativo$/i.test(trimmed)) orConditions.push({ bloqueado_por_atraso: false });
        if (/^inativo$/i.test(trimmed)) orConditions.push({ bloqueado_por_atraso: true });
        where.OR = orConditions;
      } else {
        const allowedFields = ['id', 'cnpj', 'razao_social', 'nome_fantasia', 'email', 'whatsapp', 'telefone', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
        if (allowedFields.includes(field)) {
          if (field === 'id') {
            const numExact = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
            where.id = numExact !== null ? numExact : { lt: 0 };
          } else if (field === 'whatsapp') {
            where.OR = [
              { telefone: { contains: search } },
              { celular: { contains: search } },
            ];
          } else {
            Object.assign(where, { [field]: { contains: search } });
          }
        }
      }
    }

    const [count, rows] = await Promise.all([
      prisma.sistema_tenants.count({ where }),
      prisma.sistema_tenants.findMany({
        where,
        orderBy: { [orderCol]: orderDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: rows,
      pagination: buildSaasPagination(page, limit, count),
    };
  }

  static async getById(id: number) {
    return prisma.sistema_tenants.findUnique({ where: { id } });
  }

  static async create(data: Prisma.sistema_tenantsUncheckedCreateInput) {
    return prisma.sistema_tenants.create({ data });
  }

  static async update(id: number, data: Prisma.sistema_tenantsUncheckedUpdateInput) {
    const empresa = await prisma.sistema_tenants.findUnique({ where: { id } });
    if (!empresa) throw new Error('Empresa (tenant) não encontrada');
    const payload: Prisma.sistema_tenantsUncheckedUpdateInput = { ...data };
    if (payload.responsavel_nome === '' || payload.responsavel_nome == null) {
      payload.responsavel_nome = empresa.responsavel_nome;
    }
    if (payload.responsavel_cpf === '' || payload.responsavel_cpf == null) {
      payload.responsavel_cpf = empresa.responsavel_cpf;
    }
    const updated = await prisma.sistema_tenants.update({ where: { id }, data: payload });
    cache.delete(`dados_empresa:config:${id}`);
    cache.delete('dados_empresa:config');
    return updated;
  }

  static async delete(id: number): Promise<void> {
    await prisma.sistema_tenants.delete({ where: { id } });
  }

  static async getDashboardStats() {
    const [total, totalUsuarios] = await Promise.all([
      prisma.sistema_tenants.count(),
      prisma.cadastros_usuarios.count(),
    ]);
    return { total, totalUsuarios };
  }
}
