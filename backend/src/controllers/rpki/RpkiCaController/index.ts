import { Request, Response } from 'express';
import { RpkiCaService } from '../../../services/rpki/RpkiCaService';
import { RpkiProvisioningService } from '../../../services/rpki/RpkiProvisioningService';
import { RpkiRoaService } from '../../../services/rpki/RpkiRoaService';
import { RpkiAspaService } from '../../../services/rpki/RpkiAspaService';
import { RpkiRouteValidationService } from '../../../services/rpki/RpkiRouteValidationService';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiRoa } from '../../../models/rpki/RpkiRoa';
import { RpkiAspa } from '../../../models/rpki/RpkiAspa';
import { SistemaLogOperacionalQueryService } from '../../../services/sistema/SistemaLogOperacionalQueryService';
import { Cliente } from '../../../models/clientes/Cliente';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { Op } from 'sequelize';
import { sendError, sendNotFound, sendSuccess, sendValidationError } from '../../../utils/responseUtils';
import { isRpkiClientError } from '../../../utils/errorUtils';
import {
  getEmpresaIdOrNull,
  isAdminRequest,
  parseEmpresaIdQuery,
  resolveEmpresaScopeForList,
  resolveListEmpresaId,
} from '../../../utils/tenantUtils';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { registrarAuditoria } from '../../../services/sistema/AuditoriaRegistroService';
import { parseListQuery, queryString } from '../../../utils/listQuery';
import { buildPagination } from '../../../utils/pagination';

function empresaIdAuditoria(req: Request, fallback: number | null): number | null {
  return getEmpresaIdOrNull(req) ?? fallback ?? null;
}

async function auditarRpki(exec: () => Promise<void>): Promise<void> {
  try {
    await exec();
  } catch {
    /* auditoria não deve falhar a requisição */
  }
}

async function enrichRpkiSyncLogsWithEmpresaSaas(rows: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
  const empresaIds = [
    ...new Set(
      rows
        .map((r) => r.empresa_id)
        .filter((id): id is number => typeof id === 'number' && id != null && Number(id) > 0)
    ),
  ];
  const nomeById = new Map<number, string>();
  if (empresaIds.length > 0) {
    const empresas = await DadosEmpresa.findAll({
      where: { id: empresaIds },
      attributes: ['id', 'razao_social', 'nome_fantasia'],
    });
    for (const e of empresas) {
      const rs = e.razao_social != null ? String(e.razao_social).trim() : '';
      const nf = e.nome_fantasia != null ? String(e.nome_fantasia).trim() : '';
      const nome = rs !== '' ? rs : nf !== '' ? nf : `Empresa ${e.id}`;
      nomeById.set(e.id, nome);
    }
  }

  const caIds = [
    ...new Set(
      rows
        .map((r) => r.ca_id)
        .filter((id): id is number => typeof id === 'number' && id != null && Number(id) > 0)
    ),
  ];
  const caNomeById = new Map<number, string>();
  const clienteIdByCaId = new Map<number, number | null>();
  const clienteNomeById = new Map<number, string>();
  if (caIds.length > 0) {
    const cas = await RpkiCa.findAll({
      where: { id: caIds },
      attributes: ['id', 'nome', 'cliente_id'],
    });
    const clienteIds = new Set<number>();
    for (const c of cas) {
      caNomeById.set(c.id, c.nome);
      clienteIdByCaId.set(c.id, c.cliente_id);
      if (c.cliente_id != null && Number(c.cliente_id) > 0) {
        clienteIds.add(Number(c.cliente_id));
      }
    }
    if (clienteIds.size > 0) {
      const clientes = await Cliente.findAll({
        where: { id: [...clienteIds] },
        attributes: ['id', 'razao_social', 'nome_fantasia'],
      });
      for (const cl of clientes) {
        const razao = cl.razao_social != null ? String(cl.razao_social).trim() : '';
        const fantasia =
          cl.nome_fantasia != null && String(cl.nome_fantasia).trim() !== ''
            ? String(cl.nome_fantasia).trim()
            : '';
        const nome = razao !== '' ? razao : fantasia;
        clienteNomeById.set(cl.id, nome);
      }
    }
  }

  return rows.map((row) => {
    const plain = { ...row };
    const eid = row.empresa_id;
    plain.empresa_saas =
      typeof eid === 'number' && eid > 0 ? nomeById.get(Number(eid)) ?? null : null;

    const caId = row.ca_id;
    if (typeof caId === 'number' && caId > 0) {
      plain.ca_nome = caNomeById.get(Number(caId)) ?? null;
      const cid = clienteIdByCaId.get(Number(caId));
      plain.cliente_nome =
        cid != null && Number(cid) > 0 ? clienteNomeById.get(Number(cid)) ?? null : null;
    } else {
      plain.ca_nome = null;
      plain.cliente_nome = null;
    }
    return plain;
  });
}

