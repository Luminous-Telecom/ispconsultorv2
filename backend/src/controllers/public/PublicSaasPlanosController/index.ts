import { Request, Response } from 'express';
import { SaasPlanoService } from '../../../services/saas/SaasPlanoService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';

export class PublicSaasPlanosController {
  static async listForHotsite(_req: Request, res: Response): Promise<void> {
    try {
      const planos = await SaasPlanoService.listForHotsite();
      sendSuccess(res, planos);
    } catch (err) {
      sendError(res, err, 'Erro ao listar planos do hotsite', 500, true);
    }
  }
}
