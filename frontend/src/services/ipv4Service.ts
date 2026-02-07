/**
 * IPv4Service - Serviço usando BaseService
 */
import { BaseService, defaultApiClient } from './core';
import { IPv4, CreateIPv4, UpdateIPv4, IPv4Filters, PaginatedResponse } from '../types';

class IPv4ServiceClass extends BaseService<IPv4, CreateIPv4, UpdateIPv4, IPv4Filters> {
  constructor() {
    super(defaultApiClient, '/ipv4');
  }
}

const ipv4ServiceInstance = new IPv4ServiceClass();

export class IPv4Service {
  static async list(filters: IPv4Filters = {}): Promise<PaginatedResponse<IPv4>> {
    return ipv4ServiceInstance.list(filters);
  }

  static async getById(id: number): Promise<IPv4> {
    const response = await ipv4ServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv4;
  }

  static async create(data: CreateIPv4): Promise<IPv4> {
    const response = await ipv4ServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv4;
  }

  static async update(id: number, data: UpdateIPv4): Promise<IPv4> {
    const response = await ipv4ServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv4;
  }

  static async delete(id: number): Promise<void> {
    await ipv4ServiceInstance.delete(id);
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
    const response = await defaultApiClient.post<{ created: number; updated: number; skipped: number; errors: string[] }>('/ipv4/bulk', payload, { timeout: 120000 });
    const data = (response as { data?: { created: number; updated: number; skipped: number; errors: string[] } }).data;
    return data ?? { created: 0, updated: 0, skipped: 0, errors: [] };
  }
}

export const ipv4Service = ipv4ServiceInstance;
