import { Request, Response, NextFunction } from 'express';
import { getEmpresaIdOrNull } from '../../utils/tenantUtils';
import { getModulosDoPlano } from '../../services/saas/PlanoModulosService';
import { MODULO_ROTAS } from '../../constants/planoModulos';
import type { PlanoModuloId } from '../../constants/planoModulos';

/** Rotas que NUNCA passam pela verificação de módulo (SuperAdmin, auth, etc) */
const ROTAS_IGNORADAS = [
  '/api/saas/',
  '/api/auth',
  '/api/plano-modulos',
  '/api/dados-empresa',
  '/api/health',
];

function pathMatchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function modulosRequeridosPorPath(path: string): PlanoModuloId[] {
  const modulos: PlanoModuloId[] = [];
  for (const [moduloId, prefixes] of Object.entries(MODULO_ROTAS)) {
    for (const prefix of prefixes) {
      if (pathMatchesPrefix(path, prefix)) {
        modulos.push(moduloId as PlanoModuloId);
        break;
      }
    }
  }
  return modulos;
}

export async function planoModuloMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const path = (req.originalUrl || req.url || req.path || '').split('?')[0] || '';

  if (ROTAS_IGNORADAS.some((r) => path.startsWith(r))) {
    next();
    return;
  }

  const empresaId = getEmpresaIdOrNull(req);
  if (!empresaId) {
    next();
    return;
  }

  const modulosRequeridos = modulosRequeridosPorPath(path);
  if (modulosRequeridos.length === 0) {
    next();
    return;
  }

  try {
    const modulos = await getModulosDoPlano(empresaId);
    if (modulos === null) {
      next();
      return;
    }
    if (modulosRequeridos.every((moduloRequerido) => modulos.includes(moduloRequerido))) {
      next();
      return;
    }
  } catch {
    next();
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Módulo não incluído no seu plano. Entre em contato para fazer upgrade.',
  });
}
