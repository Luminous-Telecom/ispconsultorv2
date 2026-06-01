import { Response } from 'express';
import Joi from 'joi';
import { SaasUsuarioSuperService } from '../../../services/saas/SaasUsuarioSuperService';
import { registrarCriacao, registrarAtualizacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { parseListQuery } from '../../../utils/listQuery';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

const createSchema = Joi.object({
  nome: Joi.string().max(150).required(),
  email: Joi.string().email().required(),
  senha: Joi.string().min(6).required(),
  nivel_acesso: Joi.string().valid('super', 'admin', 'suporte').optional(),
  ativo: Joi.boolean().optional(),
});

const updateSchema = Joi.object({
  nome: Joi.string().max(150).optional(),
  email: Joi.string().email().optional(),
  senha: Joi.string().min(6).optional().allow('', null),
  nivel_acesso: Joi.string().valid('super', 'admin', 'suporte').optional(),
  ativo: Joi.boolean().optional(),
});

export class SaasUsuarioSuperController {
  static async list(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { page, limit, search, sortColumn, sortDirection } = parseListQuery(req.query, {
        defaultLimit: 20,
      });
      const result = await SaasUsuarioSuperService.list({
        page,
        limit,
        search,
        sortColumn,
        sortDirection,
      });
      sendSuccess(res, result);
    } catch (err) {
      sendError(res, err, 'Erro ao listar usuários', 500, true);
    }
  }

  static async getById(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuario = await SaasUsuarioSuperService.getById(Number(req.params.id));
      if (!usuario) { sendNotFound(res, 'Usuário não encontrado'); return; }
      sendSuccess(res, usuario);
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário', 500, true);
    }
  }

  static async create(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const usuario = await SaasUsuarioSuperService.create(value);
      await registrarCriacao(req as any, 'SaasUsuarioSuper', usuario.id, usuario.toJSON() as Record<string, unknown>);
      res.status(201).json({ success: true, message: 'Usuário criado com sucesso', data: usuario });
    } catch (err) {
      sendError(res, err, 'Erro ao criar usuário', 500, true);
    }
  }

  static async update(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
      if (error) { sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details)); return; }
      const usuarioAntigo = await SaasUsuarioSuperService.getById(Number(req.params.id));
      await SaasUsuarioSuperService.update(Number(req.params.id), value);
      if (usuarioAntigo) {
        await registrarAtualizacao(req as any, 'SaasUsuarioSuper', Number(req.params.id),
          usuarioAntigo.toJSON() as Record<string, unknown>,
          { ...usuarioAntigo.toJSON(), ...value } as Record<string, unknown>);
      }
      sendSuccess(res, null, 'Usuário atualizado com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao atualizar usuário', 500, true);
    }
  }

  static async delete(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      if (req.saasUser?.id === id) {
        res.status(400).json({ success: false, message: 'Não é possível remover o próprio usuário' });
        return;
      }
      const usuarioAntigo = await SaasUsuarioSuperService.getById(id);
      await SaasUsuarioSuperService.delete(id);
      if (usuarioAntigo) {
        await registrarExclusao(req as any, 'SaasUsuarioSuper', id, usuarioAntigo.toJSON() as Record<string, unknown>);
      }
      sendSuccess(res, null, 'Usuário removido com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao remover usuário', 500, true);
    }
  }
}

export default SaasUsuarioSuperController;
