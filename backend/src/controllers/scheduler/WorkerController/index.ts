import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';
import { parseBoundedPositiveInt } from '../../../utils/listQuery';

export class WorkerController {
  /**
   * Obtém status dos workers
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = SchedulerService.getInstance();
      const status = schedulerService.getWorkersStatus();

      sendSuccess(res, status);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter status dos workers', 500, true, {
        context: 'WorkerController',
        action: 'getStatus'
      });
    }
  }

  /**
   * Obtém status de saúde do sistema
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = SchedulerService.getInstance();
      const health = await schedulerService.getHealthStatus();

      sendSuccess(res, health);
    } catch (error: unknown) {
      sendError(res, error, 'Erro interno do servidor', 500, true, {
        context: 'WorkerController',
        action: 'getHealth'
      });
    }
  }

  /**
   * Obtém estatísticas detalhadas
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const daysNumber = parseBoundedPositiveInt(req.query.days, {
        defaultValue: 7,
        min: 1,
        max: 365,
      });

      const schedulerService = SchedulerService.getInstance();
      const stats = await schedulerService.getDetailedStats();

      sendSuccess(res, stats);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter estatísticas', 500, true, {
        context: 'WorkerController',
        action: 'getStats',
        query: req.query
      });
    }
  }

  /**
   * Executa rotina manualmente
   */
  static async executeRoutine(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = parseInt(id, 10);

      if (isNaN(routineId)) {
        sendValidationError(res, 'ID da rotina inválido');
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      await schedulerService.executeRoutineManually(routineId);

      sendSuccess(res, undefined, 'Rotina executada com sucesso');
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao executar rotina', 500, true, {
        context: 'WorkerController',
        action: 'executeRoutine',
        rotinaId: req.params.id
      });
    }
  }

  /**
   * Obtém logs de execução de uma rotina
   */
  static async getExecutionLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routineId = parseInt(id, 10);
      const limitNumber = parseBoundedPositiveInt(req.query.limit, {
        defaultValue: 50,
        min: 1,
        max: 1000,
      });

      if (isNaN(routineId)) {
        sendValidationError(res, 'ID da rotina inválido');
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const logs = await schedulerService.getExecutionLogs(routineId);

      sendSuccess(res, logs);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter logs de execução', 500, true, {
        context: 'WorkerController',
        action: 'getExecutionLogs',
        rotinaId: req.params.id,
        query: req.query
      });
    }
  }

  /**
   * Obtém logs de execução recentes
   */
  static async getRecentLogs(req: Request, res: Response): Promise<void> {
    try {
      const limitNumber = parseBoundedPositiveInt(req.query.limit, {
        defaultValue: 100,
        min: 1,
        max: 1000,
      });

      const schedulerService = SchedulerService.getInstance();
      const logs = await schedulerService.getRecentExecutionLogs(limitNumber);

      sendSuccess(res, logs);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao obter logs recentes', 500, true, {
        context: 'WorkerController',
        action: 'getRecentLogs',
        query: req.query
      });
    }
  }
}

