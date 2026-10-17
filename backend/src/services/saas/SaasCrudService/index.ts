import { prisma } from '../../../db/prisma';
import { buildSaasPagination } from '../../../utils/pagination';

interface ListFilters {
  page?: number;
  limit?: number;
  search?: string;
  empresa_id?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  status?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  data_pagamento_inicio?: string;
  data_pagamento_fim?: string;
}

function emptyPage(filters: { page?: number; limit?: number }, limitDefault = 20) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? limitDefault;
  return { data: [] as any[], pagination: buildSaasPagination(page, limit, 0) };
}

export class SaasTipoCobrancaService {
  static async list(filters: ListFilters) { return emptyPage(filters); }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}

export class SaasDiasVencimentoService {
  static async list(filters: ListFilters) { return emptyPage(filters); }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
  static async getConfig(): Promise<any[]> { return []; }
  static async updateConfig(_dias: number[]): Promise<void> { return; }
}

export class SaasTituloService {
  static async list(filters: ListFilters) { return emptyPage(filters); }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}

export class SaasTituloResumoService {
  static async getResumo() {
    return { titulosPendentes: 0, titulosAtrasados: 0, totalRecebido: 0, mrr: 0 };
  }
}

async function getStatusEmpresa(empresaId: number) {
  const empresa = await prisma.sistema_tenants.findUnique({
    where: { id: empresaId },
    select: { bloqueado_por_atraso: true, data_fim_desbloqueio_manual: true },
  });
  return {
    bloqueado_por_atraso: !!empresa?.bloqueado_por_atraso,
    em_atraso: false,
    data_fim_desbloqueio_manual: empresa?.data_fim_desbloqueio_manual ?? null,
  };
}

export class SaasContratoService {
  static async list(filters: ListFilters) {
    const page = emptyPage(filters, 100);
    if (filters.empresa_id) {
      return { ...page, status_empresa: await getStatusEmpresa(filters.empresa_id) };
    }
    return page;
  }
  static async getById(_id: number): Promise<any> { return null; }
  static async create(_data: Record<string, unknown>): Promise<any> { return null; }
  static async update(_id: number, _data: Record<string, unknown>): Promise<void> { return; }
  static async delete(_id: number): Promise<void> { return; }
}
