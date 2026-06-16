import { IRoutine, RoutineResult } from '../../../interfaces/IRoutine';
import type { JsonValue } from '../../../types/index';
import { TituloStatusSyncService } from '../../financeiro/TituloStatusSyncService';

export class ConsultarTitulosEfiRoutine implements IRoutine {
  async execute(_config: Record<string, JsonValue> = {}): Promise<RoutineResult> {
    const resultado = await TituloStatusSyncService.syncEfi();
    return {
      success: resultado.success,
      message: resultado.message,
      data: {
        total: resultado.total,
        consultados: resultado.consultados,
        atualizados: resultado.atualizados,
        erros: resultado.erros,
        sem_alteracao: resultado.sem_alteracao,
      },
    };
  }
}
