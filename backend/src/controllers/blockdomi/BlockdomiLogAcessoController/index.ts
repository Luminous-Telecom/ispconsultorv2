import { Request, Response } from 'express';
import { BlockdomiLogAcessoService } from '../../../services/blockdomi/BlockdomiLogAcessoService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { resolveListEmpresaId } from '../../../utils/tenantUtils';
import { parseListQuery, parseTriStateBoolean, queryString } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';

export class BlockdomiLogAcessoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const sucesso = parseTriStateBoolean(req.query.sucesso);
      const origemRaw = queryString(req.query.origem);
      const origem =
        origemRaw === 'api_txt' || origemRaw === 'sistema' ? (origemRaw as 'api_txt' | 'sistema') : undefined;

      const listEmpresaId = resolveListEmpresaId(req);
      if (listEmpresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildPagination(page, limit, 0, { minLastPageWhenEmpty: 1 }),
        });
        return;
      }

      const result = await BlockdomiLogAcessoService.list({
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
        sucesso,
        origem,
        ...(listEmpresaId != null ? { empresa_id: listEmpresaId } : {}),
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
