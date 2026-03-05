import { defaultApiClient } from '../core';
import type { DashboardData } from '../dashboardService';

export interface SaasDashboardFilters {
  startDate?: string;
  endDate?: string;
}

export class SaasDashboardService {
  static async getDashboardData(filters?: SaasDashboardFilters): Promise<DashboardData> {
    const response = await defaultApiClient.get<DashboardData>('/saas/dashboard', {
      params: filters,
    });
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Erro ao carregar dados do dashboard SaaS');
  }
}
