import { JsonValue } from '../../types/index';

export interface RoutineResult {
  success: boolean;
  message: string;
  data?: Record<string, JsonValue>;
  /** BloquearSaasAtrasoRoutine: quantidade de empresas bloqueadas */
  empresasBloqueadas?: number;
  /** BloquearSaasAtrasoRoutine: quantidade de empresas desbloqueadas */
  empresasDesbloqueadas?: number;
}

export interface IRoutine {
  execute(config: Record<string, JsonValue>): Promise<RoutineResult>;
}

