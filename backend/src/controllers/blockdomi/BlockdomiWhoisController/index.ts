import { Request, Response } from 'express';
import { BlockdomiWhoisService } from '../../../services/blockdomi/BlockdomiWhoisService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';

export class BlockdomiWhoisController {
  static async consultar(req: Request, res: Response): Promise<void> {
    try {
      const ip = (req.params.ip || '').trim();
      if (!ip) {
        sendError(res, new Error('IP é obrigatório'), 'IP inválido', 400, false);
        return;
      }

      const result = await BlockdomiWhoisService.consultar(ip);
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao consultar Whois do IP', 500, true, {
        context: 'BlockdomiWhoisController',
        action: 'consultar'
      });
    }
  }
}
