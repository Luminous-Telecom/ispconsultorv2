import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';
import { logger } from '../../../utils/logger';
import type { JsonValue } from '../../../types/index';
import {
  criarLogExecucaoMysql,
  atualizarLogExecucaoMysql,
  buscarLogsExecucaoMysql,
} from '../RotinaExecucaoLogService';

type AnyRoutine = ScheduledRoutine | SaasScheduledRoutine;

interface UpdateLogData {
  status: 'sucesso' | 'erro';
  data_fim: Date;
  duracao_ms: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
}

export class RoutineLogService {
  public async createExecutionLog(
    routine: AnyRoutine,
    startTime: Date
  ): Promise<{ id: string }> {
    try {
      const origem = 'empresa_id' in routine && routine.empresa_id != null ? 'erp' : 'saas';
      const empresaId =
        'empresa_id' in routine ? (routine as ScheduledRoutine).empresa_id : null;
      return await criarLogExecucaoMysql(
        routine.id,
        routine.nome ?? 'Rotina',
        routine.tipo ?? 'unknown',
        startTime,
        origem === 'erp' ? 'erp' : 'saas',
        empresaId
      );
    } catch (error) {
      logger.error('Erro ao criar log de execução', {
        context: 'RoutineLogService',
        action: 'createExecutionLog',
        rotinaId: routine.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  public async updateExecutionLog(logId: string, data: UpdateLogData): Promise<void> {
    try {
      await atualizarLogExecucaoMysql(logId, data);
    } catch (error) {
      logger.error('Erro ao atualizar log de execução', {
        context: 'RoutineLogService',
        action: 'updateExecutionLog',
        logId,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  public async updateExecutionLogError(
    logId: string,
    error: string,
    endTime: Date,
    duration: number
  ): Promise<void> {
    try {
      await atualizarLogExecucaoMysql(logId, {
        status: 'erro',
        data_fim: endTime,
        duracao_ms: duration,
        erro: error,
      });
    } catch (err) {
      logger.error('Erro ao atualizar log de execução com erro', {
        context: 'RoutineLogService',
        action: 'updateExecutionLogError',
        logId,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
      throw err;
    }
  }

  public async updateRoutineCounters(
    routine: AnyRoutine,
    status: 'sucesso' | 'erro',
    endTime: Date
  ): Promise<void> {
    try {
      const model = routine as unknown as {
        increment: (f: string) => Promise<unknown>;
        update: (a: object) => Promise<unknown>;
      };
      await model.increment('total_execucoes');
      if (status === 'sucesso') {
        await model.increment('execucoes_com_sucesso');
      } else {
        await model.increment('execucoes_com_erro');
      }
      await model.update({ ultima_execucao: endTime });
    } catch (error) {
      logger.error('Erro ao atualizar contadores da rotina', {
        context: 'RoutineLogService',
        action: 'updateRoutineCounters',
        rotinaId: routine.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      throw error;
    }
  }

  public async getExecutionLogs(routineId?: number): Promise<Array<Record<string, unknown>>> {
    return buscarLogsExecucaoMysql(routineId, 100);
  }

  public async getRecentExecutionLogs(limit = 10): Promise<Array<Record<string, unknown>>> {
    return buscarLogsExecucaoMysql(undefined, limit);
  }

  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    const routines = await ScheduledRoutine.findAll({ order: [['id', 'ASC']] });
    for (const routine of routines) {
      const logs = await buscarLogsExecucaoMysql(routine.id, 5);
      (routine as any).dataValues.executionLogs = logs;
    }
    return routines;
  }

  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) return null;
    const logs = await buscarLogsExecucaoMysql(id, 10);
    (routine as any).dataValues.executionLogs = logs;
    return routine;
  }
}

export default RoutineLogService;
