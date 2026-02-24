import { Request, Response } from 'express';
import Joi from 'joi';
import { ApiTokenService } from '../../../services/sistema/ApiTokenService';
import { sendSuccess, sendError, sendNotFound, sendValidationError } from '../../../utils/responseUtils';
import { AuthTokenPayload } from '../../../types/auth';
import { registrarCriacao, registrarExclusao } from '../../../services/sistema/AuditoriaService';

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload | string;
}

const getEmpresaId = (req: Request): number | null => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user === 'string') return null;
  return (user as AuthTokenPayload).empresa_id ?? null;
};

const getUserId = (req: Request): number | null => {
  const user = (req as AuthenticatedRequest).user;
  if (!user || typeof user === 'string') return null;
  const sub = (user as AuthTokenPayload).sub;
  return sub ? parseInt(sub, 10) : null;
};

const createSchema = Joi.object({
  nome: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Nome do token é obrigatório',
    'string.min': 'Nome deve ter no mínimo 2 caracteres'
  })
});

export class ApiTokenController {
  static async index(req: Request, res: Response): Promise<void> {
    try {
      const empresa_id = getEmpresaId(req);
      if (!empresa_id) { sendNotFound(res, 'Empresa não identificada'); return; }

      const tokens = await ApiTokenService.list(empresa_id);
      sendSuccess(res, tokens);
    } catch (error) {
      sendError(res, error, 'Erro ao listar tokens', 500, true, { context: 'ApiTokenController', action: 'index' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const empresa_id = getEmpresaId(req);
      if (!empresa_id) { sendNotFound(res, 'Empresa não identificada'); return; }

      const { error, value } = createSchema.validate(req.body);
      if (error) { sendValidationError(res, error.details[0].message); return; }

      const criado_por = getUserId(req) ?? undefined;
      const result = await ApiTokenService.create({ empresa_id, nome: value.nome, criado_por });

      registrarCriacao(req, 'ApiToken', result.token.id!, {
        nome: result.token.nome,
        token_prefix: result.token.token_prefix,
        empresa_id
      }).catch(() => {});

      sendSuccess(res, {
        token: result.token,
        token_plain: result.tokenPlain
      }, 'Token criado com sucesso. Guarde-o agora — ele não será exibido novamente.');
    } catch (error) {
      sendError(res, error, 'Erro ao criar token', 500, true, { context: 'ApiTokenController', action: 'create' });
    }
  }

  static async revoke(req: Request, res: Response): Promise<void> {
    try {
      const empresa_id = getEmpresaId(req);
      if (!empresa_id) { sendNotFound(res, 'Empresa não identificada'); return; }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { sendValidationError(res, 'ID inválido'); return; }

      const removed = await ApiTokenService.revoke(id, empresa_id);
      if (!removed) { sendNotFound(res, 'Token não encontrado'); return; }

      registrarExclusao(req, 'ApiToken', id, { empresa_id }).catch(() => {});

      sendSuccess(res, null, 'Token revogado com sucesso');
    } catch (error) {
      sendError(res, error, 'Erro ao revogar token', 500, true, { context: 'ApiTokenController', action: 'revoke' });
    }
  }
}
