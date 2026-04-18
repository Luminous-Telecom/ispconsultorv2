import { EventEmitter } from 'events';
import { WorkerManager } from '../WorkerManager';
import ScheduledRoutine from '../../models/sistema/ScheduledRoutine';
import { logger } from '../../utils/logger';
import { buscarLogsExecucaoElasticsearch } from '../../services/elasticsearch/RoutineLogElasticsearchService';

export interface MonitorConfig {
  healthCheckInterval?: number;
  logRetentionDays?: number;
  alertThresholds?: {
    maxExecutionTime?: number;
    maxErrorRate?: number;
    maxConsecutiveFailures?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  workers: {
    active: number;
    max: number;
    utilization: number;
  };
  executions: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  alerts: string[];
}

interface DailyStats {
  date: string;
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
}

interface DetailedStats {
  period: {
    days: number;
    startDate: Date;
    endDate: Date;
  };
  totalExecutions: number;
  successRate: number;
  dailyStats: DailyStats[];
  workersStatus: ReturnType<WorkerManager['getStatus']>;
}

interface RoutineFailedData {
  routine: ScheduledRoutine;
  error: Error;
}

export class WorkerMonitor extends EventEmitter {
  private static instance: WorkerMonitor;
  private config: Required<MonitorConfig>;
  private isRunning = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private workerManager: WorkerManager;

  private constructor(config: MonitorConfig = {}) {
    super();
    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000,
      logRetentionDays: config.logRetentionDays || 30,
      alertThresholds: {
        maxExecutionTime: config.alertThresholds?.maxExecutionTime || 300000,
        maxErrorRate: config.alertThresholds?.maxErrorRate || 20,
        maxConsecutiveFailures: config.alertThresholds?.maxConsecutiveFailures || 3
      }
    };
    this.workerManager = WorkerManager.getInstance();
  }

  static getInstance(config?: MonitorConfig): WorkerMonitor {
    if (!WorkerMonitor.instance) {
      WorkerMonitor.instance = new WorkerMonitor(config);
    }
    return WorkerMonitor.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Erro na verificação de saúde', {
          context: 'WorkerMonitor',
          action: 'start',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
        this.emit('healthCheckError', error);
      }
    }, this.config.healthCheckInterval);

    this.scheduleLogCleanup();
    this.workerManager.on('routineCompleted', (data) => this.emit('routineCompleted', data));
    this.workerManager.on('routineFailed', (data) => {
      this.emit('routineFailed', data);
      this.checkForAlerts(data);
    });
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    this.emit('stopped');
  }

  private async performHealthCheck(): Promise<void> {
    const healthStatus = await this.getHealthStatus();
    if (healthStatus.status === 'critical') this.emit('criticalAlert', healthStatus);
    else if (healthStatus.status === 'warning') this.emit('warningAlert', healthStatus);
    this.emit('healthCheck', healthStatus);
  }

  async getHealthStatus(): Promise<HealthStatus> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const workersStatus = this.workerManager.getStatus();
    const workerUtilization = (workersStatus.activeExecutions / workersStatus.config.maxWorkers) * 100;

    const allLogs = await buscarLogsExecucaoElasticsearch(undefined, 1000);
    const executions = allLogs.filter((log) => {
      const ts = (log.timestamp as string) || (log.data_inicio as string);
      return ts && new Date(ts) >= oneHourAgo;
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e) => e.status === 'sucesso').length;
    const failedExecutions = executions.filter((e) => e.status === 'erro').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;

    const alerts: string[] = [];
    if (workerUtilization > 80) alerts.push('Alta utilização de workers');
    if (successRate < (100 - (this.config.alertThresholds.maxErrorRate || 20))) {
      alerts.push(`Taxa de erro alta: ${(100 - successRate).toFixed(1)}%`);
    }
    const longExecutions = executions.filter(
      (e) => e.duracao_ms && (e.duracao_ms as number) > (this.config.alertThresholds.maxExecutionTime || 300000)
    );
    if (longExecutions.length > 0) {
      alerts.push(`${longExecutions.length} execução(ões) com tempo excessivo`);
    }

    const status: 'healthy' | 'warning' | 'critical' = alerts.length > 2 ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy';

    return {
      status,
      timestamp: now,
      workers: {
        active: workersStatus.activeExecutions,
        max: workersStatus.config.maxWorkers,
        utilization: workerUtilization
      },
      executions: {
        total: totalExecutions,
        successful: successfulExecutions,
        failed: failedExecutions,
        successRate
      },
      alerts
    };
  }

  private async checkForAlerts(data: RoutineFailedData): Promise<void> {
    const { routine } = data;
    const allLogs = await buscarLogsExecucaoElasticsearch(routine.id, 50);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentFailures = allLogs.filter(
      (log) =>
        log.status === 'erro' &&
        new Date((log.timestamp as string) || (log.data_inicio as string)) >= oneDayAgo
    );

    if (recentFailures.length >= (this.config.alertThresholds.maxConsecutiveFailures || 3)) {
      this.emit('consecutiveFailureAlert', {
        routine,
        failureCount: recentFailures.length,
        threshold: this.config.alertThresholds.maxConsecutiveFailures || 3
      });
    }
  }

  private scheduleLogCleanup(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    const timeUntilCleanup = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.cleanupOldLogs();
      setInterval(() => this.cleanupOldLogs(), 24 * 60 * 60 * 1000);
    }, timeUntilCleanup);
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      // Retenção de logs de rotinas no Elasticsearch é feita por ILM (data stream logs-backnet-rotinas).
      // logRetentionDays permanece na config para outros usos / métricas, se necessário.
      if (this.config.logRetentionDays != null) {
        logger.debug('WorkerMonitor: retenção de logs de rotinas delegada ao ILM do Elasticsearch', {
          context: 'WorkerMonitor',
          action: 'cleanupOldLogs',
          logRetentionDays: this.config.logRetentionDays
        });
      }
    } catch (error) {
      logger.error('Erro na limpeza de logs', {
        context: 'WorkerMonitor',
        action: 'cleanupOldLogs',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      this.emit('cleanupError', error);
    }
  }

  async getDetailedStats(days = 7): Promise<DetailedStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const allLogs = await buscarLogsExecucaoElasticsearch(undefined, 10000);
    const executions = allLogs.filter((log) => {
      const ts = (log.timestamp as string) || (log.data_inicio as string);
      return ts && new Date(ts) >= startDate;
    });

    const dailyStats = new Map<string, DailyStats>();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyStats.set(dateKey, { date: dateKey, total: 0, successful: 0, failed: 0, avgDuration: 0 });
    }

    executions.forEach((execution) => {
      const ts = (execution.timestamp as string) || (execution.data_inicio as string);
      const dateKey = ts ? new Date(ts).toISOString().split('T')[0] : '';
      const dayStats = dailyStats.get(dateKey);
      if (dayStats) {
        dayStats.total++;
        if (execution.status === 'sucesso') dayStats.successful++;
        else dayStats.failed++;
        if (execution.duracao_ms) {
          dayStats.avgDuration = (dayStats.avgDuration + (execution.duracao_ms as number)) / 2;
        }
      }
    });

    const workersStatus = this.workerManager.getStatus();
    return {
      period: { days, startDate, endDate: new Date() },
      totalExecutions: executions.length,
      successRate:
        executions.length > 0
          ? (executions.filter((e) => e.status === 'sucesso').length / executions.length) * 100
          : 0,
      dailyStats: Array.from(dailyStats.values()),
      workersStatus
    };
  }

  getConfig(): Required<MonitorConfig> {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }
}

export default WorkerMonitor;
