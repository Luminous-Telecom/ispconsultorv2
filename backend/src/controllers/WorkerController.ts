import { Request, Response } from 'express';
import { SchedulerService } from '../services/SchedulerService';

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
    } catch (error: any) {
      console.error('Erro ao obter status dos workers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
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
    } catch (error: any) {
      console.error('Erro ao obter status de saúde:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
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
    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
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
    } catch (error: any) {
      console.error('Erro ao executar rotina:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
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
    } catch (error: any) {
      console.error('Erro ao obter logs de execução:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
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
    } catch (error: any) {
      console.error('Erro ao obter logs recentes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }
}

