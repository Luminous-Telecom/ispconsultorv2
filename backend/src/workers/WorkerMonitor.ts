import { EventEmitter } from 'events';
import { WorkerManager } from './WorkerManager';
import RoutineExecutionLog from '../models/RoutineExecutionLog';
import { Op } from 'sequelize';

export interface MonitorConfig {
  healthCheckInterval?: number; // em milissegundos
  logRetentionDays?: number;
  alertThresholds?: {
    maxExecutionTime?: number; // em milissegundos
    maxErrorRate?: number; // porcentagem
    maxConsecutiveFailures?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
  workers: {
    active: number;
    max: number;
    utilization: number; // porcentagem
  };
  executions: {
    total: number;
    successful: number;
    failed: number;
    successRate: number; // porcentagem
  };
  alerts: string[];
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
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 segundos
      logRetentionDays: config.logRetentionDays || 30,
      alertThresholds: {
        maxExecutionTime: config.alertThresholds?.maxExecutionTime || 300000, // 5 minutos
        maxErrorRate: config.alertThresholds?.maxErrorRate || 20, // 20%
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

  /**
   * Inicia o monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('WorkerMonitor já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('📊 Iniciando WorkerMonitor...');

    // Configurar verificação de saúde
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Erro na verificação de saúde:', error);
        this.emit('healthCheckError', error);
      }
    }, this.config.healthCheckInterval);

    // Configurar limpeza de logs
    this.scheduleLogCleanup();

    // Escutar eventos do WorkerManager
    this.workerManager.on('routineCompleted', (data) => {
      this.emit('routineCompleted', data);
    });

    this.workerManager.on('routineFailed', (data) => {
      this.emit('routineFailed', data);
      this.checkForAlerts(data);
    });

    this.emit('started');
    console.log('✅ WorkerMonitor iniciado com sucesso');
  }

  /**
   * Para o monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('🛑 Parando WorkerMonitor...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('stopped');
    console.log('✅ WorkerMonitor parado com sucesso');
  }

  /**
   * Realiza verificação de saúde
   */
  private async performHealthCheck(): Promise<void> {
    const healthStatus = await this.getHealthStatus();
    
    if (healthStatus.status === 'critical') {
      this.emit('criticalAlert', healthStatus);
    } else if (healthStatus.status === 'warning') {
      this.emit('warningAlert', healthStatus);
    }

    this.emit('healthCheck', healthStatus);
  }

  /**
   * Obtém status de saúde do sistema
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Status dos workers
    const workersStatus = this.workerManager.getStatus();
    const workerUtilization = (workersStatus.activeExecutions / workersStatus.config.maxWorkers) * 100;

    // Estatísticas de execução (última hora)
    const executions = await RoutineExecutionLog.findAll({
      where: {
        created_at: {
          [Op.gte]: oneHourAgo
        }
      }
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter((e: any) => e.status === 'sucesso').length;
    const failedExecutions = executions.filter((e: any) => e.status === 'erro').length;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100;

    // Verificar alertas
    const alerts: string[] = [];

    if (workerUtilization > 80) {
      alerts.push('Alta utilização de workers');
    }

    if (successRate < (100 - (this.config.alertThresholds.maxErrorRate || 20))) {
      alerts.push(`Taxa de erro alta: ${(100 - successRate).toFixed(1)}%`);
    }

    // Verificar execuções muito longas
    const longExecutions = executions.filter((e: any) => 
      e.duracao_ms && e.duracao_ms > (this.config.alertThresholds.maxExecutionTime || 300000)
    );
    if (longExecutions.length > 0) {
      alerts.push(`${longExecutions.length} execução(ões) com tempo excessivo`);
    }

    // Determinar status geral
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (alerts.length > 0) {
      status = alerts.length > 2 ? 'critical' : 'warning';
    }

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

  /**
   * Verifica alertas específicos
   */
  private async checkForAlerts(data: { routine: any; error: any }): Promise<void> {
    const { routine } = data;

    // Verificar falhas consecutivas
    const recentFailures = await RoutineExecutionLog.findAll({
      where: {
        routine_id: routine.id,
        status: 'erro',
        created_at: {
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
        }
      },
      order: [['created_at', 'DESC']],
      limit: this.config.alertThresholds.maxConsecutiveFailures || 3
    });

    if (recentFailures.length >= (this.config.alertThresholds.maxConsecutiveFailures || 3)) {
      this.emit('consecutiveFailureAlert', {
        routine,
        failureCount: recentFailures.length,
        threshold: this.config.alertThresholds.maxConsecutiveFailures || 3
      });
    }
  }

  /**
   * Agenda limpeza de logs antigos
   */
  private scheduleLogCleanup(): void {
    // Executar limpeza diariamente às 2:00
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const timeUntilCleanup = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.cleanupOldLogs();
      // Agendar próxima limpeza (24h)
      setInterval(() => {
        this.cleanupOldLogs();
      }, 24 * 60 * 60 * 1000);
    }, timeUntilCleanup);
  }

  /**
   * Remove logs antigos
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

      const deletedCount = await RoutineExecutionLog.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      if (deletedCount > 0) {
        console.log(`🧹 Limpeza de logs: ${deletedCount} registros removidos`);
        this.emit('logsCleaned', { deletedCount });
      }
    } catch (error) {
      console.error('Erro na limpeza de logs:', error);
      this.emit('cleanupError', error);
    }
  }

  /**
   * Obtém estatísticas detalhadas
   */
  async getDetailedStats(days: number = 7): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const executions = await RoutineExecutionLog.findAll({
      where: {
        created_at: {
          [Op.gte]: startDate
        }
      },
      order: [['created_at', 'DESC']]
    });

    // Estatísticas por dia
    const dailyStats = new Map<string, any>();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      dailyStats.set(dateKey, {
        date: dateKey,
        total: 0,
        successful: 0,
        failed: 0,
        avgDuration: 0
      });
    }

    // Processar execuções
    executions.forEach((execution: any) => {
      const dateKey = execution.created_at.toISOString().split('T')[0];
      const dayStats = dailyStats.get(dateKey);
      
      if (dayStats) {
        dayStats.total++;
        if (execution.status === 'sucesso') {
          dayStats.successful++;
        } else {
          dayStats.failed++;
        }
        
        if (execution.duracao_ms) {
          dayStats.avgDuration = (dayStats.avgDuration + execution.duracao_ms) / 2;
        }
      }
    });

    return {
      period: { days, startDate, endDate: new Date() },
      totalExecutions: executions.length,
      successRate: executions.length > 0 ? 
        (executions.filter((e: any) => e.status === 'sucesso').length / executions.length) * 100 : 0,
      dailyStats: Array.from(dailyStats.values()),
      workersStatus: this.workerManager.getStatus()
    };
  }

  /**
   * Obtém configuração atual
   */
  getConfig(): Required<MonitorConfig> {
    return { ...this.config };
  }

  /**
   * Atualiza configuração
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }
}

export default WorkerMonitor;
