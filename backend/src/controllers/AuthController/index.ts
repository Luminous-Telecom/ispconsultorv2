import { Request, Response } from 'express';
import Joi from 'joi';
import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { logger } from '../../utils/logger';
import { Usuario } from '../../models/Usuario';
import { registrarLogin } from '../../services/sistema/AuditoriaService';
import type { AuthenticatedRequest as AuthRequest } from '../../types/auth';

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
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: error.details.reduce<Record<string, string[]>>((acc, detail) => {
            const field = detail.path.join('.') || 'general';
            acc[field] = acc[field] || [];
            acc[field].push(detail.message);
            return acc;
          }, {}),
        });
        return;
      }

      const usuario = await Usuario.scope('withPassword').findOne({
        where: {
          email: value.email.toLowerCase(),
          ativo: true,
        },
      });

      if (!usuario) {
        res.status(401).json({
          success: false,
          message: 'Credenciais inválidas',
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(value.password, usuario.password_hash);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Credenciais inválidas',
        });
        return;
      }

      const token = buildToken({
        sub: String(usuario.id),
        email: usuario.email,
        role: usuario.role,
      });

      await usuario.update(
        {
          ultimo_login: new Date(),
        },
        { fields: ['ultimo_login'] }
      );

      // Registrar login na auditoria
      const authReq = req as unknown as AuthRequest;
      authReq.user = { id: usuario.id, nome: usuario.nome, email: usuario.email };
      await registrarLogin(authReq, usuario.id, 'Login realizado com sucesso');

      logger.info('Login realizado com sucesso', {
        usuario_id: usuario.id,
        email: usuario.email,
        path: '/api/auth/login',
      });

      res.json({
        success: true,
        message: 'Autenticação realizada com sucesso',
        data: {
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
        },
      });
    } catch (err) {
      logger.error('Erro inesperado durante login', {
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      const userPayload = authenticatedReq.user as JwtPayload;

      if (!userPayload || !userPayload.sub) {
        res.status(401).json({
          success: false,
          message: 'Token inválido',
        });
        return;
      }

      const usuario = await Usuario.findByPk(userPayload.sub);

      if (!usuario) {
        res.status(404).json({
          success: false,
          message: 'Usuário não encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          precisaTrocarSenha: usuario.precisa_trocar_senha,
          ultimoLogin: usuario.ultimo_login,
        },
      });
    } catch (err) {
      logger.error('Erro ao buscar usuário atual', {
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
      });
    }
  }
}

export default AuthController;

