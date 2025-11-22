import { ScheduledRoutine, RoutineExecutionLog } from '../models';
import { logger } from '../utils/logger';
import type { JsonValue } from '../types';
import type { RoutineExecutionResult } from '../types/scheduler';

/**
 * Dados para atualizar um log de execução
 */
interface UpdateLogData {
  status: 'sucesso' | 'erro';
  data_fim: Date;
  duracao_ms: number;
  resultado?: Record<string, JsonValue>;
  erro?: string;
}

/**
 * Serviço responsável por gerenciar logs de execução de rotinas,
 * histórico e atualização de status no banco de dados.
 * 
 * @class RoutineLogService
 */
export class RoutineLogService {
  /**
   * Cria um log inicial de execução
   * @param routineId - ID da rotina
   * @param startTime - Data/hora de início
   * @returns Log criado
   */
  public async createExecutionLog(
    routineId: number,
    startTime: Date
  ): Promise<RoutineExecutionLog> {
    try {
      const executionLog = await RoutineExecutionLog.create({
        routine_id: routineId,
        status: 'executando',
        data_inicio: startTime,
        created_at: new Date()
      });

      return executionLog;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao criar log de execução', {
        context: 'RoutineLogService',
        action: 'createExecutionLog',
        rotinaId: routineId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Atualiza um log de execução com resultado de sucesso
   * @param logId - ID do log
   * @param data - Dados para atualização
   */
  public async updateExecutionLog(
    logId: number,
    data: UpdateLogData
  ): Promise<void> {
    try {
      await RoutineExecutionLog.update(
        {
          status: data.status,
          data_fim: data.data_fim,
          duracao_ms: data.duracao_ms,
          resultado: data.resultado
        },
        {
          where: { id: logId }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar log de execução', {
        context: 'RoutineLogService',
        action: 'updateExecutionLog',
        logId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Atualiza um log de execução com erro
   * @param logId - ID do log
   * @param error - Mensagem de erro
   * @param endTime - Data/hora de fim
   * @param duration - Duração em milissegundos
   */
  public async updateExecutionLogError(
    logId: number,
    error: string,
    endTime: Date,
    duration: number
  ): Promise<void> {
    try {
      await RoutineExecutionLog.update(
        {
          status: 'erro',
          data_fim: endTime,
          duracao_ms: duration,
          erro: error
        },
        {
          where: { id: logId }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar log de execução com erro', {
        context: 'RoutineLogService',
        action: 'updateExecutionLogError',
        logId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Atualiza os contadores de uma rotina após execução
   * @param routine - Rotina a atualizar
   * @param status - Status da execução ('sucesso' ou 'erro')
   * @param endTime - Data/hora de fim da execução
   */
  public async updateRoutineCounters(
    routine: ScheduledRoutine,
    status: 'sucesso' | 'erro',
    endTime: Date
  ): Promise<void> {
    try {
      await routine.increment('total_execucoes');
      
      if (status === 'sucesso') {
        await routine.increment('execucoes_com_sucesso');
      } else {
        await routine.increment('execucoes_com_erro');
      }
      
      await routine.update({ ultima_execucao: endTime });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao atualizar contadores da rotina', {
        context: 'RoutineLogService',
        action: 'updateRoutineCounters',
        rotinaId: routine.id,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Busca logs de execução, opcionalmente filtrados por rotina
   * @param routineId - ID da rotina (opcional)
   * @returns Array de logs com informações da rotina
   */
  public async getExecutionLogs(routineId?: number): Promise<Array<RoutineExecutionLog & {
    routine?: Pick<ScheduledRoutine, 'nome' | 'tipo'>;
  }>> {
    const where: { routine_id?: number } = {};
    if (routineId) {
      where.routine_id = routineId;
    }

    try {
      const logs = await RoutineExecutionLog.findAll({
        where,
        include: [{
          model: ScheduledRoutine,
          as: 'routine',
          attributes: ['nome', 'tipo']
        }],
        order: [['created_at', 'DESC']],
        limit: 100
      });

      return logs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar logs', {
        context: 'RoutineLogService',
        action: 'getExecutionLogs',
        rotinaId: routineId,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Busca os logs de execução mais recentes
   * @param limit - Limite de registros (padrão: 10)
   * @returns Array de logs recentes com informações da rotina
   */
  public async getRecentExecutionLogs(
    limit = 10
  ): Promise<Array<RoutineExecutionLog & {
    routine?: Pick<ScheduledRoutine, 'nome' | 'tipo'>;
  }>> {
    try {
      const logs = await RoutineExecutionLog.findAll({
        include: [{
          model: ScheduledRoutine,
          as: 'routine',
          attributes: ['nome', 'tipo']
        }],
        order: [['created_at', 'DESC']],
        limit
      });

      return logs;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar logs recentes', {
        context: 'RoutineLogService',
        action: 'getRecentExecutionLogs',
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Busca todas as rotinas com seus logs recentes
   * @returns Array de rotinas com logs
   */
  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    try {
      return await ScheduledRoutine.findAll({
        include: [{
          model: RoutineExecutionLog,
          as: 'executionLogs',
          limit: 5,
          order: [['created_at', 'DESC']]
        }]
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar todas as rotinas', {
        context: 'RoutineLogService',
        action: 'getAllRoutines',
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }

  /**
   * Busca uma rotina por ID com seus logs
   * @param id - ID da rotina
   * @returns Rotina encontrada ou null
   */
  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    try {
      return await ScheduledRoutine.findByPk(id, {
        include: [{
          model: RoutineExecutionLog,
          as: 'executionLogs',
          limit: 10,
          order: [['created_at', 'DESC']]
        }]
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao buscar rotina por ID', {
        context: 'RoutineLogService',
        action: 'getRoutineById',
        rotinaId: id,
        error: errorMessage,
        stack: errorStack
      });
      throw error;
    }
  }
}

export default RoutineLogService;

