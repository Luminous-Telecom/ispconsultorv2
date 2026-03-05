import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';
import { logger } from '../../../utils/logger';
import type { JsonValue } from '../../../types/index';
import {
  criarLogExecucaoElasticsearch,
  atualizarLogExecucaoElasticsearch,
  buscarLogsExecucaoElasticsearch
} from '../../elasticsearch/RoutineLogElasticsearchService';

type AnyRoutine = ScheduledRoutine | SaasScheduledRoutine;

interface UpdateLogData {
  status: 'sucesso' | 'erro';
  data_fim: Date;
  duracao_ms: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
}

/**
 * Serviço responsável por gerenciar logs de execução de rotinas no Elasticsearch.
 */
export class RoutineLogService {
  public async createExecutionLog(
    routine: AnyRoutine,
    startTime: Date
  ): Promise<{ id: string }> {
    try {
      const result = await criarLogExecucaoElasticsearch(
        routine.id,
        routine.nome ?? 'Rotina',
        routine.tipo ?? 'unknown',
        startTime
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar log de execução', {
        context: 'RoutineLogService',
        action: 'createExecutionLog',
        rotinaId: routine.id,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  public async updateExecutionLog(
    logId: string,
    data: UpdateLogData
  ): Promise<void> {
    try {
      await atualizarLogExecucaoElasticsearch(logId, {
        status: data.status,
        data_fim: data.data_fim,
        duracao_ms: data.duracao_ms,
        resultado: data.resultado
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar log de execução', {
        context: 'RoutineLogService',
        action: 'updateExecutionLog',
        logId,
        error: errorMessage
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
      await atualizarLogExecucaoElasticsearch(logId, {
        status: 'erro',
        data_fim: endTime,
        duracao_ms: duration,
        erro: error
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar log de execução com erro', {
        context: 'RoutineLogService',
        action: 'updateExecutionLogError',
        logId,
        error: errorMessage
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
      const model = routine as unknown as { increment: (f: string) => Promise<unknown>; update: (a: object) => Promise<unknown> };
      await model.increment('total_execucoes');
      if (status === 'sucesso') {
        await model.increment('execucoes_com_sucesso');
      } else {
        await model.increment('execucoes_com_erro');
      }
      await model.update({ ultima_execucao: endTime });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao atualizar contadores da rotina', {
        context: 'RoutineLogService',
        action: 'updateRoutineCounters',
        rotinaId: routine.id,
        error: errorMessage
      });
      throw error;
    }
  }

  public async getExecutionLogs(routineId?: number): Promise<Array<Record<string, unknown>>> {
    try {
      return await buscarLogsExecucaoElasticsearch(routineId, 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar logs', {
        context: 'RoutineLogService',
        action: 'getExecutionLogs',
        rotinaId: routineId,
        error: errorMessage
      });
      throw error;
    }
  }

  public async getRecentExecutionLogs(limit = 10): Promise<Array<Record<string, unknown>>> {
    try {
      return await buscarLogsExecucaoElasticsearch(undefined, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar logs recentes', {
        context: 'RoutineLogService',
        action: 'getRecentExecutionLogs',
        error: errorMessage
      });
      throw error;
    }
  }

  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    try {
      const routines = await ScheduledRoutine.findAll({
        order: [['id', 'ASC']]
      });
      for (const routine of routines) {
        const logs = await buscarLogsExecucaoElasticsearch(routine.id, 5);
        (routine as any).dataValues.executionLogs = logs;
      }
      return routines;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar todas as rotinas', {
        context: 'RoutineLogService',
        action: 'getAllRoutines',
        error: errorMessage
      });
      throw error;
    }
  }

  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    try {
      const routine = await ScheduledRoutine.findByPk(id);
      if (!routine) return null;
      const logs = await buscarLogsExecucaoElasticsearch(id, 10);
      (routine as any).dataValues.executionLogs = logs;
      return routine;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao buscar rotina por ID', {
        context: 'RoutineLogService',
        action: 'getRoutineById',
        rotinaId: id,
        error: errorMessage
      });
      throw error;
    }
  }
}

export default RoutineLogService;
