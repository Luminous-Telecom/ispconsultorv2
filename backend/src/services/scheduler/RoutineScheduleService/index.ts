import * as cron from 'node-cron';
import { ScheduledRoutine } from '../../../models/sistema/ScheduledRoutine';
import SaasScheduledRoutine from '../../../models/saas/SaasScheduledRoutine';
import { logger } from '../../../utils/logger';
import { buildCronExpression, validateCronExpression } from '../../../utils/SchedulerUtils';
import { RoutineExecutionService } from '../RoutineExecutionService';
import { RoutineLogService } from '../RoutineLogService';
import { registrarExecucaoRotinaAuditoria } from '../../elasticsearch/ElasticsearchAuditService';
import type { JsonValue } from '../../../types/index';
import type {
  SchedulerStatus,
  WorkersStatus,
  HealthStatus,
  DetailedStats
} from '../../../types/scheduler';

type RoutineSource = 'erp' | 'saas';
type AnyRoutine = ScheduledRoutine | SaasScheduledRoutine;

function jobKey(source: RoutineSource, id: number): string {
  return `${source}:${id}`;
}

/**
 * Serviço responsável por gerenciar agendamento de rotinas (CRON jobs).
 * Suporta rotinas do ERP (scheduled_routines) e SaaS (saas_scheduled_routines).
 *
 * @class RoutineScheduleService
 */
