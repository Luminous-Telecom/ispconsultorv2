import type { Prisma, sistema_tenants } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { buildPagination } from '../../../utils/pagination';

export interface ListEmpresasFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
}

export interface ListEmpresasResponse {
  success: boolean;
  data: sistema_tenants[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface CreateEmpresaData {
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  email: string;
  telefone?: string;
  celular?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string;
  responsavel_cpf?: string;
  responsavel_cargo?: string;
}

export class EmpresaService {
  static async list(filters: ListEmpresasFilters = {}): Promise<ListEmpresasResponse> {
    const { page = 1, limit = 15, search, searchField } = filters;
    const where: Prisma.sistema_tenantsWhereInput = {};

    if (search) {
      const searchCols = ['id', 'razao_social', 'nome_fantasia', 'cnpj', 'email', 'cidade'];
      const field = searchField && searchCols.includes(searchField) ? searchField : null;
      if (field) {
        if (field === 'id') {
          const n = parseInt(search, 10);
          if (!Number.isNaN(n)) where.id = n;
        } else {
          Object.assign(where, { [field]: { contains: search } });
        }
      } else {
        where.OR = [
          { razao_social: { contains: search } },
          { nome_fantasia: { contains: search } },
          { cnpj: { contains: search } },
        ];
      }
    }

    const [count, rows] = await Promise.all([
      prisma.sistema_tenants.count({ where }),
      prisma.sistema_tenants.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: rows,
      pagination: buildPagination(page, limit, count),
    };
  }

  static async getById(id: number): Promise<sistema_tenants | null> {
    return prisma.sistema_tenants.findUnique({ where: { id } });
  }

  static async create(dados: CreateEmpresaData): Promise<sistema_tenants> {
    return prisma.sistema_tenants.create({
      data: {
        ...dados,
        responsavel_cpf: dados.responsavel_cpf ?? '',
        inscricao_estadual: null,
        inscricao_municipal: null,
        responsavel_assinatura: null,
        logo: null,
        site: null,
      },
    });
  }

  static async update(id: number, dados: Partial<CreateEmpresaData>): Promise<sistema_tenants> {
    const empresa = await prisma.sistema_tenants.findUnique({ where: { id } });
    if (!empresa) throw new Error('Empresa não encontrada');
    const payload: Prisma.sistema_tenantsUncheckedUpdateInput = { ...dados };
    if (Object.prototype.hasOwnProperty.call(dados, 'responsavel_cpf')) {
      payload.responsavel_cpf = dados.responsavel_cpf ?? '';
    }
    return prisma.sistema_tenants.update({ where: { id }, data: payload });
  }

  static async delete(id: number): Promise<void> {
    const empresa = await prisma.sistema_tenants.findUnique({ where: { id } });
    if (!empresa) throw new Error('Empresa não encontrada');

    const totalUsuarios = await prisma.cadastros_usuarios.count({ where: { empresa_id: id } });
    if (totalUsuarios > 0) {
      throw new Error(`Não é possível excluir empresa com ${totalUsuarios} usuário(s) vinculado(s)`);
    }

    await prisma.sistema_tenants.delete({ where: { id } });
  }

  static async existsByCnpj(cnpj: string, excludeId?: number): Promise<boolean> {
    const empresa = await prisma.sistema_tenants.findFirst({
      where: {
        cnpj,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return !!empresa;
  }
}
