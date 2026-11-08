import { Request, Response } from 'express';
import { CobrancaPainelService } from '../../../services/cobranca/CobrancaPainelService';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { sendError, sendForbidden, sendSuccess, sendValidationError } from '../../../utils/responseUtils';
import { resolveListEmpresaId } from '../../../utils/tenantUtils';

export class CobrancaPainelController {
  static async indicadores(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = resolveListEmpresaId(req);
      if (empresaId === false) {
        sendForbidden(res);
        return;
      }
      const mes = queryString(req.query.mes);
      if (mes && !/^\d{4}-\d{2}$/.test(mes)) {
        sendValidationError(res, 'Mês inválido');
        return;
      }
      const data = await CobrancaPainelService.indicadores(empresaId, mes);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao carregar indicadores de cobrança');
    }
  }

  static async agenda(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = resolveListEmpresaId(req);
      if (empresaId === false) {
        sendForbidden(res);
        return;
      }
      const list = parseListQuery(req.query, { defaultLimit: 15, maxLimit: 100 });
      const data = await CobrancaPainelService.agenda(empresaId, {
        dataInicio: list.data_inicio,
        dataFim: list.data_fim,
        search: list.search,
        searchField: list.searchField,
        sortColumn: list.sortColumn,
        sortDirection: list.sortDirection,
        page: list.page,
        limit: list.limit,
      });
      sendSuccess(res, data);
    } catch (error) {
      if (error instanceof Error && error.message === 'PERIODO_AGENDA_INVALIDO') {
        sendValidationError(res, 'O período da agenda pode ter no máximo 90 dias.');
        return;
      }
      sendError(res, error, 'Erro ao carregar a agenda de cobrança');
    }
  }
}