export class RoutineScheduleService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;
  private executionService: RoutineExecutionService;
  private logService: RoutineLogService;

  constructor() {
    this.executionService = new RoutineExecutionService();
    this.logService = new RoutineLogService();
  }

  /**
   * Inicia o scheduler e carrega rotinas ativas do banco de dados (ERP + SaaS)
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.loadRoutinesFromDatabase();
  }

  /**
   * Para todos os cron jobs e limpa o scheduler
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.cronJobs.forEach((job) => job.destroy());
    this.cronJobs.clear();
    this.isRunning = false;
  }

  /**
   * Carrega rotinas ativas (ERP e SaaS) e agenda cada uma
   */
  private async loadRoutinesFromDatabase(): Promise<void> {
    try {
      const [erpRoutines, saasRoutines] = await Promise.all([
        ScheduledRoutine.findAll({ where: { ativo: true } }),
        SaasScheduledRoutine.findAll({ where: { ativo: true } })
      ]);

      for (const routine of erpRoutines) {
        await this.scheduleRoutine(routine);
      }
      for (const routine of saasRoutines) {
        await this.scheduleSaasRoutine(routine);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('Erro ao carregar rotinas do banco de dados', {
        context: 'RoutineScheduleService',
        action: 'loadRoutinesFromDatabase',
        error: errorMessage
      });
    }
  }

  /**
   * Agenda uma rotina do ERP
   */
  public async scheduleRoutine(routine: ScheduledRoutine): Promise<void> {
    await this.scheduleAnyRoutine(routine, 'erp');
  }

  /**
   * Agenda uma rotina do SaaS
   */
  public async scheduleSaasRoutine(routine: SaasScheduledRoutine): Promise<void> {
    await this.scheduleAnyRoutine(routine, 'saas');
  }

  private async scheduleAnyRoutine(routine: AnyRoutine, source: RoutineSource): Promise<void> {
    if (!routine.ativo) return;

    const key = jobKey(source, routine.id);
    if (this.cronJobs.has(key)) {
      this.unscheduleAnyRoutine(source, routine.id);
    }

    const cronExpression = buildCronExpression(routine);
    if (!validateCronExpression(cronExpression)) {
      logger.error('Expressão cron inválida para rotina', {
        context: 'RoutineScheduleService',
        rotinaId: routine.id,
        source,
        cronExpression
      });
      return;
    }

    const job = cron.schedule(cronExpression, () => {
      this.runAnyRoutine(routine, source).catch((error) => {
        logger.error('Erro ao executar rotina em background', {
          context: 'RoutineScheduleService',
          rotinaId: routine.id,
          source,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    });

    job.start();
    this.cronJobs.set(key, job);
  }

  /**
   * Remove o agendamento de uma rotina do ERP
   */
  public unscheduleRoutine(routineId: number): void {
    this.unscheduleAnyRoutine('erp', routineId);
  }

  /**
   * Remove o agendamento de uma rotina do SaaS
   */
  public unscheduleSaasRoutine(routineId: number): void {
    this.unscheduleAnyRoutine('saas', routineId);
  }

  private unscheduleAnyRoutine(source: RoutineSource, routineId: number): void {
    const key = jobKey(source, routineId);
    const job = this.cronJobs.get(key);
    if (job) {
      job.destroy();
      this.cronJobs.delete(key);
    }
  }

  /**
   * Executa imediatamente uma rotina SaaS (para chamada manual)
   * @param usuario - Usuário que executou manualmente (quando presente)
   * @param ipAddress - IP do cliente (quando manual)
   */
  public async executeSaasRoutineNow(routine: SaasScheduledRoutine, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<void> {
    await this.runAnyRoutine(routine, 'saas', usuario, ipAddress);
  }

  /**
   * Executa uma rotina (chamado pelo CRON job ou manualmente)
   */
  private async runAnyRoutine(routine: AnyRoutine, source: RoutineSource, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<void> {
    if (source === 'saas') {
      await this.runSaasRoutine(routine as SaasScheduledRoutine, usuario, ipAddress);
    } else {
      await this.runRoutine(routine as ScheduledRoutine);
    }
  }

  /**
   * Executa uma rotina do ERP (chamado pelo CRON job)
   */
  private async runRoutine(routine: ScheduledRoutine): Promise<void> {
    const startTime = new Date();
    let executionLog = null;

    try {
      // Criar log de execução
      executionLog = await this.logService.createExecutionLog(routine, startTime);

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

      // Registrar na auditoria principal (Logs de Agenda de Tarefas)
      await registrarExecucaoRotinaAuditoria({
        routineId: routine.id,
        routineNome: routine.nome ?? 'Rotina',
        routineTipo: routine.tipo ?? 'unknown',
        status: statusFinal as 'sucesso' | 'erro',
        duracaoMs: duration,
        empresaId: (routine as { empresa_id?: number }).empresa_id,
        saas: false,
        resultado: resultado as Record<string, unknown>
      });

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

      // Registrar falha na auditoria principal
      await registrarExecucaoRotinaAuditoria({
        routineId: routine.id,
        routineNome: routine.nome ?? 'Rotina',
        routineTipo: routine.tipo ?? 'unknown',
        status: 'erro',
        duracaoMs: duration,
        empresaId: (routine as { empresa_id?: number }).empresa_id,
        saas: false,
        erro: errorMessage
      });
    }
  }

  /**
   * Executa uma rotina do SaaS (chamado pelo CRON job ou manualmente)
   * @param usuario - Usuário que executou manualmente (quando presente)
   * @param ipAddress - IP do cliente (quando manual)
   */
  private async runSaasRoutine(routine: SaasScheduledRoutine, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<void> {
    const startTime = new Date();

    try {
      const resultado = await this.executionService.executeRoutineByType(routine);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const statusFinal = 'success' in resultado && resultado.success === false ? 'erro' : 'sucesso';

      await this.logService.updateRoutineCounters(routine, statusFinal as 'sucesso' | 'erro', endTime);

      await registrarExecucaoRotinaAuditoria({
        routineId: routine.id,
        routineNome: routine.nome ?? 'Rotina',
        routineTipo: routine.tipo ?? 'unknown',
        status: statusFinal as 'sucesso' | 'erro',
        duracaoMs: duration,
        saas: true,
        resultado: resultado as Record<string, unknown>,
        usuario: usuario ?? undefined,
        ipAddress: ipAddress ?? undefined
      });

      logger.info('Rotina SaaS executada', {
        context: 'RoutineScheduleService',
        rotinaId: routine.id,
        tipo: routine.tipo,
        success: statusFinal === 'sucesso'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.logService.updateRoutineCounters(routine, 'erro', endTime);

      await registrarExecucaoRotinaAuditoria({
        routineId: routine.id,
        routineNome: routine.nome ?? 'Rotina',
        routineTipo: routine.tipo ?? 'unknown',
        status: 'erro',
        duracaoMs: duration,
        saas: true,
        erro: errorMessage,
        usuario: usuario ?? undefined,
        ipAddress: ipAddress ?? undefined
      });

      logger.error('Erro ao executar rotina SaaS', {
        context: 'RoutineScheduleService',
        rotinaId: routine.id,
        error: errorMessage
      });
    }
  }

  /**
   * Retorna o status atual do scheduler
   * @returns Status do scheduler
   */
  public getStatus(): SchedulerStatus {
    const erpIds = Array.from(this.cronJobs.keys())
      .filter((k) => k.startsWith('erp:'))
      .map((k) => parseInt(k.split(':')[1], 10));
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      scheduledRoutines: erpIds
    };
  }

  /**
   * Retorna o status dos workers
   * @returns Status dos workers
   */
  public getWorkersStatus(): WorkersStatus {
    const erpIds = Array.from(this.cronJobs.keys())
      .filter((k) => k.startsWith('erp:'))
      .map((k) => parseInt(k.split(':')[1], 10));
    return {
      totalWorkers: this.cronJobs.size,
      activeWorkers: this.cronJobs.size,
      workers: erpIds.map((id) => ({
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

