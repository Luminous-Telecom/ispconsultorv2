/**
 * Middleware para coletar métricas HTTP
 * Apenas ativo se ENABLE_METRICS=true
 * 
 * @module middleware/metricsMiddleware
 */
import { Request, Response, NextFunction } from 'express';
import { metrics, isMetricsEnabled } from '../utils/metrics';

/**
 * Middleware para coletar métricas de requisições HTTP
 * Mede duração, total de requisições e erros
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Se métricas não estão habilitadas, apenas passar para o próximo middleware
  if (!isMetricsEnabled() || !metrics) {
    next();
    return;
  }

  const startTime = Date.now();
  const route = req.route?.path || req.path || 'unknown';

  // Capturar resposta
  res.on('finish', () => {
    if (!metrics) {
      return; // Métricas não habilitadas ou não disponíveis
    }

    const duration = (Date.now() - startTime) / 1000; // Converter para segundos
    const method = req.method;
    const status = res.statusCode.toString();

    // Registrar duração
    metrics.httpRequestDuration.observe(
      { method, route, status },
      duration
    );

    // Incrementar contador total
    metrics.httpRequestTotal.inc({ method, route, status });

    // Registrar erros (4xx e 5xx)
    if (res.statusCode >= 400) {
      metrics.httpErrors.inc({ method, route, status });
    }
  });

  next();
}

