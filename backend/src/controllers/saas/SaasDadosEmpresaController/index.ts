import { Response } from 'express';
import Joi from 'joi';
import { DadosEmpresa } from '../../../models/sistema/DadosEmpresa';
import { SaasDadosEmpresaService } from '../../../services/saas/SaasDadosEmpresaService';
import { cache } from '../../../utils/cache';
import { DesbloqueioManualService } from '../../../services/saas/DesbloqueioManualService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { parseListQuery, parseOptionalQueryInt, queryString } from '../../../utils/listQuery';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

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
      const { page, limit, search, searchField, sortColumn, sortDirection } = parseListQuery(req.query, {
        defaultLimit: 20,
      });
      const created_at_inicio = queryString(req.query.created_at_inicio);
      const created_at_fim = queryString(req.query.created_at_fim);
      const plano_id = parseOptionalQueryInt(req.query.plano_id);
      const result = await SaasDadosEmpresaService.list({
        page,
        limit,
        search,
        searchField,
        sortColumn,
        sortDirection,
        created_at_inicio,
        created_at_fim,
        plano_id,
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
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const empresa = await SaasDadosEmpresaService.create(value);
      await registrarCriacao(req as any, 'SaasDadosEmpresa', empresa.id, empresa.toJSON() as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Empresa criada com sucesso', data: empresa });
    } catch (err) {
      sendError(res, err, 'Erro ao criar empresa', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = empresaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }
      const id = Number(req.params.id);
      const empresaAntiga = await SaasDadosEmpresaService.getById(id);
      if (!empresaAntiga) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      const empresaAtualizada = await SaasDadosEmpresaService.update(id, value);
      await registrarAtualizacao(req as any, 'SaasDadosEmpresa', id,
        empresaAntiga.toJSON() as Record<string, unknown>,
        empresaAtualizada.toJSON() as Record<string, unknown>,
        undefined, null);
      sendSuccess(res, empresaAtualizada.toJSON(), 'Empresa atualizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar empresa', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const empresaAntiga = await SaasDadosEmpresaService.getById(Number(req.params.id));
      await SaasDadosEmpresaService.delete(Number(req.params.id));
      if (empresaAntiga) {
        await registrarExclusao(req as any, 'SaasDadosEmpresa', Number(req.params.id), empresaAntiga.toJSON() as Record<string, unknown>, undefined, null);
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
      const empresaAntiga = await SaasDadosEmpresaService.getById(id);
      const [affected] = await DadosEmpresa.update(
        { data_fim_desbloqueio_manual: value },
        { where: { id } }
      );
      cache.delete(`dados_empresa:config:${id}`);
      cache.delete('dados_empresa:config');
      if (affected === 0) {
        sendNotFound(res, 'Empresa não encontrada');
        return;
      }
      if (empresaAntiga) {
        const dadosAnteriores = empresaAntiga.toJSON() as Record<string, unknown>;
        const dadosNovos = { ...dadosAnteriores, data_fim_desbloqueio_manual: value };
        await registrarAtualizacao(req as any, 'SaasDadosEmpresa', id, dadosAnteriores, dadosNovos, 'Atualização data fim desbloqueio manual', null);
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
      const empresaAntiga = await SaasDadosEmpresaService.getById(id);
      const result = await DesbloqueioManualService.desbloquear(id);
      if (!result.success) {
        sendError(res, new Error(result.message), result.message, 400, false);
        return;
      }
      if (empresaAntiga) {
        const dadosAnteriores = empresaAntiga.toJSON() as Record<string, unknown>;
        const dadosNovos = {
          ...dadosAnteriores,
          bloqueado_por_atraso: false,
          data_fim_desbloqueio_manual: result.data?.data_fim_desbloqueio_manual ?? null
        };
        await registrarAtualizacao(req as any, 'SaasDadosEmpresa', id, dadosAnteriores, dadosNovos, 'Desbloqueio manual', null);
      }
      sendSuccess(res, result.data, result.message);
    } catch (err) {
      sendError(res, err, 'Erro ao desbloquear empresa', 500, true);
    }
  }
}

export default SaasDadosEmpresaController;
