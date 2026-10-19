import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../../utils/responseUtils';
import { canAccessApiPath } from '../../utils/userRoles';

export function roleAccessMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = (req as Request & { user?: { role?: string } | string }).user;
  if (!user || typeof user === 'string') {
    next();
    return;
  }

  if (!canAccessApiPath(user.role, req.originalUrl || req.path)) {
    sendForbidden(res, 'Perfil sem acesso a este recurso');
    return;
  }

  next();
}
