import { Request, Response } from 'express';
import Joi from 'joi';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { SaasAuthService } from '../../../services/saas/SaasAuthService';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized } from '../../../utils/responseUtils';
import { isProduction } from '../../../utils/envUtils';
import { logger } from '../../../utils/logger';
import { registrarLogin, registrarLogout, registrarAtualizacao } from '../../../services/sistema/AuditoriaService';
import type { SaasAuthenticatedRequest } from '../../../middleware/saasAuthMiddleware';
import { getClientIp } from '../../../utils/requestUtils';
import { joiErrorsToFieldMap } from '../../../utils/validationUtils';

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'Email é obrigatório',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Senha deve ter pelo menos 6 caracteres',
    'any.required': 'Senha é obrigatória',
  }),
});

const trocarSenhaSchema = Joi.object({
  novaSenha: Joi.string().min(8).required().messages({
    'string.min': 'Nova senha deve ter pelo menos 8 caracteres',
    'any.required': 'Nova senha é obrigatória',
  }),
});

const jwtDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] ?? 1000);
};

const buildSaasToken = (payload: Record<string, unknown>): string => {
  const jwtSecret: Secret | undefined = process.env.JWT_SECRET;
  const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

  if (!jwtSecret) throw new Error('JWT_SECRET não configurado');

  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

export class SaasAuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const usuario = await SaasAuthService.findByEmail(value.email);

      if (!usuario || !usuario.ativo) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      const senhaValida = await SaasAuthService.validatePassword(value.password, usuario.senha_hash);

      if (!senhaValida) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      const token = buildSaasToken({
        sub: String(usuario.id),
        email: usuario.email,
        tipo: 'super_admin',
        saas: true,
        nivel_acesso: usuario.nivel_acesso,
      });

      await SaasAuthService.updateUltimoLogin(usuario.id);

      (req as unknown as { saasUser?: { sub: string; email?: string; nome?: string } }).saasUser = {
        sub: String(usuario.id),
        email: usuario.email,
        nome: usuario.nome ?? undefined
      };
      await registrarLogin(req as unknown as SaasAuthenticatedRequest, usuario.id, 'Login SaaS');
      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

      res.cookie('saas_auth_token', token, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: 'strict',
        path: '/',
        maxAge: jwtDurationToMs(jwtExpiresIn),
      });

      logger.info('Login SaaS realizado', { usuario_id: usuario.id, email: usuario.email });

      sendSuccess(res, {
        token,
        token_type: 'Bearer',
        expires_in: jwtExpiresIn,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          nivel_acesso: usuario.nivel_acesso,
          precisaTrocarSenha: usuario.precisa_trocar_senha,
          ultimoLogin: usuario.ultimo_login,
        },
      }, 'Autenticação SaaS realizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro inesperado durante login SaaS', 500, true);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.saas_auth_token;
    if (cookieToken) {
      try {
        const payload = jwt.decode(cookieToken) as { sub?: string; email?: string; nome?: string } | null;
        if (payload?.sub) {
          const usuarioId = parseInt(payload.sub, 10);
          (req as unknown as { saasUser?: object }).saasUser = { sub: payload.sub, email: payload.email, nome: payload.nome };
          registrarLogout(req as unknown as SaasAuthenticatedRequest, usuarioId, 'Logout SaaS').catch(() => {});
        }
      } catch {
        /* ignora falha ao decodificar */
      }
    }
    res.clearCookie('saas_auth_token', {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'strict',
      path: '/',
    });
    sendSuccess(res, null, 'Logout realizado com sucesso');
  }

  static async me(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payload = req.saasUser;
      if (!payload?.sub) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }

      const usuario = await SaasAuthService.getById(Number(payload.sub));
      if (!usuario) {
        res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        return;
      }

      sendSuccess(res, {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel_acesso: usuario.nivel_acesso,
        precisaTrocarSenha: usuario.precisa_trocar_senha,
        ultimoLogin: usuario.ultimo_login,
      });
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário SaaS', 500, true);
    }
  }

  static async trocarSenha(req: SaasAuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { error, value } = trocarSenhaSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', joiErrorsToFieldMap(error.details));
        return;
      }

      const id = Number(req.saasUser?.sub);
      const usuarioAntes = await SaasAuthService.getById(id);
      await SaasAuthService.updateSenha(id, value.novaSenha);
      if (usuarioAntes) {
        const dadosAntes = usuarioAntes.toJSON ? usuarioAntes.toJSON() as Record<string, unknown> : {};
        delete (dadosAntes as Record<string, unknown>).senha_hash;
        await registrarAtualizacao(req as unknown as SaasAuthenticatedRequest, 'SaasUsuarioSuper', id, dadosAntes, { ...dadosAntes, senha_hash: '[ALTERADO]' }, 'Troca de senha', null);
      }
      sendSuccess(res, null, 'Senha alterada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro ao trocar senha', 500, true);
    }
  }
}

export default SaasAuthController;
