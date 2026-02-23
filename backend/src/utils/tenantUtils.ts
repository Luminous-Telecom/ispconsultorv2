import { Request } from 'express';
import { AuthTokenPayload } from '../types/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload | string;
}

/**
 * Extrai o empresa_id do JWT token na requisição.
 * Lança erro se não encontrado (requisição não autenticada ou sem empresa_id).
 */
export const getEmpresaId = (req: Request): number => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user as AuthTokenPayload;

  if (!user?.empresa_id) {
    throw new Error('empresa_id não encontrado no token de autenticação');
  }

  return Number(user.empresa_id);
};

/**
 * Extrai o empresa_id de forma segura — retorna null se não houver.
 * Útil para superadmin que pode não ter empresa_id.
 */
export const getEmpresaIdOrNull = (req: Request): number | null => {
  try {
    return getEmpresaId(req);
  } catch {
    return null;
  }
};

/**
 * Verifica se o usuário é superadmin (sem restrição de empresa).
 */
export const isSuperAdmin = (req: Request): boolean => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user as AuthTokenPayload;
  return user?.role === 'superadmin';
};
