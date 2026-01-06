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
 * Interface para dados do usuário autenticado
 */
export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
  role: string;
}

