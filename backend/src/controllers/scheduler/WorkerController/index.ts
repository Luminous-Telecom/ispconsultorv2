import { Request, Response } from 'express';
import { SchedulerService } from '../../../services/scheduler/SchedulerService';
import { logger } from '../../../utils/logger';

export class WorkerController {
  /**
   * Obtém status dos workers
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const schedulerService = SchedulerService.getInstance();
      const status = schedulerService.getWorkersStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter status dos workers', {
        context: 'WorkerController',
        action: 'getStatus',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
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

      res.json({
        success: true,
        data: health
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter status de saúde', {
        context: 'WorkerController',
        action: 'getHealth',
        error: errorMessage,
        stack: errorStack
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
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
        res.status(400).json({
          success: false,
          error: 'Parâmetro days deve ser um número entre 1 e 365'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const stats = schedulerService.getDetailedStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter estatísticas', {
        context: 'WorkerController',
        action: 'getStats',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
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
        res.status(400).json({
          success: false,
          error: 'ID da rotina inválido'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      await schedulerService.executeRoutineManually(routineId);

      res.json({
        success: true,
        message: 'Rotina executada com sucesso'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina', {
        context: 'WorkerController',
        action: 'executeRoutine',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
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
        res.status(400).json({
          success: false,
          error: 'ID da rotina inválido'
        });
        return;
      }

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro limit deve ser um número entre 1 e 1000'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const logs = await schedulerService.getExecutionLogs(routineId);

      res.json({
        success: true,
        data: logs
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter logs de execução', {
        context: 'WorkerController',
        action: 'getExecutionLogs',
        error: errorMessage,
        stack: errorStack,
        rotinaId: req.params.id,
        query: req.query
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
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
        res.status(400).json({
          success: false,
          error: 'Parâmetro limit deve ser um número entre 1 e 1000'
        });
        return;
      }

      const schedulerService = SchedulerService.getInstance();
      const logs = await schedulerService.getRecentExecutionLogs(limitNumber);

      res.json({
        success: true,
        data: logs
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao obter logs recentes', {
        context: 'WorkerController',
        action: 'getRecentLogs',
        error: errorMessage,
        stack: errorStack,
        query: req.query
      });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  }
}

