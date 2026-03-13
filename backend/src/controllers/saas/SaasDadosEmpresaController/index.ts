import { Response } from 'express';
import Joi from 'joi';
import SaasDadosEmpresa from '../../../models/saas/SaasDadosEmpresa';
import { SaasDadosEmpresaService } from '../../../services/saas/SaasDadosEmpresaService';
import { DesbloqueioManualService } from '../../../services/saas/DesbloqueioManualService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

const empresaSchema = Joi.object({
  razao_social: Joi.string().max(200).required(),
  nome_fantasia: Joi.string().max(200).optional().allow('', null),
  cnpj: Joi.string().max(20).required(),
  inscricao_estadual: Joi.string().max(50).optional().allow('', null),
  inscricao_municipal: Joi.string().max(50).optional().allow('', null),
  email: Joi.string().email().required(),
  telefone: Joi.string().max(30).optional().allow('', null),
  celular: Joi.string().max(30).optional().allow('', null),
  cep: Joi.string().max(9).optional().allow('', null),
  endereco: Joi.string().max(255).optional().allow('', null),
  numero: Joi.string().max(20).optional().allow('', null),
  complemento: Joi.string().max(100).optional().allow('', null),
  bairro: Joi.string().max(100).optional().allow('', null),
  cidade: Joi.string().max(100).optional().allow('', null),
  estado: Joi.string().max(2).optional().allow('', null),
  responsavel_nome: Joi.string().max(200).optional().allow('', null),
  responsavel_cpf: Joi.string().max(14).optional().allow('', null),
  responsavel_cargo: Joi.string().max(100).optional().allow('', null),
  responsavel_assinatura: Joi.string().max(500).optional().allow('', null),
  site: Joi.string().max(255).optional().allow('', null),
  logo: Joi.string().max(500).optional().allow('', null),
});

export class SaasDadosEmpresaController {
  static async list(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection, created_at_inicio, created_at_fim } = req.query as Record<string, string>;
      const result = await SaasDadosEmpresaService.list({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        sortColumn,
        sortDirection: sortDirection as 'asc' | 'desc',
        created_at_inicio: created_at_inicio || undefined,
        created_at_fim: created_at_fim || undefined,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err, 'Erro ao listar empresas', 500, true);
    }
  }

  static async getById(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const empresa = await SaasDadosEmpresaService.getById(Number(req.params.id));
      if (!empresa) { sendNotFound(res, 'Empresa não encontrada'); return; }
      sendSuccess(res, empresa);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar empresa', 500, true);
    }
  }

  static async create(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = empresaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          acc[f] = acc[f] || [];
          acc[f].push(d.message);
          return acc;
        }, {}));
        return;
      }
      const empresa = await SaasDadosEmpresaService.create(value);
      const empresaIdAudit = getEmpresaIdOrNull(req) ?? empresa.id ?? null;
      await registrarCriacao(req as any, 'SaasDadosEmpresa', empresa.id, empresa.toJSON() as Record<string, unknown>, undefined, empresaIdAudit);
      res.status(201).json({ success: true, message: 'Empresa criada com sucesso', data: empresa });
    } catch (err) {
      sendError(res, err, 'Erro ao criar empresa', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = empresaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          acc[f] = acc[f] || [];
          acc[f].push(d.message);
          return acc;
        }, {}));
        return;
      }
      const empresaAntiga = await SaasDadosEmpresaService.getById(Number(req.params.id));
      await SaasDadosEmpresaService.update(Number(req.params.id), value);
      if (empresaAntiga) {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? empresaAntiga.id ?? null;
        await registrarAtualizacao(req as any, 'SaasDadosEmpresa', Number(req.params.id),
          empresaAntiga.toJSON() as Record<string, unknown>,
          { ...empresaAntiga.toJSON(), ...value } as Record<string, unknown>,
          undefined, empresaIdAudit);
      }
      sendSuccess(res, null, 'Empresa atualizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar empresa', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const empresaAntiga = await SaasDadosEmpresaService.getById(Number(req.params.id));
      await SaasDadosEmpresaService.delete(Number(req.params.id));
      if (empresaAntiga) {
        const empresaIdAudit = getEmpresaIdOrNull(req) ?? empresaAntiga.id ?? null;
        await registrarExclusao(req as any, 'SaasDadosEmpresa', Number(req.params.id), empresaAntiga.toJSON() as Record<string, unknown>, undefined, empresaIdAudit);
      }
      sendSuccess(res, null, 'Empresa removida com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao remover empresa', 500, true);
    }
  }

  static async dashboardStats(_req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const stats = await SaasDadosEmpresaService.getDashboardStats();
      sendSuccess(res, stats);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar estatísticas', 500, true);
    }
  }

  static async updateDataFimDesbloqueioManual(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { data_fim_desbloqueio_manual } = req.body as { data_fim_desbloqueio_manual?: string | null };
      if (!id || Number.isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      const value = data_fim_desbloqueio_manual == null || data_fim_desbloqueio_manual === ''
        ? null
        : String(data_fim_desbloqueio_manual).trim().slice(0, 10) || null;
      const [affected] = await SaasDadosEmpresa.update(
        { data_fim_desbloqueio_manual: value },
        { where: { id } }
      );
      if (affected === 0) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      sendSuccess(res, { data_fim_desbloqueio_manual: value }, 'Data atualizada');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar data', 500, true);
    }
  }

  static async desbloquearManual(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (!id || Number.isNaN(id)) {
        sendValidationError(res, 'ID inválido');
        return;
      }
      const result = await DesbloqueioManualService.desbloquear(id);
      if (!result.success) {
        sendError(res, new Error(result.message), result.message, 400, false);
        return;
      }
      sendSuccess(res, result.data, result.message);
    } catch (err) {
      sendError(res, err, 'Erro ao desbloquear empresa', 500, true);
    }
  }
}

export default SaasDadosEmpresaController;
