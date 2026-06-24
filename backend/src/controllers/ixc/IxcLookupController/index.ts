import { Request, Response } from 'express';
import { IxcOssChamadoService } from '../../../services/externos/IxcOssChamadoService';
import { IntegracaoIxcProvedorService } from '../../../services/integracao/IntegracaoIxcProvedorService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import { getErrorMessage } from '../../../utils/errorUtils';
import { parseListQuery, parseOptionalQueryInt } from '../../../utils/listQuery';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';

function parseIxcLookupContext(req: Request) {
  const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query);
  const empresaId = getEmpresaIdOrNull(req);
  const clienteId = parseOptionalQueryInt(req.query.cliente_id) ?? null;
  return { page, limit, search, sortColumn, sortDirection, empresaId, clienteId };
}

function isIntegracaoConfigError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return message.includes('Integração IXC');
}

function handleLookupError(
  res: Response,
  error: unknown,
  defaultMessage: string,
  action: string,
  query: unknown
): void {
  const isConfigError = isIntegracaoConfigError(error);
  sendError(res, error, defaultMessage, isConfigError ? 400 : 500, !isConfigError, {
    context: 'IxcLookupController',
    action,
    query,
  });
}

export class IxcLookupController {
  static async getIntegracaoStatus(req: Request, res: Response): Promise<void> {
    try {
      const clienteId = parseOptionalQueryInt(req.query.cliente_id);
      if (!clienteId) {
        sendError(res, new Error('cliente_id é obrigatório'), 'cliente_id é obrigatório', 400, false);
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const configured = await IntegracaoIxcProvedorService.hasIntegracaoForCliente(clienteId, empresaId);
      sendSuccess(res, { configured });
    } catch (error) {
      sendError(res, error, 'Erro ao verificar integração IXC do cliente', 500, true, {
        context: 'IxcLookupController',
        action: 'getIntegracaoStatus',
        query: req.query,
      });
    }
  }

  static async listEstruturas(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId } =
        parseIxcLookupContext(req);
      const result = await IxcOssChamadoService.listCadastroLookup(
        'estrutura',
        'descricao',
        { page, limit, search, sortColumn, sortDirection },
        {},
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      handleLookupError(res, error, 'Erro ao listar estruturas', 'listEstruturas', req.query);
    }
  }

  static async listAssuntos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId } =
        parseIxcLookupContext(req);
      const result = await IxcOssChamadoService.listCadastroLookup(
        'su_oss_assunto',
        'assunto',
        { page, limit, search, sortColumn, sortDirection },
        {},
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      handleLookupError(res, error, 'Erro ao listar assuntos', 'listAssuntos', req.query);
    }
  }

  static async listSetores(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId } =
        parseIxcLookupContext(req);
      const result = await IxcOssChamadoService.listCadastroLookup(
        'empresa_setor',
        'setor',
        { page, limit, search, sortColumn, sortDirection },
        {},
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      handleLookupError(res, error, 'Erro ao listar setores', 'listSetores', req.query);
    }
  }

  static async listFiliais(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId } =
        parseIxcLookupContext(req);
      const result = await IxcOssChamadoService.listCadastroLookup(
        'filial',
        'fantasia',
        { page, limit, search, sortColumn, sortDirection },
        {},
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      handleLookupError(res, error, 'Erro ao listar filiais', 'listFiliais', req.query);
    }
  }

  static async listTecnicos(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId } =
        parseIxcLookupContext(req);
      const result = await IxcOssChamadoService.listCadastroLookup(
        'funcionarios',
        'funcionario',
        { page, limit, search, sortColumn, sortDirection },
        { integracao_calendario: 'S' },
        empresaId,
        clienteId
      );
      sendSuccess(res, result);
    } catch (error) {
      handleLookupError(res, error, 'Erro ao listar técnicos', 'listTecnicos', req.query);
    }
  }
}
