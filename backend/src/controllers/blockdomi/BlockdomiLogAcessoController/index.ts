import { Request, Response } from 'express';
import { BlockdomiLogAcessoService } from '../../../services/blockdomi/BlockdomiLogAcessoService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';

export class BlockdomiLogAcessoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 15;
      const search = req.query.search as string;
      const sortColumn = req.query.sortColumn as string;
      const sortDirection = req.query.sortDirection as string;
      const sucessoParam = req.query.sucesso as string;
      const sucesso = sucessoParam === 'true' ? true : sucessoParam === 'false' ? false : undefined;

      const result = await BlockdomiLogAcessoService.list({
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
        sucesso
      });

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de acesso', 500, true, {
        context: 'BlockdomiLogAcessoController',
        action: 'list'
      });
    }
  }
}
