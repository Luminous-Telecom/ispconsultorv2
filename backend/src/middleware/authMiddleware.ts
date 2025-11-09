import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: jwt.JwtPayload | string;
}

const PUBLIC_ROUTES: Array<{ method?: string; path: RegExp }> = [
  { path: /^\/health$/i },
  { path: /^\/api\/health/i },
  { path: /^\/api\/auth\/login$/i },
  { path: /^\/webhook(\/.*)?$/i },
];

const isPublicRoute = (req: Request): boolean => {
  if (req.method === 'OPTIONS') {
    return true;
  }

  const cleanedPath = req.originalUrl.split('?')[0];
  return PUBLIC_ROUTES.some(({ method, path }) => {
    if (method && method.toUpperCase() !== req.method.toUpperCase()) {
      return false;
    }
    return path.test(cleanedPath);
  });
};

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const isApiRequest = /^\/api\//i.test(req.originalUrl);

  if (!isApiRequest || isPublicRoute(req)) {
    next();
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    logger.error('JWT_SECRET não está configurada nas variáveis de ambiente');
    res.status(500).json({
      success: false,
      message: 'Erro de configuração do servidor',
    });
    return;
  }

  const authHeader = req.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token de autenticação não fornecido',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Falha na validação do token JWT', {
      path: req.originalUrl,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    });

    res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado',
    });
  }
};

