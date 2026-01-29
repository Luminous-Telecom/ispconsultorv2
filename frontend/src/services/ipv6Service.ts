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
}

export const ipv6Service = ipv6ServiceInstance;
