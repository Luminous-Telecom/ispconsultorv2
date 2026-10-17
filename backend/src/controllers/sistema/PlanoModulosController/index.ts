import { Response } from 'express';
import { sendSuccess } from '../../../utils/responseUtils';
import type { AuthenticatedRequest } from '../../../types/auth';

/**
 * GET /api/plano-modulos
 * Esta instalação não vende plano: todos os módulos ficam liberados.
 */
export async function getModulos(_req: AuthenticatedRequest, res: Response): Promise<void> {
  sendSuccess(res, { modulos: null });
}
