/**
 * Métricas Prometheus para monitoramento
 * Opcional: apenas ativa se ENABLE_METRICS=true nas variáveis de ambiente
 * 
 * @module utils/metrics
 * 
 * @remarks
 * - Métricas de requisições HTTP (quantidade, latência, erros)
 * - Métricas de negócio (títulos gerados, boletos pagos)
 * - Endpoint /metrics expõe dados no formato Prometheus
 * - Desabilitado por padrão para não impactar performance
 * 
 * @example
 * ```typescript
 * import { metrics } from './utils/metrics';
 * 
 * // Registrar requisição
 * metrics.httpRequestDuration.observe({ method: 'GET', route: '/api/clientes' }, duration);
 * 
 * // Incrementar contador de negócio
 * metrics.businessTitulosGerados.inc();
 * ```
 */

// Verificar se métricas estão habilitadas
const ENABLE_METRICS = process.env.ENABLE_METRICS === 'true';

// Exportar null se desabilitado (não causar erro se prom-client não instalado)
let client: typeof import('prom-client') | null = null;

try {
  if (ENABLE_METRICS) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    client = require('prom-client');
  }
} catch {
  // prom-client não instalado ou erro - métricas desabilitadas
  client = null;
}

export interface MetricsRegistry {
  httpRequestDuration: import('prom-client').Histogram<string>;
  httpRequestTotal: import('prom-client').Counter<string>;
  httpErrors: import('prom-client').Counter<string>;
  businessTitulosGerados: import('prom-client').Counter;
  businessBoletosPagos: import('prom-client').Counter;
  databaseQueryDuration: import('prom-client').Histogram<string>;
}

class MetricsManager {
  private registry: import('prom-client').Registry | null = null;
  private metrics: Partial<MetricsRegistry> | null = null;

  constructor() {
    if (!client || !ENABLE_METRICS) {
      return;
    }

    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });

    // Métricas HTTP
    this.metrics = {
      httpRequestDuration: new client.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duração das requisições HTTP em segundos',
        labelNames: ['method', 'route', 'status'],
        registers: [this.registry]
      }),

      httpRequestTotal: new client.Counter({
        name: 'http_requests_total',
        help: 'Total de requisições HTTP',
        labelNames: ['method', 'route', 'status'],
        registers: [this.registry]
      }),

      httpErrors: new client.Counter({
        name: 'http_errors_total',
        help: 'Total de erros HTTP',
        labelNames: ['method', 'route', 'status'],
        registers: [this.registry]
      }),

      // Métricas de negócio
      businessTitulosGerados: new client.Counter({
        name: 'business_titulos_gerados_total',
        help: 'Total de títulos gerados',
        registers: [this.registry]
      }),

      businessBoletosPagos: new client.Counter({
        name: 'business_boletos_pagos_total',
        help: 'Total de boletos pagos',
        registers: [this.registry]
      }),

      // Métricas de banco de dados
      databaseQueryDuration: new client.Histogram({
        name: 'database_query_duration_seconds',
        help: 'Duração de queries no banco de dados em segundos',
        labelNames: ['operation', 'table'],
        registers: [this.registry]
      })
    };
  }

  /**
   * Obter métricas no formato Prometheus
   */
  async getMetrics(): Promise<string> {
    if (!this.registry || !ENABLE_METRICS) {
      return '# Métricas desabilitadas (ENABLE_METRICS não está true)';
    }
    return await this.registry.metrics();
  }

  /**
   * Obter registro de métricas
   */
  getRegistry(): import('prom-client').Registry | null {
    return this.registry;
  }

  /**
   * Obter métricas específicas
   */
  getMetricsRegistry(): Partial<MetricsRegistry> | null {
    return this.metrics;
  }

  /**
   * Verificar se métricas estão habilitadas
   */
  isEnabled(): boolean {
    return ENABLE_METRICS && client !== null;
  }
}

const metricsManager = new MetricsManager();

// Exportar métricas se habilitadas
export const metrics = metricsManager.getMetricsRegistry() as MetricsRegistry | null;
export const registry = metricsManager.getRegistry();
export const getMetrics = () => metricsManager.getMetrics();
export const isMetricsEnabled = () => metricsManager.isEnabled();

