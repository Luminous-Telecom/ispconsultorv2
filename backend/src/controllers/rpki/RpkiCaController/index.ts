import { Request, Response } from 'express';
import { RpkiCaService } from '../../../services/rpki/RpkiCaService';
import { RpkiProvisioningService } from '../../../services/rpki/RpkiProvisioningService';
import { RpkiRoaService } from '../../../services/rpki/RpkiRoaService';
import { RpkiAspaService } from '../../../services/rpki/RpkiAspaService';
import { RpkiRouteValidationService } from '../../../services/rpki/RpkiRouteValidationService';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiSyncLog } from '../../../models/rpki/RpkiSyncLog';
import { Op } from 'sequelize';
import { sendError, sendNotFound, sendSuccess, sendValidationError } from '../../../utils/responseUtils';
import { isRpkiClientError } from '../../../utils/errorUtils';
import {
  getEmpresaIdOrNull,
  isAdminRequest,
  parseEmpresaIdQuery,
  resolveEmpresaScopeForList,
} from '../../../utils/tenantUtils';

export class RpkiCaController {
  static async getByIdForTenant(req: Request, caId: number): Promise<RpkiCa | null> {
    const ca = await RpkiCa.findByPk(caId);
    if (!ca) return null;

    const reqEmpresaId = getEmpresaIdOrNull(req);
    if (!isAdminRequest(req) && ca.empresa_id !== reqEmpresaId) {
      return null;
    }

    return ca;
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const queryEmpresaId = parseEmpresaIdQuery(req.query.empresa_id);
      const empresa_id = resolveEmpresaScopeForList(req, queryEmpresaId);
      const data = await RpkiCaService.list({ empresa_id });
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar CAs RPKI', 500, true, {
        context: 'RpkiCaController',
        action: 'list',
        query: req.query,
      });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const nome = String(req.body?.nome ?? '').trim();
      const clienteIdRaw = req.body?.clienteId;
      const cliente_id =
        clienteIdRaw != null && String(clienteIdRaw).trim() !== ''
          ? Number(clienteIdRaw)
          : null;
      if (!nome) {
        sendValidationError(res, 'Nome da CA é obrigatório');
        return;
      }
      if (cliente_id != null && (!Number.isFinite(cliente_id) || cliente_id <= 0)) {
        sendValidationError(res, 'Cliente inválido');
        return;
      }

      const empresa_id = getEmpresaIdOrNull(req) ?? null;
      const data = await RpkiCaService.create({ empresa_id, nome, cliente_id });
      sendSuccess(res, data, 'CA criada com sucesso', 201);
    } catch (error) {
      sendError(res, error, 'Erro ao criar CA RPKI', 500, true, {
        context: 'RpkiCaController',
        action: 'create',
      });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      await RpkiCaService.delete(ca.id);
      sendSuccess(res, null, 'CA removida com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao remover CA RPKI', 500, true, {
        context: 'RpkiCaController',
        action: 'delete',
      });
    }
  }

  static async generateChildRequest(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const result = await RpkiProvisioningService.generateChildRequest(ca);
      sendSuccess(res, { xml: result.xml, caId: ca.id, handle: ca.handle });
    } catch (error) {
      sendError(res, error, 'Erro ao gerar requisição da CA-filha', 500, true, {
        context: 'RpkiCaController',
        action: 'generateChildRequest',
      });
    }
  }

  static async importParentResponse(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const parentName = String(req.body?.parentName ?? '').trim();
      const responseXml = String(req.body?.responseXml ?? '').trim();

      if (!parentName) {
        sendValidationError(res, 'Nome da CA-pai é obrigatório');
        return;
      }
      if (!responseXml) {
        sendValidationError(res, 'Resposta da CA-pai (XML) é obrigatória');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const parent = await RpkiProvisioningService.importParentResponse({
        ca,
        parentName,
        responseXml,
        empresaId,
      });

      sendSuccess(res, parent, 'CA-pai vinculada com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao importar resposta da CA-pai', 400, true, {
        context: 'RpkiCaController',
        action: 'importParentResponse',
        payloadPreview: String(req.body?.responseXml ?? '').slice(0, 220),
      });
    }
  }

  static async listParents(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const data = await RpkiCaService.listParents(ca.id);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar CAs-pai', 500, true, {
        context: 'RpkiCaController',
        action: 'listParents',
      });
    }
  }

  static async deleteParent(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const parentId = Number(req.params.parentId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(parentId) || parentId <= 0) {
        sendValidationError(res, 'IDs da CA/CA-pai inválidos');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      await RpkiCaService.deleteParent(ca.id, parentId);
      sendSuccess(res, null, 'CA-pai removida com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao remover CA-pai', 500, true, {
        context: 'RpkiCaController',
        action: 'deleteParent',
      });
    }
  }

  static async listResources(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const data = await RpkiCaService.listResources(ca.id);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar recursos da CA', 500, true, {
        context: 'RpkiCaController',
        action: 'listResources',
      });
    }
  }

  static async clearResources(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const removed = await RpkiCaService.clearResources(ca.id);
      sendSuccess(res, { removed }, 'Recursos da CA removidos com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao remover recursos da CA', 500, true, {
        context: 'RpkiCaController',
        action: 'clearResources',
      });
    }
  }

  static async syncParentResources(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const parentId = Number(req.params.parentId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(parentId) || parentId <= 0) {
        sendValidationError(res, 'IDs da CA/CA-pai inválidos');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const parent = await RpkiCaParent.findOne({
        where: {
          id: parentId,
          ca_id: ca.id,
        },
      });
      if (!parent) {
        sendNotFound(res, 'CA-pai não encontrada');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const result = await RpkiProvisioningService.syncParentResources({
        ca,
        parent,
        empresaId,
      });

      sendSuccess(
        res,
        {
          parentId: parent.id,
          synced: {
            asn: result.asnResources.length,
            ipv4: result.ipv4Resources.length,
            ipv6: result.ipv6Resources.length,
          },
        },
        'Recursos da CA-pai sincronizados com sucesso'
      );
    } catch (error) {
      sendError(res, error, 'Erro ao sincronizar recursos da CA-pai', 400, true, {
        context: 'RpkiCaController',
        action: 'syncParentResources',
      });
    }
  }

  static async listRepositories(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const data = await RpkiCaService.listRepositories(ca.id);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar repositórios RPKI', 500, true, {
        context: 'RpkiCaController',
        action: 'listRepositories',
      });
    }
  }

  static async deleteRepository(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const repositoryId = Number(req.params.repositoryId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(repositoryId) || repositoryId <= 0) {
        sendValidationError(res, 'IDs da CA/Repositório inválidos');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      await RpkiCaService.deleteRepository(ca.id, repositoryId);
      sendSuccess(res, null, 'Repositório removido com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao remover repositório', 500, true, {
        context: 'RpkiCaController',
        action: 'deleteRepository',
      });
    }
  }

  static async syncRepository(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const repositoryId = Number(req.params.repositoryId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(repositoryId) || repositoryId <= 0) {
        sendValidationError(res, 'IDs da CA/Repositório inválidos');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const repository = await RpkiCaService.syncRepository(ca.id, repositoryId);
      sendSuccess(res, repository, 'Repositório atualizado com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao atualizar repositório', 500, true, {
        context: 'RpkiCaController',
        action: 'syncRepository',
      });
    }
  }

  static async generatePublisherRequest(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const parentIdRaw = req.body?.parentId;
      const parentId =
        parentIdRaw != null && String(parentIdRaw).trim() !== ''
          ? Number(parentIdRaw)
          : undefined;
      const tag = req.body?.tag != null ? String(req.body.tag) : undefined;
      if (parentId == null || !Number.isFinite(parentId) || parentId <= 0) {
        sendValidationError(res, 'CA-pai é obrigatória para gerar publisher_request');
        return;
      }

      const result = await RpkiProvisioningService.generatePublisherRequest({
        ca,
        parentId,
        tag,
      });

      sendSuccess(res, {
        xml: result.xml,
        tag: result.tag,
        caId: result.ca.id,
        handle: result.ca.handle,
        ...(result.warning ? { warning: result.warning } : {}),
      });
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao gerar publisher_request', 500, true, {
        context: 'RpkiCaController',
        action: 'generatePublisherRequest',
      });
    }
  }

  static async importRepositoryResponse(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }

      const responseXml = String(req.body?.responseXml ?? '').trim();
      if (!responseXml) {
        sendValidationError(res, 'XML repository_response é obrigatório');
        return;
      }

      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const empresaId = getEmpresaIdOrNull(req);
      const row = await RpkiProvisioningService.importRepositoryResponse({
        ca,
        responseXml,
        empresaId,
      });

      sendSuccess(res, row, 'Repositório vinculado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao importar repository_response', 400, true, {
        context: 'RpkiCaController',
        action: 'importRepositoryResponse',
        payloadPreview: String(req.body?.responseXml ?? '').slice(0, 220),
      });
    }
  }

  static async listRoas(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }
      const data = await RpkiRoaService.listByCa(ca.id);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar ROAs da CA', 500, true, {
        context: 'RpkiCaController',
        action: 'listRoas',
      });
    }
  }

  static async createRoa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const prefix = String(req.body?.prefix ?? '').trim();
      const asn = String(req.body?.asn ?? '').trim();
      const maxLength = Number(req.body?.max_length);
      const notBeforeRaw = String(req.body?.not_before ?? '').trim();
      const notAfterRaw = String(req.body?.not_after ?? '').trim();

      if (!prefix || !asn || !Number.isFinite(maxLength) || !notBeforeRaw || !notAfterRaw) {
        sendValidationError(res, 'Campos obrigatórios: prefix, asn, max_length, not_before, not_after');
        return;
      }

      const notBefore = new Date(notBeforeRaw);
      const notAfter = new Date(notAfterRaw);
      if (Number.isNaN(notBefore.getTime()) || Number.isNaN(notAfter.getTime())) {
        sendValidationError(res, 'Datas inválidas em not_before/not_after');
        return;
      }

      const row = await RpkiRoaService.create({
        caId: ca.id,
        empresaId: ca.empresa_id,
        prefix,
        asn,
        maxLength: Math.trunc(maxLength),
        notBefore,
        notAfter,
      });
      sendSuccess(res, row, 'ROA criada com sucesso', 201);
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao criar ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'createRoa',
      });
    }
  }

  static async updateRoa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const roaId = Number(req.params.roaId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) {
        sendValidationError(res, 'IDs da CA/ROA inválidos');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const payload: {
        prefix?: string;
        asn?: string;
        maxLength?: number;
        notBefore?: Date;
        notAfter?: Date;
      } = {};

      if (req.body?.prefix != null) payload.prefix = String(req.body.prefix).trim();
      if (req.body?.asn != null) payload.asn = String(req.body.asn).trim();
      if (req.body?.max_length != null) payload.maxLength = Math.trunc(Number(req.body.max_length));
      if (req.body?.not_before != null) payload.notBefore = new Date(String(req.body.not_before));
      if (req.body?.not_after != null) payload.notAfter = new Date(String(req.body.not_after));

      if (payload.notBefore && Number.isNaN(payload.notBefore.getTime())) {
        sendValidationError(res, 'Data inválida em not_before');
        return;
      }
      if (payload.notAfter && Number.isNaN(payload.notAfter.getTime())) {
        sendValidationError(res, 'Data inválida em not_after');
        return;
      }

      const row = await RpkiRoaService.update(ca.id, roaId, payload);
      sendSuccess(res, row, 'ROA atualizada com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao atualizar ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'updateRoa',
      });
    }
  }

  static async revokeRoa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const roaId = Number(req.params.roaId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) {
        sendValidationError(res, 'IDs da CA/ROA inválidos');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }
      const row = await RpkiRoaService.revoke(ca.id, roaId);
      sendSuccess(res, row, 'ROA revogada com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao revogar ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'revokeRoa',
      });
    }
  }

  static async deleteRoa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const roaId = Number(req.params.roaId);
      if (!Number.isFinite(caId) || caId <= 0 || !Number.isFinite(roaId) || roaId <= 0) {
        sendValidationError(res, 'IDs da CA/ROA inválidos');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }
      await RpkiRoaService.delete(ca.id, roaId);
      sendSuccess(res, null, 'ROA removida com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao remover ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'deleteRoa',
      });
    }
  }

  static async analyzeRoas(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }
      const analysis = await RpkiRoaService.analyzeByCa(ca.id);
      sendSuccess(res, analysis, 'Análise de ROAs concluída');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao analisar ROAs', 500, true, {
        context: 'RpkiCaController',
        action: 'analyzeRoas',
      });
    }
  }

  static async applyRoaSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) {
        sendValidationError(res, 'ID da CA inválido');
        return;
      }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) {
        sendNotFound(res, 'CA não encontrada');
        return;
      }

      const suggestionsRaw: unknown[] = Array.isArray(req.body?.suggestions) ? req.body.suggestions : [];
      const suggestions = suggestionsRaw
        .map((item: unknown) => {
          const value = (item ?? {}) as {
            prefix?: unknown;
            asn?: unknown;
            max_length?: unknown;
          };
          return {
            prefix: String(value.prefix ?? '').trim(),
            asn: String(value.asn ?? '').trim(),
            max_length: Number(value.max_length),
          };
        })
        .filter((item: { prefix: string; asn: string; max_length: number }) => {
          return item.prefix && item.asn && Number.isFinite(item.max_length);
        });

      if (suggestions.length === 0) {
        sendValidationError(res, 'Nenhuma sugestão válida foi informada para aplicar');
        return;
      }

      const result = await RpkiRoaService.applySuggestions(ca.id, ca.empresa_id, suggestions);
      sendSuccess(res, result, 'Sugestões de ROA aplicadas com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, error.message);
        return;
      }
      sendError(res, error, 'Erro ao aplicar sugestões de ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'applyRoaSuggestions',
      });
    }
  }

  // ─── ASPAs ────────────────────────────────────────────────────────────────

  static async listAspas(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) { sendValidationError(res, 'ID da CA inválido'); return; }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) { sendNotFound(res, 'CA não encontrada'); return; }
      const data = await RpkiAspaService.listByCa(caId);
      sendSuccess(res, data);
    } catch (error) {
      sendError(res, error, 'Erro ao listar ASPAs', 500, true, { context: 'RpkiCaController', action: 'listAspas' });
    }
  }

  static async createAspa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      if (!Number.isFinite(caId) || caId <= 0) { sendValidationError(res, 'ID da CA inválido'); return; }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) { sendNotFound(res, 'CA não encontrada'); return; }

      const customerAsn = String(req.body?.customerAsn ?? '').trim();
      const providers = String(req.body?.providers ?? '').trim();
      if (!customerAsn) { sendValidationError(res, 'customerAsn é obrigatório'); return; }
      if (!providers) { sendValidationError(res, 'providers é obrigatório'); return; }

      const data = await RpkiAspaService.create({
        caId,
        empresaId: ca.empresa_id,
        customerAsn,
        providers,
      });
      sendSuccess(res, data, 'ASPA criado com sucesso', 201);
    } catch (error) {
      if (isRpkiClientError(error)) { sendValidationError(res, (error as Error).message); return; }
      sendError(res, error, 'Erro ao criar ASPA', 500, true, { context: 'RpkiCaController', action: 'createAspa' });
    }
  }

  static async revokeAspa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const aspaId = Number(req.params.aspaId);
      if (!Number.isFinite(caId) || !Number.isFinite(aspaId)) { sendValidationError(res, 'IDs inválidos'); return; }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) { sendNotFound(res, 'CA não encontrada'); return; }
      const data = await RpkiAspaService.revoke(caId, aspaId);
      sendSuccess(res, data, 'ASPA revogado com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) { sendValidationError(res, (error as Error).message); return; }
      sendError(res, error, 'Erro ao revogar ASPA', 500, true, { context: 'RpkiCaController', action: 'revokeAspa' });
    }
  }

  static async deleteAspa(req: Request, res: Response): Promise<void> {
    try {
      const caId = Number(req.params.id);
      const aspaId = Number(req.params.aspaId);
      if (!Number.isFinite(caId) || !Number.isFinite(aspaId)) { sendValidationError(res, 'IDs inválidos'); return; }
      const ca = await RpkiCaController.getByIdForTenant(req, caId);
      if (!ca) { sendNotFound(res, 'CA não encontrada'); return; }
      await RpkiAspaService.delete(caId, aspaId);
      sendSuccess(res, null, 'ASPA excluído com sucesso');
    } catch (error) {
      if (isRpkiClientError(error)) { sendValidationError(res, (error as Error).message); return; }
      sendError(res, error, 'Erro ao excluir ASPA', 500, true, { context: 'RpkiCaController', action: 'deleteAspa' });
    }
  }

  static async validateRoute(req: Request, res: Response): Promise<void> {
    try {
      const prefix = String(req.body?.prefix ?? '').trim();
      const asnRaw = String(req.body?.asn ?? '').trim();

      if (!prefix) {
        sendValidationError(res, 'Informe o prefixo.');
        return;
      }

      const data = await RpkiRouteValidationService.validate({
        prefix,
        asn: asnRaw || undefined,
        empresaId: getEmpresaIdOrNull(req),
        requestIp: req.socket?.remoteAddress ?? req.ip ?? null,
      });

      sendSuccess(res, data);
    } catch (error) {
      if (isRpkiClientError(error)) {
        sendValidationError(res, (error as Error).message);
        return;
      }
      sendError(res, error, 'Erro ao validar rota', 500, true, {
        context: 'RpkiCaController',
        action: 'validateRoute',
      });
    }
  }

  static async listCaPaiLogs(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const isAdmin = isAdminRequest(req);
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
      const offset = (page - 1) * limit;
      const search = String(req.query.search ?? '').trim();
      const status = String(req.query.status ?? '').trim();

      const where: Record<string, unknown> = { type: 'provisioning' };
      if (!isAdmin && empresaId != null) where.empresa_id = empresaId;
      if (status && ['success', 'failed'].includes(status)) where.status = status;
      if (search) {
        where[Op.or as unknown as string] = [
          { remote_host: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await RpkiSyncLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      sendSuccess(res, {
        data: rows,
        pagination: {
          total: count,
          per_page: limit,
          current_page: page,
          last_page: Math.max(1, Math.ceil(count / limit)),
          from: offset + 1,
          to: Math.min(offset + limit, count),
        },
      });
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de CA-pai', 500, true, {
        context: 'RpkiCaController',
        action: 'listCaPaiLogs',
      });
    }
  }

  static async listRepositorioLogs(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const isAdmin = isAdminRequest(req);
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
      const offset = (page - 1) * limit;
      const search = String(req.query.search ?? '').trim();
      const status = String(req.query.status ?? '').trim();

      const where: Record<string, unknown> = { type: 'publication' };
      if (!isAdmin && empresaId != null) where.empresa_id = empresaId;
      if (status && ['success', 'failed'].includes(status)) where.status = status;
      if (search) {
        where[Op.or as unknown as string] = [
          { remote_host: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await RpkiSyncLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      sendSuccess(res, {
        data: rows,
        pagination: {
          total: count,
          per_page: limit,
          current_page: page,
          last_page: Math.max(1, Math.ceil(count / limit)),
          from: offset + 1,
          to: Math.min(offset + limit, count),
        },
      });
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de repositório', 500, true, {
        context: 'RpkiCaController',
        action: 'listRepositorioLogs',
      });
    }
  }

  private static async listPublicationLogsByTrigger(
    req: Request,
    res: Response,
    triggerType: 'roa' | 'aspa'
  ): Promise<void> {
    const empresaId = getEmpresaIdOrNull(req);
    const isAdmin = isAdminRequest(req);
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const offset = (page - 1) * limit;
    const search = String(req.query.search ?? '').trim();
    const status = String(req.query.status ?? '').trim();

    const where: Record<string, unknown> = { type: 'publication', trigger_type: triggerType };
    if (!isAdmin && empresaId != null) where.empresa_id = empresaId;
    if (status && ['success', 'failed'].includes(status)) where.status = status;
    if (search) {
      where[Op.or as unknown as string] = [
        { remote_host: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await RpkiSyncLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    sendSuccess(res, {
      data: rows,
      pagination: {
        total: count,
        per_page: limit,
        current_page: page,
        last_page: Math.max(1, Math.ceil(count / limit)),
        from: offset + 1,
        to: Math.min(offset + limit, count),
      },
    });
  }

  static async listRoaLogs(req: Request, res: Response): Promise<void> {
    try {
      await RpkiCaController.listPublicationLogsByTrigger(req, res, 'roa');
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de ROA', 500, true, {
        context: 'RpkiCaController',
        action: 'listRoaLogs',
      });
    }
  }

  static async listAspaLogs(req: Request, res: Response): Promise<void> {
    try {
      await RpkiCaController.listPublicationLogsByTrigger(req, res, 'aspa');
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de ASPA', 500, true, {
        context: 'RpkiCaController',
        action: 'listAspaLogs',
      });
    }
  }

  static async listValidationLogs(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const isAdmin = isAdminRequest(req);
      const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
      const offset = (page - 1) * limit;
      const search = String(req.query.search ?? '').trim();
      const status = String(req.query.status ?? '').trim();

      const where: Record<string, unknown> = {};
      if (!isAdmin && empresaId != null) where.empresa_id = empresaId;
      if (status && ['success', 'failed'].includes(status)) where.status = status;
      if (search) {
        where[Op.or as unknown as string] = [
          { remote_host: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await RpkiSyncLog.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset,
      });

      sendSuccess(res, {
        data: rows,
        pagination: {
          total: count,
          per_page: limit,
          current_page: page,
          last_page: Math.max(1, Math.ceil(count / limit)),
          from: offset + 1,
          to: Math.min(offset + limit, count),
        },
      });
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de sincronização', 500, true, {
        context: 'RpkiCaController',
        action: 'listValidationLogs',
      });
    }
  }
}

