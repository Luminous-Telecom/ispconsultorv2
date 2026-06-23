import { Request, Response } from 'express';
import {
  IxcOssChamadoService,
  OSS_CHAMADO_ACOES,
  type OssChamadoAcao,
} from '../../../services/externos/IxcOssChamadoService';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';
import { parseListQuery } from '../../../utils/listQuery';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

export class IxcOssChamadoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const empresaId = getEmpresaIdOrNull(req);

      const result = await IxcOssChamadoService.list({
        page,
        limit,
        search,
        searchField,
        sortColumn,
        sortDirection,
      }, empresaId);

      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar ordens de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'list',
        query: req.query,
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const chamado = await IxcOssChamadoService.getById(id, empresaId);

      if (!chamado) {
        sendNotFound(res, 'Ordem de serviço não encontrada');
        return;
      }

      sendSuccess(res, chamado);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'getById',
        id: req.params.id,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcOssChamadoService.create(req.body, empresaId);
      sendSuccess(res, resultado, 'Ordem de serviço criada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'create',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const resultado = await IxcOssChamadoService.update(id, req.body, empresaId);
      sendSuccess(res, resultado, 'Ordem de serviço atualizada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao atualizar ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'update',
        id: req.params.id,
      });
    }
  }

  static async executeAcao(req: Request, res: Response): Promise<void> {
    try {
      const { id, acao } = req.params;

      if (!OSS_CHAMADO_ACOES.includes(acao as OssChamadoAcao)) {
        sendError(res, new Error('Ação inválida'), 'Ação inválida', 400);
        return;
      }

      const resultado = await IxcOssChamadoService.executeAcao(
        id,
        acao as OssChamadoAcao,
        req.body,
        getEmpresaIdOrNull(req)
      );

      sendSuccess(res, resultado, 'Ação executada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao executar ação na ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'executeAcao',
        id: req.params.id,
        acao: req.params.acao,
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      await IxcOssChamadoService.delete(id, empresaId);
      sendSuccess(res, undefined, 'Ordem de serviço excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir ordem de serviço', 500, true, {
        context: 'IxcOssChamadoController',
        action: 'delete',
        id: req.params.id,
      });
    }
  }
}
