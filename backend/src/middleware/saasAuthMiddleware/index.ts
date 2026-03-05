import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '../../utils/logger';

export interface SaasAuthenticatedRequest extends Request {
  saasUser?: JwtPayload;
}

export const saasAuthMiddleware = (
  req: SaasAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({ success: false, message: 'Erro de configuração do servidor' });
    return;
  }

  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.saas_auth_token;
  const authHeader = req.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;

  const token = cookieToken || headerToken;

  if (!token) {
    res.status(401).json({ success: false, message: 'Acesso não autorizado' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as JwtPayload;

    if (!payload.saas || payload.tipo !== 'super_admin') {
      res.status(403).json({ success: false, message: 'Acesso restrito ao painel SaaS' });
      return;
    }

    req.saasUser = payload;
    next();
  } catch (err) {
    logger.warn('Falha na validação do token SaaS', {
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    });
    res.status(401).json({ success: false, message: 'Token inválido ou expirado' });
  }
};
