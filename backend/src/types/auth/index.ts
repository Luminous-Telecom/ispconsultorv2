import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

/**
 * Interface para requisições autenticadas
 * Estende Request do Express adicionando o campo user
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload | string;
}

/**
 * Payload do JWT com suporte a multi-tenant
 */
export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: string;
  empresa_id: number;
}

/**
 * Interface para dados do usuário autenticado
 */
export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
  role: string;
  empresa_id: number;
}

