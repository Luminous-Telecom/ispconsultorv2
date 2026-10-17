import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import type { JsonValue } from '../../../types/index';
import {
  criarLogExecucaoMysql,
  atualizarLogExecucaoMysql,
  buscarLogsExecucaoMysql,
} from '../RotinaExecucaoLogService';

type AnyRoutine = {
  id: number;
  nome?: string | null;
  tipo?: string | null;
  empresa_id?: number | null;
  alvo?: string | null;
};

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
      const origem = routine.alvo ? 'saas' : 'erp';
      const empresaId = routine.empresa_id ?? null;
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
      if (routine.alvo) return;
      const data: { total_execucoes: { increment: number }; execucoes_com_sucesso?: { increment: number }; execucoes_com_erro?: { increment: number }; ultima_execucao: Date } = {
        total_execucoes: { increment: 1 },
        ultima_execucao: endTime,
      };
      if (status === 'sucesso') data.execucoes_com_sucesso = { increment: 1 };
      else data.execucoes_com_erro = { increment: 1 };
      await prisma.sistema_scheduled_routines.update({ where: { id: routine.id }, data });
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

  public async getAllRoutines(): Promise<Array<Record<string, unknown>>> {
    const routines = await prisma.sistema_scheduled_routines.findMany({ orderBy: { id: 'asc' } });
    const result = [];
    for (const routine of routines) {
      const logs = await buscarLogsExecucaoMysql(routine.id, 5);
      result.push({ ...routine, executionLogs: logs });
    }
    return result;
  }

  public async getRoutineById(id: number): Promise<Record<string, unknown> | null> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id } });
    if (!routine) return null;
    const logs = await buscarLogsExecucaoMysql(id, 10);
    return { ...routine, executionLogs: logs };
  }
}

export default RoutineLogService;
