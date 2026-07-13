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
  const setorIdRaw = parseOptionalQueryInt(req.query.setor_id);
  const setor_id = setorIdRaw != null ? String(setorIdRaw) : undefined;
  return { page, limit, search, sortColumn, sortDirection, empresaId, clienteId, setor_id };
}

function isIntegracaoConfigError(error: unknown): boolean {
  return getErrorMessage(error).includes('Integração IXC');
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

async function listLookup(
  req: Request,
  res: Response,
  resource: string,
  nomeCampo: string,
  action: string,
  errorMessage: string
): Promise<void> {
  try {
    const { page, limit, search, sortColumn, sortDirection, empresaId, clienteId, setor_id } =
      parseIxcLookupContext(req);
    const result = await IxcOssChamadoService.listCadastroLookup(
      resource,
      nomeCampo,
      { page, limit, search, sortColumn, sortDirection, setor_id },
      {},
      empresaId,
      clienteId
    );
    sendSuccess(res, result);
  } catch (error) {
    handleLookupError(res, error, errorMessage, action, req.query);
  }
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
      const integracao = await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(
        clienteId,
        empresaId
      );
      sendSuccess(res, { configured: integracao != null });
    } catch (error) {
      sendError(res, error, 'Erro ao verificar integração IXC do cliente', 500, true, {
        context: 'IxcLookupController',
        action: 'getIntegracaoStatus',
        query: req.query,
      });
    }
  }

  static async listEstruturas(req: Request, res: Response): Promise<void> {
    await listLookup(req, res, 'estrutura', 'descricao', 'listEstruturas', 'Erro ao listar estruturas');
  }

  static async listAssuntos(req: Request, res: Response): Promise<void> {
    await listLookup(req, res, 'su_oss_assunto', 'assunto', 'listAssuntos', 'Erro ao listar assuntos');
  }

  static async listSetores(req: Request, res: Response): Promise<void> {
    await listLookup(req, res, 'empresa_setor', 'setor', 'listSetores', 'Erro ao listar setores');
  }

  static async listFiliais(req: Request, res: Response): Promise<void> {
    await listLookup(req, res, 'filial', 'fantasia', 'listFiliais', 'Erro ao listar filiais');
  }

  static async listTecnicos(req: Request, res: Response): Promise<void> {
    await listLookup(req, res, 'funcionarios', 'funcionario', 'listTecnicos', 'Erro ao listar técnicos');
  }
}
