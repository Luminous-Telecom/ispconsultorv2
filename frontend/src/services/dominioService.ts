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
}

export const dominioService = dominioServiceInstance;