function rpkiJsonParaAuditoria(model: { toJSON: () => Record<string, unknown> }): Record<string, unknown> {
  const j = { ...model.toJSON() };
  if (typeof j.parent_response_xml === 'string' && j.parent_response_xml.length > 400) {
    j.parent_response_xml = `[omitido: ${j.parent_response_xml.length} caracteres]`;
  }
  return j;
}

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
      await auditarRpki(async () => {
        await registrarCriacao(
          req,
          'RpkiCa',
          data.id,
          data.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, data.empresa_id)
        );
      });
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

      const snapshotCa = ca.toJSON() as Record<string, unknown>;
      const caIdAuditoria = ca.id;
      const empresaAuditoria = empresaIdAuditoria(req, ca.empresa_id);
      await RpkiCaService.delete(caIdAuditoria);
      await auditarRpki(async () => {
        await registrarExclusao(req, 'RpkiCa', caIdAuditoria, snapshotCa, undefined, empresaAuditoria);
      });
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

      await auditarRpki(async () => {
        await registrarCriacao(
          req,
          'RpkiCaParent',
          parent.id,
          rpkiJsonParaAuditoria(parent),
          'Importação resposta CA-pai',
          empresaIdAuditoria(req, parent.empresa_id)
        );
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

      const parentRow = await RpkiCaParent.findOne({
        where: { id: parentId, ca_id: ca.id },
      });
      if (!parentRow) {
        sendNotFound(res, 'CA-pai não encontrada');
        return;
      }

      await RpkiCaService.deleteParent(ca.id, parentId);
      await auditarRpki(async () => {
        await registrarExclusao(
          req,
          'RpkiCaParent',
          parentId,
          rpkiJsonParaAuditoria(parentRow),
          undefined,
          empresaIdAuditoria(req, parentRow.empresa_id ?? ca.empresa_id)
        );
      });
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

      const resourceCount = await RpkiCaResource.count({ where: { ca_id: ca.id } });
      const removed = await RpkiCaService.clearResources(ca.id);
      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiCa',
          ca.id,
          { rpki_ca_resources_count: resourceCount },
          { rpki_ca_resources_count: 0, removed_count: removed },
          'Limpeza de recursos delegados da CA',
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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

      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiCa',
          ca.id,
          {},
          {
            syncParentResources: {
              parentId: parent.id,
              synced: {
                asn: result.asnResources.length,
                ipv4: result.ipv4Resources.length,
                ipv6: result.ipv6Resources.length,
              },
            },
          },
          'Sincronização de recursos com CA-pai (RFC 6492)',
          empresaIdAuditoria(req, ca.empresa_id)
        );
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

      const repoRow = await RpkiRepository.findOne({
        where: { id: repositoryId, ca_id: ca.id },
      });
      if (!repoRow) {
        sendNotFound(res, 'Repositório não encontrado');
        return;
      }

      await RpkiCaService.deleteRepository(ca.id, repositoryId);
      await auditarRpki(async () => {
        await registrarExclusao(
          req,
          'RpkiRepository',
          repositoryId,
          repoRow.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, repoRow.empresa_id ?? ca.empresa_id)
        );
      });
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

      const repoBefore = await RpkiRepository.findOne({
        where: { id: repositoryId, ca_id: ca.id },
      });
      if (!repoBefore) {
        sendNotFound(res, 'Repositório não encontrado');
        return;
      }

      const repository = await RpkiCaService.syncRepository(ca.id, repositoryId);
      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiRepository',
          repository.id,
          repoBefore.toJSON() as Record<string, unknown>,
          repository.toJSON() as Record<string, unknown>,
          'Publicação/sincronização com repositório (RFC 8181)',
          empresaIdAuditoria(req, repository.empresa_id ?? ca.empresa_id)
        );
      });
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

      await auditarRpki(async () => {
        await registrarCriacao(
          req,
          'RpkiRepository',
          row.id,
          row.toJSON() as Record<string, unknown>,
          'Vínculo repositório (repository_response)',
          empresaIdAuditoria(req, row.empresa_id ?? ca.empresa_id)
        );
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
      await auditarRpki(async () => {
        await registrarCriacao(
          req,
          'RpkiRoa',
          row.id,
          row.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, row.empresa_id ?? ca.empresa_id)
        );
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

      const roaAntes = await RpkiRoa.findOne({
        where: { id: roaId, ca_id: ca.id },
      });
      if (!roaAntes) {
        sendNotFound(res, 'ROA não encontrado');
        return;
      }

      const row = await RpkiRoaService.update(ca.id, roaId, payload);
      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiRoa',
          roaId,
          roaAntes.toJSON() as Record<string, unknown>,
          row.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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
      const roaAntes = await RpkiRoa.findOne({
        where: { id: roaId, ca_id: ca.id },
      });
      if (!roaAntes) {
        sendNotFound(res, 'ROA não encontrado');
        return;
      }
      const row = await RpkiRoaService.revoke(ca.id, roaId);
      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiRoa',
          roaId,
          roaAntes.toJSON() as Record<string, unknown>,
          row.toJSON() as Record<string, unknown>,
          'Revogação de ROA',
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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
      const roaAntes = await RpkiRoa.findOne({
        where: { id: roaId, ca_id: ca.id },
      });
      if (!roaAntes) {
        sendNotFound(res, 'ROA não encontrado');
        return;
      }
      await RpkiRoaService.delete(ca.id, roaId);
      await auditarRpki(async () => {
        await registrarExclusao(
          req,
          'RpkiRoa',
          roaId,
          roaAntes.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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
      await auditarRpki(async () => {
        await registrarAuditoria(req, {
          acao: 'update',
          entidade: 'RpkiCa',
          entidade_id: ca.id,
          dados_anteriores: null,
          dados_novos: {
            applyRoaSuggestions: result,
            suggestionsCount: suggestions.length,
          },
          observacoes: 'Aplicação em lote de sugestões de ROA',
          empresa_id: empresaIdAuditoria(req, ca.empresa_id),
        });
      });
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
      await auditarRpki(async () => {
        await registrarCriacao(
          req,
          'RpkiAspa',
          data.id,
          data.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, data.empresa_id ?? ca.empresa_id)
        );
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
      const aspaAntes = await RpkiAspa.findOne({ where: { id: aspaId, ca_id: caId } });
      if (!aspaAntes) { sendNotFound(res, 'ASPA não encontrado'); return; }
      const data = await RpkiAspaService.revoke(caId, aspaId);
      await auditarRpki(async () => {
        await registrarAtualizacao(
          req,
          'RpkiAspa',
          aspaId,
          aspaAntes.toJSON() as Record<string, unknown>,
          data.toJSON() as Record<string, unknown>,
          'Revogação de ASPA',
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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
      const aspaAntes = await RpkiAspa.findOne({ where: { id: aspaId, ca_id: caId } });
      if (!aspaAntes) { sendNotFound(res, 'ASPA não encontrado'); return; }
      await RpkiAspaService.delete(caId, aspaId);
      await auditarRpki(async () => {
        await registrarExclusao(
          req,
          'RpkiAspa',
          aspaId,
          aspaAntes.toJSON() as Record<string, unknown>,
          undefined,
          empresaIdAuditoria(req, ca.empresa_id)
        );
      });
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

  private static async listSyncLogs(
    req: Request,
    res: Response,
    action: string,
    errorLabel: string,
    baseWhere: Record<string, unknown>
  ): Promise<void> {
    try {
      const empresaId = resolveListEmpresaId(req);
      const { page, limit, search: searchRaw } = parseListQuery(req.query, {
        defaultLimit: 20,
        maxLimit: 100,
      });
      if (empresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildPagination(page, limit, 0, { minLastPageWhenEmpty: 1 }),
        });
        return;
      }

      const offset = (page - 1) * limit;
      const search = searchRaw?.trim() ?? '';
      const status = queryString(req.query.status) ?? '';

      const { count, rows } = await SistemaLogOperacionalQueryService.listRpkiSync({
        page,
        limit,
        offset,
        empresaId,
        search,
        status,
        baseWhere: baseWhere as {
          type?: 'provisioning' | 'publication';
          trigger_type?: 'roa' | 'aspa' | 'manual';
        },
      });

      sendSuccess(res, {
        data: await enrichRpkiSyncLogsWithEmpresaSaas(rows),
        pagination: buildPagination(page, limit, count, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, errorLabel, 500, true, { context: 'RpkiCaController', action });
    }
  }

  static listCaPaiLogs(req: Request, res: Response): Promise<void> {
    return RpkiCaController.listSyncLogs(req, res, 'listCaPaiLogs', 'Erro ao listar logs de CA-pai', {
      type: 'provisioning',
    });
  }

  static listRepositorioLogs(req: Request, res: Response): Promise<void> {
    return RpkiCaController.listSyncLogs(req, res, 'listRepositorioLogs', 'Erro ao listar logs de repositório', {
      type: 'publication',
    });
  }

  static listRoaLogs(req: Request, res: Response): Promise<void> {
    return RpkiCaController.listSyncLogs(req, res, 'listRoaLogs', 'Erro ao listar logs de ROA', {
      type: 'publication',
      trigger_type: 'roa',
    });
  }

  static listAspaLogs(req: Request, res: Response): Promise<void> {
    return RpkiCaController.listSyncLogs(req, res, 'listAspaLogs', 'Erro ao listar logs de ASPA', {
      type: 'publication',
      trigger_type: 'aspa',
    });
  }

  static listValidationLogs(req: Request, res: Response): Promise<void> {
    return RpkiCaController.listValidationLogsPaginated(req, res);
  }

  private static async listValidationLogsPaginated(req: Request, res: Response): Promise<void> {
    try {
      const empresaId = resolveListEmpresaId(req);
      const { page, limit, search: searchRaw } = parseListQuery(req.query, {
        defaultLimit: 20,
        maxLimit: 100,
      });
      if (empresaId === false) {
        sendSuccess(res, {
          data: [],
          pagination: buildPagination(page, limit, 0, { minLastPageWhenEmpty: 1 }),
        });
        return;
      }

      const offset = (page - 1) * limit;
      const search = searchRaw?.trim() ?? '';

      const { count, rows } = await SistemaLogOperacionalQueryService.listRpkiValidation({
        page,
        limit,
        offset,
        empresaId,
        search,
      });

      sendSuccess(res, {
        data: rows,
        pagination: buildPagination(page, limit, count, { minLastPageWhenEmpty: 1, minLastPage: 1 }),
      });
    } catch (error) {
      sendError(res, error, 'Erro ao listar logs de validação', 500, true, {
        context: 'RpkiCaController',
        action: 'listValidationLogs',
      });
    }
  }
}

