import type { Prisma, sistema_tenants } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { cache } from '../../../utils/cache';
import { slugify } from '../../../utils/slugify';

export class DadosEmpresaService {
  static async findOne(empresaId?: number): Promise<sistema_tenants | null> {
    const cacheKey = empresaId != null ? `dados_empresa:config:${empresaId}` : 'dados_empresa:config';
    const cached = cache.get<sistema_tenants>(cacheKey);
    if (cached) return cached;

    const dados = empresaId != null
      ? await prisma.sistema_tenants.findUnique({ where: { id: empresaId } })
      : await prisma.sistema_tenants.findFirst({ orderBy: { id: 'asc' } });
    if (dados) cache.set(cacheKey, dados, 600000);
    return dados;
  }

  static async findBySlug(slug: string): Promise<sistema_tenants | null> {
    const all = await prisma.sistema_tenants.findMany();
    return all.find((empresa) => slugify(empresa.nome_fantasia || empresa.razao_social || '') === slug) ?? null;
  }

  static async create(dados: Prisma.sistema_tenantsUncheckedCreateInput): Promise<sistema_tenants> {
    const created = await prisma.sistema_tenants.create({ data: dados });
    cache.delete('dados_empresa:config');
    cache.delete(`dados_empresa:config:${created.id}`);
    return created;
  }

  static async update(dados: Prisma.sistema_tenantsUncheckedUpdateInput, empresaId?: number): Promise<sistema_tenants> {
    const dadosEmpresa = empresaId != null
      ? await prisma.sistema_tenants.findUnique({ where: { id: empresaId } })
      : await prisma.sistema_tenants.findFirst({ orderBy: { id: 'asc' } });
    if (!dadosEmpresa) throw new Error('Dados da empresa não encontrados');

    const updated = await prisma.sistema_tenants.update({
      where: { id: dadosEmpresa.id },
      data: dados,
    });
    cache.delete('dados_empresa:config');
    cache.delete(`dados_empresa:config:${updated.id}`);
    if (empresaId != null) cache.delete(`dados_empresa:config:${empresaId}`);
    return updated;
  }
}
