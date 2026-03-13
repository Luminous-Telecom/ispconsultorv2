import { Response } from 'express';
import Joi from 'joi';
import { SaasPlanoService } from '../../../services/saas/SaasPlanoService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendValidationError, sendNotFound } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';

const schema = Joi.object({
  nome: Joi.string().max(100).required(),
  descricao: Joi.string().optional().allow('', null),
  valor_mensal: Joi.number().min(0).required(),
  valor_anual: Joi.number().min(0).optional().allow(null),
  limite_usuarios: Joi.number().integer().min(1).required(),
  recursos: Joi.object().optional().allow(null),
  ativo: Joi.boolean().optional(),
});

export class SaasPlanoController {
  static async list(_req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const planos = await SaasPlanoService.list();
      sendSuccess(res, planos);
    } catch (err) {
      sendError(res, err, 'Erro ao listar planos', 500, true);
    }
  }

  static async getById(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const plano = await SaasPlanoService.getById(Number(req.params.id));
      if (!plano) { sendNotFound(res, 'Plano não encontrado'); return; }
      sendSuccess(res, plano);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar plano', 500, true);
    }
  }

  static async create(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          acc[f] = acc[f] || [];
          acc[f].push(d.message);
          return acc;
        }, {}));
        return;
      }
      const plano = await SaasPlanoService.create(value);
      await registrarCriacao(req as any, 'SaasPlano', plano.id, plano.toJSON() as Record<string, unknown>, undefined, null);
      res.status(201).json({ success: true, message: 'Plano criado com sucesso', data: plano });
    } catch (err) {
      sendError(res, err, 'Erro ao criar plano', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, d) => {
          const f = d.path.join('.') || 'general';
          acc[f] = acc[f] || [];
          acc[f].push(d.message);
          return acc;
        }, {}));
        return;
      }
      const planoAntigo = await SaasPlanoService.getById(Number(req.params.id));
      await SaasPlanoService.update(Number(req.params.id), value);
      if (planoAntigo) {
        await registrarAtualizacao(req as any, 'SaasPlano', Number(req.params.id),
          planoAntigo.toJSON() as Record<string, unknown>,
          { ...planoAntigo.toJSON(), ...value } as Record<string, unknown>,
          undefined, null);
      }
      sendSuccess(res, null, 'Plano atualizado com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar plano', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const planoAntigo = await SaasPlanoService.getById(Number(req.params.id));
      await SaasPlanoService.delete(Number(req.params.id));
      if (planoAntigo) {
        await registrarExclusao(req as any, 'SaasPlano', Number(req.params.id), planoAntigo.toJSON() as Record<string, unknown>, undefined, null);
      }
      sendSuccess(res, null, 'Plano removido com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao remover plano', 500, true);
    }
  }
}

export default SaasPlanoController;
