import * as cron from 'node-cron';
import { ScheduledRoutine } from '../../../models/ScheduledRoutine';
import { logger } from '../../../utils/logger';
import { buildCronExpression, validateCronExpression } from '../../../utils/SchedulerUtils';
import { RoutineExecutionService } from '../RoutineExecutionService';
import { RoutineLogService } from '../RoutineLogService';
import type { JsonValue } from '../../../types/index';
import type {
  SchedulerStatus,
  WorkersStatus,
  HealthStatus,
  DetailedStats
} from '../../../types/scheduler';

/**
 * Serviço responsável por gerenciar agendamento de rotinas (CRON jobs, filas, triggers temporais).
 * 
 * @class RoutineScheduleService
 */
export class RoutineScheduleService {
  private cronJobs: Map<number, cron.ScheduledTask> = new Map();
  private isRunning = false;
  private executionService: RoutineExecutionService;
  private logService: RoutineLogService;

  constructor() {
    this.executionService = new RoutineExecutionService();
    this.logService = new RoutineLogService();
  }

  /**
   * Inicia o scheduler e carrega rotinas ativas do banco de dados
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Carregar rotinas ativas do banco de dados
    await this.loadRoutinesFromDatabase();
  }

  /**
   * Para todos os cron jobs e limpa o scheduler
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Parar todos os cron jobs
    this.cronJobs.forEach((job, _routineId) => {
      job.destroy();
    });

    this.cronJobs.clear();
    this.isRunning = false;
  }

  /**
   * Carrega rotinas ativas do banco de dados e agenda cada uma
   */
  private async loadRoutinesFromDatabase(): Promise<void> {
    try {
      const routines = await ScheduledRoutine.findAll({
        where: { ativo: true }
      });

      for (const routine of routines) {
        await this.scheduleRoutine(routine);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao carregar rotinas do banco de dados', {
        context: 'RoutineScheduleService',
        action: 'loadRoutinesFromDatabase',
        error: errorMessage,
        stack: errorStack
      });
    }
  }

  /**
   * Agenda uma rotina específica
   * @param routine - Rotina a ser agendada
   */
  public async scheduleRoutine(routine: ScheduledRoutine): Promise<void> {
    if (!routine.ativo) {
      return;
    }

    // Parar job existente se houver
    if (this.cronJobs.has(routine.id)) {
      this.unscheduleRoutine(routine.id);
    }

    const cronExpression = buildCronExpression(routine);
    
    if (!validateCronExpression(cronExpression)) {
      logger.error('Expressão cron inválida para rotina', {
        context: 'RoutineScheduleService',
        action: 'scheduleRoutine',
        rotinaId: routine.id,
        cronExpression
      });
      return;
    }

    const job = cron.schedule(cronExpression, () => {
      // Executar em background sem aguardar
      this.runRoutine(routine).catch((error) => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Erro ao executar rotina em background', {
          context: 'RoutineScheduleService',
          action: 'scheduleRoutine',
          rotinaId: routine.id,
          error: errorMessage,
          stack: errorStack
        });
      });
    });

    job.start();
    this.cronJobs.set(routine.id, job);
  }

  /**
   * Remove o agendamento de uma rotina
   * @param routineId - ID da rotina
   */
  public unscheduleRoutine(routineId: number): void {
    const job = this.cronJobs.get(routineId);
    if (job) {
      job.destroy();
      this.cronJobs.delete(routineId);
    }
  }

  /**
   * Executa uma rotina (chamado pelo CRON job)
   * Orquestra a execução completa: cria log, executa lógica, atualiza log e contadores
   * @param routine - Rotina a ser executada
   */
  private async runRoutine(routine: ScheduledRoutine): Promise<void> {
    const startTime = new Date();
    let executionLog = null;

    try {
      // Criar log de execução
      executionLog = await this.logService.createExecutionLog(routine.id, startTime);

      // Executar a rotina baseada no tipo
      const resultado = await this.executionService.executeRoutineByType(routine);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const statusFinal = 'success' in resultado && resultado.success === false ? 'erro' : 'sucesso';

      // Atualizar log com status correto
      await this.logService.updateExecutionLog(executionLog.id, {
        status: statusFinal as 'sucesso' | 'erro',
        data_fim: endTime,
        duracao_ms: duration,
        resultado: resultado as Record<string, JsonValue>
      });

      // Atualizar contadores da rotina
      await this.logService.updateRoutineCounters(routine, statusFinal as 'sucesso' | 'erro', endTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina', {
        context: 'RoutineScheduleService',
        action: 'runRoutine',
        rotinaId: routine.id,
        rotinaNome: routine.nome,
        error: errorMessage,
        stack: errorStack
      });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      if (executionLog) {
        await this.logService.updateExecutionLogError(executionLog.id, errorMessage, endTime, duration);
      }

      // Atualizar contadores da rotina mesmo em caso de erro
      await this.logService.updateRoutineCounters(routine, 'erro', endTime);
    }
  }

  /**
   * Retorna o status atual do scheduler
   * @returns Status do scheduler
   */
  public getStatus(): SchedulerStatus {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      scheduledRoutines: Array.from(this.cronJobs.keys())
    };
  }

  /**
   * Retorna o status dos workers
   * @returns Status dos workers
   */
  public getWorkersStatus(): WorkersStatus {
    return {
      totalWorkers: this.cronJobs.size,
      activeWorkers: this.cronJobs.size,
      workers: Array.from(this.cronJobs.keys()).map(id => ({
        id,
        status: 'active',
        lastActivity: new Date()
      }))
    };
  }

  /**
   * Retorna o status de saúde do scheduler
   * @returns Health status
   */
  public getHealthStatus(): HealthStatus {
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      uptime: process.uptime()
    };
  }

  /**
   * Retorna estatísticas detalhadas do scheduler e sistema
   * @returns Estatísticas detalhadas
   */
  public getDetailedStats(): DetailedStats {
    return {
      scheduler: {
        isRunning: this.isRunning,
        activeJobs: this.cronJobs.size,
        uptime: process.uptime()
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }
}

export default RoutineScheduleService;

