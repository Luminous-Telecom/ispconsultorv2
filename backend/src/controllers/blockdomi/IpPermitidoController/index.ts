import { Request, Response } from 'express';
import { IpPermitidoService } from '../../../services/blockdomi/IpPermitidoService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { ClienteService } from '../../../services/clientes/ClienteService';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { logger } from '../../../utils/logger';
import { getErrorMessage, getErrorStack } from '../../../utils/errorUtils';
import { parseListQuery } from '../../../utils/listQuery';

function logControllerError(action: string, error: unknown): void {
  const msg = getErrorMessage(error);
  const stack = getErrorStack(error);
  logger.error(`[IpPermitidoController.${action}] ${msg}`);
  if (stack) logger.error(`[IpPermitidoController.${action}] stack: ${stack}`);
  if (error && typeof error === 'object' && !(error instanceof Error)) {
    logger.error(`[IpPermitidoController.${action}] detalhes: ${JSON.stringify(error)}`);
  }
}

export class IpPermitidoController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query);

      const result = await IpPermitidoService.list({
        page,
        limit,
        search,
        searchField,
        sortColumn,
        sortDirection
      });

      sendSuccess(res, result);
    } catch (error) {
      logControllerError('list', error);
      sendError(res, error, 'Erro ao listar IPs permitidos', 500, true, {
        context: 'IpPermitidoController',
        action: 'list'
      });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const row = await IpPermitidoService.getById(id);
      if (!row) {
        sendNotFound(res, 'Registro não encontrado');
        return;
      }
      const json = row.toJSON() as Record<string, unknown>;
      const cliente = (row as { cliente?: { razao_social?: string; nome_fantasia?: string; cnpj?: string } }).cliente;
      json.cliente_nome = cliente ? (cliente.razao_social || cliente.nome_fantasia || cliente.cnpj || '-') : '-';
      sendSuccess(res, json);
    } catch (error) {
      logControllerError('getById', error);
      sendError(res, error, 'Erro ao buscar IP permitido', 500, true, {
        context: 'IpPermitidoController',
        action: 'getById'
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const { cliente_id, faixa_ips } = req.body;
      if (!cliente_id || !faixa_ips || typeof faixa_ips !== 'string') {
        sendValidationError(res, 'cliente_id e faixa_ips são obrigatórios. Faixa de IPs separados por ;');
        return;
      }
      const cliente = await ClienteService.getById(Number(cliente_id));
      const empresaId = cliente?.empresa_id ?? getEmpresaIdOrNull(req) ?? null;
      const row = await IpPermitidoService.create({
        cliente_id: Number(cliente_id),
        faixa_ips,
        empresa_id: empresaId
      });
      const json = row.toJSON() as Record<string, unknown>;
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? row.empresa_id ?? null;
        await registrarCriacao(req, 'IpPermitido', row.id, json, undefined, empresaIdAudit);
      } catch {
        // Não interromper o fluxo
      }
      sendSuccess(res, json, 'IPs permitidos cadastrados', 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao cadastrar';
      const name = error instanceof Error ? error.name : '';
      const isUniqueCliente =
        name === 'SequelizeUniqueConstraintError' ||
        msg.includes('cliente_id') ||
        msg.includes('Unique') ||
        msg === 'Validation error';
      if (isUniqueCliente) {
        sendValidationError(res, 'Este cliente já possui IPs permitidos cadastrados.');
        return;
      }
      logControllerError('create', error);
      sendError(res, error, 'Erro ao cadastrar IPs permitidos', 500, true, {
        context: 'IpPermitidoController',
        action: 'create'
      });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { faixa_ips } = req.body;
      if (!faixa_ips || typeof faixa_ips !== 'string') {
        sendValidationError(res, 'faixa_ips é obrigatório. IPs separados por ;');
        return;
      }
      const existing = await IpPermitidoService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Registro não encontrado');
        return;
      }
      const dadosAnteriores = existing.toJSON() as Record<string, unknown>;
      const row = await IpPermitidoService.update(id, { faixa_ips });
      const dadosNovos = row.toJSON() as Record<string, unknown>;
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? row.empresa_id ?? null;
        await registrarAtualizacao(req, 'IpPermitido', row.id, dadosAnteriores, dadosNovos, undefined, empresaIdAudit);
      } catch {
        // Não interromper o fluxo
      }
      sendSuccess(res, dadosNovos, 'IPs permitidos atualizados');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('Registro não encontrado')) {
        sendNotFound(res, 'Registro não encontrado');
        return;
      }
      if (msg.includes('Faixa de IPs é obrigatória')) {
        sendValidationError(res, 'Informe pelo menos um IP ou faixa.');
        return;
      }
      logControllerError('update', error);
      sendError(res, error, 'Erro ao atualizar IPs permitidos', 500, true, {
        context: 'IpPermitidoController',
        action: 'update'
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await IpPermitidoService.getById(id);
      if (!existing) {
        sendNotFound(res, 'Registro não encontrado');
        return;
      }
      const dadosAnteriores = existing.toJSON() as Record<string, unknown>;
      await IpPermitidoService.delete(id);
      try {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? existing.empresa_id ?? null;
        await registrarExclusao(req, 'IpPermitido', existing.id, dadosAnteriores, undefined, empresaIdAudit);
      } catch {
        // Não interromper o fluxo
      }
      sendSuccess(res, null, 'Registro excluído');
    } catch (error) {
      logControllerError('delete', error);
      sendError(res, error, 'Erro ao excluir', 500, true, {
        context: 'IpPermitidoController',
        action: 'delete'
      });
    }
  }
}
