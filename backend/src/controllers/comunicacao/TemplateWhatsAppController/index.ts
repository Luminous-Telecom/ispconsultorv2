import { toPlain } from '../../../utils/toPlain';
import { Request, Response as ExpressResponse } from 'express';
import { TemplateWhatsAppService } from '../../../services/comunicacao/TemplateWhatsAppService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService/index';
import { sendSuccess, sendError, sendNotFound } from '../../../utils/responseUtils';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { pertenceComunicacaoEmpresa } from '../../../utils/comunicacaoEmpresaWhere';
import type { AuthenticatedRequest } from '../../../types/auth';

export class TemplateWhatsAppController {
  static async list(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const empresaId = getEmpresaIdOrNull(req);
      const servidorWhatsappId = Number(req.query.servidor_whatsapp_id);
      const templates = await TemplateWhatsAppService.list(
        empresaId,
        Number.isFinite(servidorWhatsappId) && servidorWhatsappId > 0 ? servidorWhatsappId : null
      );
      sendSuccess(res, templates);
    } catch (error) {
      sendError(res, error, 'Erro ao listar templates', 500, true);
    }
  }

  static async show(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const id = Number(req.params.id);
      const empresaId = getEmpresaIdOrNull(req);
      const template = await TemplateWhatsAppService.getById(id);
      if (!template || !pertenceComunicacaoEmpresa(template.empresa_id, empresaId)) {
        sendNotFound(res, 'Template não encontrado');
        return;
      }
      sendSuccess(res, template);
    } catch (error) {
      sendError(res, error, 'Erro ao buscar template', 500, true);
    }
  }

  static async create(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const { nome, idioma, variables, header_document, ativo, servidor_whatsapp_id } = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        sendError(res, null, 'Nome do template é obrigatório', 400);
        return;
      }
      if (empresaId == null || empresaId <= 0) {
        sendError(res, null, 'Empresa não identificada para criar template', 400);
        return;
      }
      const servidorId = Number(servidor_whatsapp_id);
      if (!Number.isFinite(servidorId) || servidorId <= 0) {
        sendError(res, null, 'Template precisa estar vinculado a um servidor de WhatsApp', 400);
        return;
      }

      const template = await TemplateWhatsAppService.create({
        nome: nome.trim(),
        idioma: idioma || 'pt_BR',
        variables: variables != null ? (typeof variables === 'string' ? variables : JSON.stringify(variables)) : undefined,
        header_document: !!header_document,
        ativo: ativo !== false,
        empresa_id: empresaId,
        servidor_whatsapp_id: servidorId,
      });
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? (template as { empresa_id?: number | null }).empresa_id ?? null;
        await registrarCriacao(req as AuthenticatedRequest, 'TemplateWhatsApp', template.id, toPlain(template) as Record<string, unknown>, undefined, empresaId);
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(res, template, 'Template criado com sucesso', 201);
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('Já existe um template')) {
        sendError(res, null, err.message, 400);
      } else {
        sendError(res, error, 'Erro ao criar template', 500, true);
      }
    }
  }

  static async update(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { nome, idioma, variables, header_document, ativo } = req.body;
      const empresaId = getEmpresaIdOrNull(req);

      const template = await TemplateWhatsAppService.getById(id);
      if (!template || !pertenceComunicacaoEmpresa(template.empresa_id, empresaId)) {
        sendNotFound(res, 'Template não encontrado');
        return;
      }

      const updates: Record<string, unknown> = {};
      if (nome != null) updates.nome = String(nome).trim();
      if (idioma != null) updates.idioma = idioma;
      if (variables != null) updates.variables = typeof variables === 'string' ? variables : JSON.stringify(variables);
      if (header_document != null) updates.header_document = !!header_document;
      if (ativo != null) updates.ativo = !!ativo;

      const dadosAnteriores = toPlain(template);
      await TemplateWhatsAppService.update(id, updates);
      const updated = await TemplateWhatsAppService.getById(id);
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? (updated as { empresa_id?: number | null })?.empresa_id ?? null;
        await registrarAtualizacao(req as AuthenticatedRequest, 'TemplateWhatsApp', id, dadosAnteriores as unknown as Record<string, unknown>, (updated ? toPlain(updated) : updated) as unknown as Record<string, unknown>, undefined, empresaId);
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(res, updated, 'Template atualizado com sucesso');
    } catch (error) {
      const err = error as Error;
      if (err.message?.includes('Já existe um template')) {
        sendError(res, null, err.message, 400);
      } else {
        sendError(res, error, 'Erro ao atualizar template', 500, true);
      }
    }
  }

  static async delete(req: Request, res: ExpressResponse): Promise<void> {
    try {
      const id = Number(req.params.id);
      const empresaId = getEmpresaIdOrNull(req);
      const template = await TemplateWhatsAppService.getById(id);
      if (!template || !pertenceComunicacaoEmpresa(template.empresa_id, empresaId)) {
        sendNotFound(res, 'Template não encontrado');
        return;
      }
      const dadosAnteriores = toPlain(template);
      await TemplateWhatsAppService.delete(id);
      try {
        const empresaId = getEmpresaIdOrNull(req) ?? (template as { empresa_id?: number | null })?.empresa_id ?? null;
        await registrarExclusao(req as AuthenticatedRequest, 'TemplateWhatsApp', id, dadosAnteriores as unknown as Record<string, unknown>, undefined, empresaId);
      } catch (auditError) {
        // Não interromper o fluxo
      }
      sendSuccess(res, { id }, 'Template removido com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao remover template', 500, true);
    }
  }
}
