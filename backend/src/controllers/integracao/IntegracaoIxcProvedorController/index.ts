import { Request, Response } from 'express';
import * as Joi from 'joi';
import { IntegracaoIxcProvedorService } from '../../../services/integracao/IntegracaoIxcProvedorService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';
import { SistemaLogOperacionalQueryService } from '../../../services/sistema/SistemaLogOperacionalQueryService';
import { buildPagination } from '../../../utils/pagination';
import { resolveListEmpresaId } from '../../../utils/tenantUtils';

export class IntegracaoIxcProvedorController {
  private static upsertSchema = Joi.object({
    nome: Joi.string().max(200).required(),
    api_url: Joi.string().max(500).allow('', null),
    api_token: Joi.string().allow('', null),
    ativo: Joi.boolean().default(false),
  });

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);
      const ativo = queryString(req.query.ativo);
      const empresaId = getEmpresaIdOrNull(req);
      const result = await IntegracaoIxcProvedorService.list({
        search,
        searchField,
        ativo,
        page,
        limit,
        sortColumn,
        sortDirection,
        empresa_id: empresaId,
      });
      sendSuccess(res, result);
    } catch (error) {
      sendError(res, error, 'Erro ao listar integrações IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'list',
      });
    }
  }

  static async findAtivos(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const data = await IntegracaoIxcProvedorService.findAtivos(empresaId);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar integrações IXC ativas', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'findAtivos',
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const item = await IntegracaoIxcProvedorService.getById(id);
      if (!item) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }
      if (empresaId !== null && item.empresa_id !== null && item.empresa_id !== empresaId) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }
      sendSuccess(res, item);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'getById',
        id: req.params.id,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const value = await IntegracaoIxcProvedorController.upsertSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (value.ativo && !String(value.api_url ?? '').trim()) {
        sendValidationError(res, 'Dados inválidos', { api_url: ['Informe a URL da API do IXC'] });
        return;
      }
      if (value.ativo && !String(value.api_token ?? '').trim()) {
        sendValidationError(res, 'Dados inválidos', { api_token: ['Informe o token da API do IXC'] });
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const item = await IntegracaoIxcProvedorService.create(empresaId, value);

      try {
        await registrarCriacao(
          req,
          'IntegracaoIxcProvedor',
          item.id,
          item.toJSON() as Record<string, unknown>,
          undefined,
          empresaId ?? item.empresa_id ?? null
        );
      } catch {
        // não interromper
      }

      sendSuccess(res, item, 'Integração IXC Provedor criada com sucesso', 201);
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      sendError(res, error, 'Erro ao criar integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'create',
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const existing = await IntegracaoIxcProvedorService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }
      if (empresaId !== null && existing.empresa_id !== null && existing.empresa_id !== empresaId) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }

      const value = await IntegracaoIxcProvedorController.upsertSchema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (value.ativo) {
        const url = String(value.api_url ?? existing.api_url ?? '').trim();
        if (!url) {
          sendValidationError(res, 'Dados inválidos', { api_url: ['Informe a URL da API do IXC'] });
          return;
        }
        const hasToken = !!String(value.api_token ?? '').trim() || !!existing.api_token;
        if (!hasToken) {
          sendValidationError(res, 'Dados inválidos', { api_token: ['Informe o token da API do IXC'] });
          return;
        }
      }

      const item = await IntegracaoIxcProvedorService.update(id, value);

      try {
        await registrarAtualizacao(
          req,
          'IntegracaoIxcProvedor',
          item.id,
          existing.toJSON() as Record<string, unknown>,
          item.toJSON() as Record<string, unknown>,
          undefined,
          empresaId ?? item.empresa_id ?? null
        );
      } catch {
        // não interromper
      }

      sendSuccess(res, item, 'Integração IXC Provedor atualizada com sucesso');
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      sendError(res, error, 'Erro ao atualizar integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'update',
        id: req.params.id,
      });
    }
  }

  private static testSchema = Joi.object({
    api_url: Joi.string().max(500).allow('', null),
    api_token: Joi.string().allow('', null),
  });

  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const value = await IntegracaoIxcProvedorController.testSchema.validateAsync(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true,
      });

      const result = await IntegracaoIxcProvedorService.testById(Number(id), empresaId, value);
      if (result.success) {
        sendSuccess(res, result, result.message);
        return;
      }
      sendError(res, new Error(result.message), result.message, 400, false);
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      sendError(res, error, 'Erro ao testar integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'testConnection',
        id: req.params.id,
      });
    }
  }

  static async testConnectionWithCredentials(req: Request, res: Response): Promise<void> {
    try {
      const value = await Joi.object({
        api_url: Joi.string().max(500).required(),
        api_token: Joi.string().required(),
      }).validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      const result = await IntegracaoIxcProvedorService.testCredentials({
        apiUrl: value.api_url.trim().replace(/\/+$/, ''),
        apiToken: value.api_token.trim(),
      });

      if (result.success) {
        sendSuccess(res, result, result.message);
        return;
      }
      sendError(res, new Error(result.message), result.message, 400, false);
    } catch (error) {
      if (error instanceof Joi.ValidationError) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      sendError(res, error, 'Erro ao testar integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'testConnectionWithCredentials',
      });
    }
  }

  static async syncOrdemServicoCadastros(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const result = await IntegracaoIxcProvedorService.syncOrdemServicoCadastros(Number(id), empresaId);
      sendSuccess(res, result, result.message);
    } catch (error) {
      sendError(res, error, 'Erro ao sincronizar dados de OS do IXC', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'syncOrdemServicoCadastros',
        id: req.params.id,
      });
    }
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresaId = getEmpresaIdOrNull(req);
      const existing = await IntegracaoIxcProvedorService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }
      if (empresaId !== null && existing.empresa_id !== null && existing.empresa_id !== empresaId) {
        sendNotFound(res, 'Integração IXC Provedor não encontrada');
        return;
      }

      const before = existing.toJSON() as Record<string, unknown>;
      await IntegracaoIxcProvedorService.delete(id);

      try {
        await registrarExclusao(
          req,
          'IntegracaoIxcProvedor',
          existing.id,
          before,
          undefined,
          empresaId ?? existing.empresa_id ?? null
        );
      } catch {
        // não interromper
      }

      sendSuccess(res, undefined, 'Integração IXC Provedor excluída com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao excluir integração IXC Provedor', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'destroy',
        id: req.params.id,
      });
    }
  }

  static async listSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = resolveListEmpresaId(req);
      const { page, limit, search } = parseListQuery(req.query, { defaultLimit: 20, maxLimit: 100 });
      const eventType = queryString(req.query.event_type);

      if (empresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildPagination(page, limit, 0, { minLastPageWhenEmpty: 1 }),
        });
        return;
      }

      const offset = (page - 1) * limit;
      const { rows, count } = await SistemaLogOperacionalQueryService.listIxcOsSync({
        page,
        limit,
        offset,
        empresaId,
        search,
        eventType,
      });

      sendSuccess(res, {
        data: rows,
        pagination: buildPagination(page, limit, count, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de sincronização IXC', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'listSyncLogs',
      });
    }
  }

  static async syncOrdensServico(req: Request, res: Response): Promise<void> {
    try {
      const { IxcOsSchedulerRoutineService } = await import('../../../services/ordens/IxcOsSchedulerRoutineService');
      const resultado = await IxcOsSchedulerRoutineService.syncAllIntegracoes('manual');
      sendSuccess(res, resultado, resultado.message);
    } catch (error) {
      sendError(res, error, 'Erro ao sincronizar ordens de serviço com IXC', 500, true, {
        context: 'IntegracaoIxcProvedorController',
        action: 'syncOrdensServico',
      });
    }
  }
}
