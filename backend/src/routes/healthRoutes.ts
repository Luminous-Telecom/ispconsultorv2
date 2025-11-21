/**
 * Rotas de health check e monitoramento
 */
import { Router, Request, Response } from 'express';
import { SchedulerService } from '../services/SchedulerService';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { getMetrics, isMetricsEnabled } from '../utils/metrics';

const router = Router();

/**
 * Health check básico
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Verificar conexão com banco de dados
    await sequelize.authenticate();

    const scheduler = SchedulerService.getInstance();
    const schedulerHealth = scheduler.getHealthStatus();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      scheduler: {
        status: schedulerHealth.status,
        isRunning: schedulerHealth.isRunning,
        activeJobs: schedulerHealth.activeJobs
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    });
  } catch (error) {
    logger.error('Health check falhou', {
      context: 'HealthRoutes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

/**
 * Health check detalhado
 */
router.get('/health/detailed', async (_req: Request, res: Response): Promise<void> => {
  try {
    await sequelize.authenticate();

    const scheduler = SchedulerService.getInstance();
    const stats = scheduler.getDetailedStats();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      scheduler: stats.scheduler,
      system: stats.system,
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    });
  } catch (error) {
    logger.error('Health check detalhado falhou', {
      context: 'HealthRoutes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });

    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Service unavailable'
    });
  }
});

/**
 * Endpoint de métricas Prometheus
 * Disponível apenas se ENABLE_METRICS=true
 * Se não estiver habilitado, a rota nem é registrada (retorna 404 naturalmente)
 */
if (isMetricsEnabled()) {
  router.get('/metrics', async (_req: Request, res: Response): Promise<void> => {
    try {
      const metricsData = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metricsData);
    } catch (error) {
      logger.error('Erro ao obter métricas', {
        context: 'HealthRoutes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });

      res.status(500).json({
        error: 'Erro ao obter métricas'
      });
    }
  });
}

export default router;

