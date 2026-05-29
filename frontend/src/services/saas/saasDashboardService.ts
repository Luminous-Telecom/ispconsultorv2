import { defaultApiClient } from '../core';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES } from '../../utils/apiErrorHelper';
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
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.SAAS_DASHBOARD_LOAD_ERROR));
  }
}
