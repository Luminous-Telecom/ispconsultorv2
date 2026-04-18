/**
 * IPv6Service - Serviço usando BaseService
 */
import { BaseService, defaultApiClient } from './core';
import { IPv6, CreateIPv6, UpdateIPv6, IPv6Filters, PaginatedResponse } from '../types';

class IPv6ServiceClass extends BaseService<IPv6, CreateIPv6, UpdateIPv6, IPv6Filters> {
  constructor() {
    super(defaultApiClient, '/ipv6');
  }
}

const ipv6ServiceInstance = new IPv6ServiceClass();

export class IPv6Service {
  static async list(filters: IPv6Filters = {}): Promise<PaginatedResponse<IPv6>> {
    return ipv6ServiceInstance.list(filters);
  }

  static async getById(id: number): Promise<IPv6> {
    const response = await ipv6ServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv6;
  }

  static async create(data: CreateIPv6): Promise<IPv6> {
    const response = await ipv6ServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv6;
  }

  static async update(id: number, data: UpdateIPv6): Promise<IPv6> {
    const response = await ipv6ServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as IPv6;
  }

  static async delete(id: number): Promise<void> {
    await ipv6ServiceInstance.delete(id);
  }

  static async bulkDelete(ids: number[]): Promise<{ deleted: number; versao: string }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ deleted: number; versao: string }>('/ipv6/bulk-delete', { ids });
    const data = (response as { data?: { deleted: number; versao: string } }).data;
    return data ?? { deleted: 0, versao: '' };
  }

  static async bulkCreate(payload: {
    items: string[];
    nome_oficio?: string | null;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    link_oficio_anatel?: string | null;
    link_oficio_justica?: string | null;
    link_planilha_dominios?: string | null;
    numero_sei_anatel?: string | null;
  }): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ created: number; updated: number; skipped: number; errors: string[] }>('/ipv6/bulk', payload, { timeout: 120000 });
    const data = (response as { data?: { created: number; updated: number; skipped: number; errors: string[] } }).data;
    return data ?? { created: 0, updated: 0, skipped: 0, errors: [] };
  }
}

export const ipv6Service = ipv6ServiceInstance;
