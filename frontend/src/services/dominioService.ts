/**
 * DominioService - Serviço usando BaseService
 */
import { BaseService, defaultApiClient } from './core';
import { Dominio, CreateDominio, UpdateDominio, DominioFilters, PaginatedResponse } from '../types';

class DominioServiceClass extends BaseService<Dominio, CreateDominio, UpdateDominio, DominioFilters> {
  constructor() {
    super(defaultApiClient, '/dominios');
  }
}

const dominioServiceInstance = new DominioServiceClass();

export class DominioService {
  static async list(filters: DominioFilters = {}): Promise<PaginatedResponse<Dominio>> {
    return dominioServiceInstance.list(filters);
  }

  static async getById(id: number): Promise<Dominio> {
    const response = await dominioServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async create(data: CreateDominio): Promise<Dominio> {
    const response = await dominioServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async update(id: number, data: UpdateDominio): Promise<Dominio> {
    const response = await dominioServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async delete(id: number): Promise<void> {
    await dominioServiceInstance.delete(id);
  }

  static async bulkCreate(payload: {
    items: string[];
    nome_oficio?: string | null;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    link_oficio_anatel?: string | null;
    link_oficio_justica?: string | null;
    link_planilha_dominios?: string | null;
  }): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ created: number; updated: number; skipped: number; errors: string[] }>('/dominios/bulk', payload, { timeout: 120000 });
    const data = (response as { data?: { created: number; updated: number; skipped: number; errors: string[] } }).data;
    return data ?? { created: 0, updated: 0, skipped: 0, errors: [] };
  }
}

export const dominioService = dominioServiceInstance;
