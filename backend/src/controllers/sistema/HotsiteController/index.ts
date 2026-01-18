import { Request, Response } from 'express';
import { HotsiteService } from '../../../services/sistema/HotsiteService';
import { DadosEmpresaService } from '../../../services/sistema/DadosEmpresaService';
import { HotsiteTemplateService } from '../../../services/sistema/HotsiteTemplateService';
import { sendError, sendSuccess } from '../../../utils/responseUtils';
 
export class HotsiteController {
  // GET /api/hotsite (admin): retorna HTML bruto para edição
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const hotsite = await HotsiteService.getCurrent();
      const html = hotsite.ativo ? hotsite.html : '';
 
      sendSuccess(res, { html });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter hotsite', 500, true, {
        context: 'HotsiteController',
        action: 'get'
      });
    }
  }

  // GET /api/hotsite/public (público): retorna HTML renderizado com variáveis
  static async getPublic(req: Request, res: Response): Promise<void> {
    try {
      const hotsite = await HotsiteService.getCurrent();
      const raw = hotsite.ativo ? hotsite.html : '';

      const empresa = await DadosEmpresaService.findOne();
      const baseUrl = `${req.protocol}://${req.get('host') || ''}`;
      const vars = HotsiteTemplateService.buildVariablesMap(empresa, baseUrl);
      const html = HotsiteTemplateService.render(raw, vars);

      sendSuccess(res, { html });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter hotsite público', 500, true, {
        context: 'HotsiteController',
        action: 'getPublic'
      });
    }
  }

  // GET /api/hotsite/variaveis (admin): lista variáveis disponíveis
  static async variables(_req: Request, res: Response): Promise<void> {
    try {
      sendSuccess(res, HotsiteTemplateService.listVariables());
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter variáveis do hotsite', 500, true, {
        context: 'HotsiteController',
        action: 'variables'
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { html } = req.body as { html?: string };
      const updated = await HotsiteService.update(typeof html === 'string' ? html : '');
      sendSuccess(res, { html: updated.html }, 'Hotsite atualizado com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao atualizar hotsite', 500, true, {
        context: 'HotsiteController',
        action: 'update',
        body: req.body
      });
    }
  }
}

