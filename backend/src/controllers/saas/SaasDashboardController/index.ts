import { Response } from 'express';
import { SaasDashboardService } from '../../../services/saas/SaasDashboardService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

export class SaasDashboardController {
  static async getDashboardData(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await SaasDashboardService.getDashboardData(startDate, endDate);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao obter dados do dashboard SaaS', 500, true);
    }
  }
}
