import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { logger } from '../../../utils/logger';
import { sendSuccess, sendError, sendValidationError } from '../../../utils/responseUtils';

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
      const { days = '7' } = req.query;
      const daysNumber = parseInt(days as string, 10);

      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        sendValidationError(res, 'Parâmetro days deve ser um número entre 1 e 365');
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const stats = schedulerService.getDetailedStats();

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
      const { limit = '50' } = req.query;
      
      const routineId = parseInt(id, 10);
      const limitNumber = parseInt(limit as string, 10);

      if (isNaN(routineId)) {
        sendValidationError(res, 'ID da rotina inválido');
        return;
      }

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        sendValidationError(res, 'Parâmetro limit deve ser um número entre 1 e 1000');
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
      const { limit = '100' } = req.query;
      const limitNumber = parseInt(limit as string, 10);

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        sendValidationError(res, 'Parâmetro limit deve ser um número entre 1 e 1000');
        return;
      }

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

