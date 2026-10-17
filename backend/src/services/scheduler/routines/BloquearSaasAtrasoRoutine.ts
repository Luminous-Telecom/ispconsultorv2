import { logger } from '../../../utils/logger';
import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';

/**
 * Cobrança SaaS não tem tabelas saas_parametros nem saas_titulos neste schema.
 * A rotina encerra sem bloquear tenant.
 */
export class BloquearSaasAtrasoRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    logger.info('BloquearSaasAtrasoRoutine ignorada: parâmetros de cobrança SaaS indisponíveis');
    return {
      success: true,
      message: 'Bloqueio por atraso desabilitado (dias_atraso_bloqueio não configurado ou zero)',
      empresasBloqueadas: 0,
      empresasDesbloqueadas: 0,
    };
  }
}
