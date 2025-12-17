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
 * Função para obter IP do cliente
 * Considera vários headers comuns de proxy reverso e load balancers
 */
function getClientIp(req: Request): string | null {
  // Headers comuns em ordem de prioridade:
  // 1. Cloudflare
  const cfConnectingIp = req.headers['cf-connecting-ip'] as string;
  if (cfConnectingIp) return cfConnectingIp.trim();

  // 2. X-Forwarded-For (pode conter múltiplos IPs, pegar o primeiro que é o cliente original)
  const xForwardedFor = req.headers['x-forwarded-for'] as string;
  if (xForwardedFor) {
    const firstIp = xForwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 3. X-Real-IP (nginx)
  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) return xRealIp.trim();

  // 4. True-Client-IP (Cloudflare Enterprise, Akamai)
  const trueClientIp = req.headers['true-client-ip'] as string;
  if (trueClientIp) return trueClientIp.trim();

  // 5. X-Client-IP
  const xClientIp = req.headers['x-client-ip'] as string;
  if (xClientIp) return xClientIp.trim();

  // 6. X-Forwarded
  const xForwarded = req.headers['x-forwarded'] as string;
  if (xForwarded) {
    const firstIp = xForwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  // 7. Forwarded-For
  const forwardedFor = req.headers['forwarded-for'] as string;
  if (forwardedFor) return forwardedFor.trim();

  // 8. Forwarded (RFC 7239)
  const forwarded = req.headers['forwarded'] as string;
  if (forwarded) {
    // Formato: "for=192.0.2.60;proto=http;by=203.0.113.43"
    const forMatch = forwarded.match(/for=([^;,\s]+)/i);
    if (forMatch && forMatch[1]) {
      // Remover aspas e colchetes se presentes
      return forMatch[1].replace(/^["\[\]]|["\[\]]$/g, '').trim();
    }
  }

  // 9. IP direto da conexão (último recurso)
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    // Remover prefixo IPv6 se presente
    return remoteAddress.replace(/^::ffff:/, '');
  }

  return null;
}

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

