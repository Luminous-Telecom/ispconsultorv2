import { Request, Response } from 'express';
import Joi from 'joi';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { UsuarioService } from '../../services/cadastros/UsuarioService';
import { registrarLogin } from '../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest as AuthRequest } from '../../types/auth';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized, sendNotFound } from '../../utils/responseUtils';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload | string;
}

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

const buildToken = (payload: JwtPayload): string => {
  const jwtSecret: Secret | undefined = process.env.JWT_SECRET;
  const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado');
  }

  const signOptions: SignOptions = {
    expiresIn: jwtExpiresIn,
  };

  if (process.env.JWT_AUDIENCE) {
    signOptions.audience = process.env.JWT_AUDIENCE;
  }

  if (process.env.JWT_ISSUER) {
    signOptions.issuer = process.env.JWT_ISSUER;
  }

  return jwt.sign(payload, jwtSecret, signOptions);
};

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

      if (error) {
        sendValidationError(res, 'Dados inválidos', error.details.reduce<Record<string, string[]>>((acc, detail) => {
          const field = detail.path.join('.') || 'general';
          acc[field] = acc[field] || [];
          acc[field].push(detail.message);
          return acc;
        }, {}));
        return;
      }

      const usuario = await UsuarioService.findByEmailWithPassword(value.email, true);

      if (!usuario) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      const isPasswordValid = await bcrypt.compare(value.password, usuario.password_hash);

      if (!isPasswordValid) {
        sendUnauthorized(res, 'Credenciais inválidas');
        return;
      }

      const token = buildToken({
        sub: String(usuario.id),
        email: usuario.email,
        role: usuario.role,
      });

      await UsuarioService.updateUltimoLogin(usuario.id);

      // Registrar login na auditoria
      const authReq = req as unknown as AuthRequest;
      authReq.user = { id: usuario.id, nome: usuario.nome, email: usuario.email };
      await registrarLogin(authReq, usuario.id, 'Login realizado com sucesso');

      logger.info('Login realizado com sucesso', {
        usuario_id: usuario.id,
        email: usuario.email,
        path: '/api/auth/login',
      });

      sendSuccess(res, {
        token,
        token_type: 'Bearer',
        expires_in: process.env.JWT_EXPIRES_IN || '24h',
        user: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          precisaTrocarSenha: usuario.precisa_trocar_senha,
          ultimoLogin: usuario.ultimo_login,
        },
      }, 'Autenticação realizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro inesperado durante login', 500, true);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userPayload = authenticatedReq.user as JwtPayload;

      if (!userPayload || !userPayload.sub) {
        sendUnauthorized(res, 'Token inválido');
        return;
      }

      const usuario = await UsuarioService.getById(userPayload.sub);

      if (!usuario) {
        sendNotFound(res, 'Usuário não encontrado');
        return;
      }

      sendSuccess(res, {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        precisaTrocarSenha: usuario.precisa_trocar_senha,
        ultimoLogin: usuario.ultimo_login,
      });
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário atual', 500, true);
    }
  }
}

export default AuthController;

