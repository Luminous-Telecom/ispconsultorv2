/**
 * Rotas de health check e monitoramento
 */
import { Router, Request, Response } from 'express';
import { SchedulerService } from '../../services/scheduler/SchedulerService';
import { sequelize } from '../../config/database';
import { logger } from '../../utils/logger';
import { getMetrics, isMetricsEnabled } from '../../utils/metrics';
import { getCurrentTimestamp } from '../../utils/timezoneUtils';
import { getClientIp } from '../../utils/requestUtils';

const router = Router();

/**
 * Health check básico
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Verificar conexão com banco de dados
    await sequelize.authenticate();

    const scheduler = SchedulerService.getInstance();
    const schedulerHealth = await scheduler.getHealthStatus();

    res.json({
      status: 'ok',
      timestamp: getCurrentTimestamp(),
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
      timestamp: getCurrentTimestamp(),
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
    const stats = await scheduler.getDetailedStats();

    res.json({
      status: 'ok',
      timestamp: getCurrentTimestamp(),
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
      timestamp: getCurrentTimestamp(),
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

/**
 * Endpoint para obter IP do cliente
 */
router.get('/client-ip', (req: Request, res: Response): void => {
  try {
    const ip = getClientIp(req);
    res.json({
      success: true,
      ip: ip || 'Não disponível'
    });
  } catch (error) {
    logger.error('Erro ao obter IP do cliente', {
      context: 'HealthRoutes',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    res.status(500).json({
      success: false,
      ip: 'Erro ao obter IP'
    });
  }
});

export default router;

