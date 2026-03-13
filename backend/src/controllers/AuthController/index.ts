import { Request, Response } from 'express';
import Joi from 'joi';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { UsuarioService } from '../../services/cadastros/UsuarioService';
import { registrarLogin, registrarLogout } from '../../services/sistema/AuditoriaService/index';
import type { AuthenticatedRequest as AuthRequest } from '../../types/auth';
import { sendSuccess, sendError, sendValidationError, sendUnauthorized, sendNotFound } from '../../utils/responseUtils';
import { isProduction } from '../../utils/envUtils';

/**
 * Converte string de duração JWT (ex: '24h', '7d', '30m') para milissegundos.
 * Usado para definir o maxAge do cookie.
 */
const jwtDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000; // padrão: 24h
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
};

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
        empresa_id: usuario.empresa_id ?? null,
      });

      await UsuarioService.updateUltimoLogin(usuario.id);

      // Registrar login na auditoria
      const authReq = req as unknown as AuthRequest;
      authReq.user = { id: usuario.id, nome: usuario.nome, email: usuario.email };
      await registrarLogin(authReq, usuario.id, 'Login realizado com sucesso');

      const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

      // Setar token em cookie HttpOnly — inacessível a JavaScript (proteção XSS)
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction(),
        sameSite: 'strict',
        path: '/',
        maxAge: jwtDurationToMs(jwtExpiresIn),
      });

      logger.info('Login realizado com sucesso', {
        usuario_id: usuario.id,
        email: usuario.email,
        path: '/api/auth/login',
      });

      // Retornamos o token também no corpo para uso em Socket.IO (única exceção)
      // O frontend NÃO deve armazenar este token em localStorage
      sendSuccess(res, {
        token,
        token_type: 'Bearer',
        expires_in: jwtExpiresIn,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          empresa_id: usuario.empresa_id ?? null,
          precisaTrocarSenha: usuario.precisa_trocar_senha,
          ultimoLogin: usuario.ultimo_login,
        },
      }, 'Autenticação realizada com sucesso');
    } catch (err) {
      sendError(res, err, 'Erro inesperado durante login', 500, true);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.auth_token;
    if (cookieToken) {
      try {
        const payload = jwt.decode(cookieToken) as { sub?: string; email?: string } | null;
        if (payload?.sub) {
          const usuarioId = parseInt(payload.sub, 10);
          const authReq = req as unknown as AuthRequest;
          authReq.user = { sub: payload.sub, email: payload.email };
          registrarLogout(authReq, usuarioId, 'Logout realizado com sucesso').catch(() => { /* não crítico */ });
        }
      } catch {
        /* ignora falha ao decodificar — logout continua */
      }
    }
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: isProduction(),
      sameSite: 'strict',
      path: '/',
    });
    sendSuccess(res, null, 'Logout realizado com sucesso');
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
        empresa_id: usuario.empresa_id ?? null,
        precisaTrocarSenha: usuario.precisa_trocar_senha,
        ultimoLogin: usuario.ultimo_login,
      });
    } catch (err) {
      sendError(res, err, 'Erro ao buscar usuário atual', 500, true);
    }
  }
}

export default AuthController;

