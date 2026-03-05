import { Response } from 'express';
import Joi from 'joi';
import { SaasDadosEmpresaService } from '../../../services/saas/SaasDadosEmpresaService';
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
      const { page, limit, search, sortColumn, sortDirection } = req.query as Record<string, string>;
      const result = await SaasDadosEmpresaService.list({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
        search,
        sortColumn,
        sortDirection: sortDirection as 'asc' | 'desc',
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
      await SaasDadosEmpresaService.update(Number(req.params.id), value);
      sendSuccess(res, null, 'Empresa atualizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar empresa', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      await SaasDadosEmpresaService.delete(Number(req.params.id));
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
}

export default SaasDadosEmpresaController;
