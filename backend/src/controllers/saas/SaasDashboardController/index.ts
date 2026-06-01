import { Response } from 'express';
import { SaasDashboardService } from '../../../services/saas/SaasDashboardService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { queryString } from '../../../utils/listQuery';

export class SaasDashboardController {
  static async getDashboardData(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const startDate = queryString(req.query.startDate);
      const endDate = queryString(req.query.endDate);
      const data = await SaasDashboardService.getDashboardData(startDate, endDate);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao obter dados do dashboard SaaS', 500, true);
    }
  }

  static async getServerStats(_req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = await SaasDashboardService.getServerStats();
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao obter estatísticas do servidor', 500, true);
    }
  }
}
