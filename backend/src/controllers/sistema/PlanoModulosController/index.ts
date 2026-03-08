import { Response } from 'express';
import { getEmpresaIdOrNull } from '../../../utils/tenantUtils';
import { getModulosDoPlano } from '../../../services/saas/PlanoModulosService';
import { sendSuccess, sendError } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';

/**
 * GET /api/plano-modulos
 * Retorna os módulos habilitados no plano do tenant autenticado.
 * null = sem restrição (instalação não SaaS ou tenant sem contrato).
 */
export async function getModulos(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const empresaId = getEmpresaIdOrNull(req);
    if (!empresaId) {
      sendSuccess(res, { modulos: null });
      return;
    }
    const modulos = await getModulosDoPlano(empresaId);
    sendSuccess(res, { modulos });
  } catch (error) {
    sendError(res, error as Error, 'Erro ao buscar módulos do plano', 500, true);
  }
}
