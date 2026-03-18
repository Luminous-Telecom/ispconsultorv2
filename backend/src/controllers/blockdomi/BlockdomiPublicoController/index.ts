/**
 * Controller público do Blockdomi - API exclusiva para o site público.
 * Requer token de API (Bearer) gerado em Parâmetros → Usuários → Gerar token.
 */
import { Request, Response } from 'express';
import { BlockdomiPublicoService } from '../../../services/blockdomi/BlockdomiPublicoService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { logger } from '../../../utils/logger';

export class BlockdomiPublicoController {
  /**
   * GET /api/blockdomi-publico - Lista ofícios, datas de bloqueio e versões (sem domínios)
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      logger.info('[BlockdomiPublico] GET /api/blockdomi-publico - listar', {
        hasAuth: !!req.get('Authorization'),
        requestId: (req as Request & { requestId?: string }).requestId
      });
      const data = await BlockdomiPublicoService.listarDadosPublicos();
      sendSuccess(res, data, 'Dados do Blockdomi listados com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao listar dados do Blockdomi', 500, true, {
        context: 'BlockdomiPublicoController',
        action: 'listar'
      });
    }
  }

  /**
   * GET /api/blockdomi-publico/versao - Retorna apenas o número da versão atual
   */
  static async versaoAtual(req: Request, res: Response): Promise<void> {
    try {
      const versao = await BlockdomiPublicoService.getVersaoAtual();
      sendSuccess(res, { versao }, 'Versão atual obtida com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao obter versão atual', 500, true, {
        context: 'BlockdomiPublicoController',
        action: 'versaoAtual'
      });
    }
  }
}
