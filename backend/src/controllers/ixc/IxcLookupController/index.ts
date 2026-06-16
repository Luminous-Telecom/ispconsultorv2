import { Request, Response } from 'express';
import { IxcOssChamadoService } from '../../../services/externos/IxcOssChamadoService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { parseListQuery } from '../../../utils/listQuery';

export class IxcLookupController {
  static async listEstruturas(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await IxcOssChamadoService.listResource('estrutura', 'descricao', {
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar estruturas', 500, true, {
        context: 'IxcLookupController',
        action: 'listEstruturas',
        query: req.query,
      });
    }
  }

  static async listAssuntos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await IxcOssChamadoService.listResource('su_oss_assunto', 'assunto', {
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar assuntos', 500, true, {
        context: 'IxcLookupController',
        action: 'listAssuntos',
        query: req.query,
      });
    }
  }

  static async listSetores(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await IxcOssChamadoService.listResource('empresa_setor', 'setor', {
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar setores', 500, true, {
        context: 'IxcLookupController',
        action: 'listSetores',
        query: req.query,
      });
    }
  }

  static async listFiliais(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await IxcOssChamadoService.listResource('filial', 'fantasia', {
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar filiais', 500, true, {
        context: 'IxcLookupController',
        action: 'listFiliais',
        query: req.query,
      });
    }
  }

  static async listTecnicos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
      const result = await IxcOssChamadoService.listResource(
        'funcionarios',
        'funcionario',
        {
          page,
          limit,
          search,
          sortColumn,
          sortDirection,
        },
        // Colaboradores > Ordem de serviço > Integração com agenda (mostrar na agenda)
        { integracao_calendario: 'S' }
      );
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar técnicos', 500, true, {
        context: 'IxcLookupController',
        action: 'listTecnicos',
        query: req.query,
      });
    }
  }
}
