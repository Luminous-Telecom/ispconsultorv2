import * as cron from 'node-cron';
import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { buildCronExpression, validateCronExpression } from '../../../utils/SchedulerUtils';
import { RoutineExecutionService } from '../RoutineExecutionService';
import { RoutineLogService } from '../RoutineLogService';
import { RoutineExecutionQueue } from '../RoutineExecutionQueue';
import type { RoutineJobData } from '../RoutineExecutionQueue/types';
import { registrarExecucaoRotinaAuditoria } from '../../sistema/AuditoriaRegistroService';
import type { JsonValue } from '../../../types/index';
import type {
  SchedulerStatus,
  WorkersStatus,
  HealthStatus,
  DetailedStats
} from '../../../types/scheduler';

type RoutineRow = {
  id: number;
  nome?: string | null;
  tipo?: string | null;
  ativo?: boolean;
  empresa_id?: number | null;
  alvo?: string | null;
  frequencia?: string;
  hora_execucao?: string | Date;
  dia_semana?: number | string | null;
  dia_execucao?: number | null;
  cron_expression?: string | null;
  configuracao?: unknown;
  minuto?: string | null;
  hora?: string | null;
  dia_mes?: string | null;
  mes?: string | null;
};

type RoutineSource = 'erp' | 'saas';
type AnyRoutine = RoutineRow;

function jobKey(source: RoutineSource, id: number): string {
  return `${source}:${id}`;
}

/**
 * Serviço responsável por gerenciar agendamento de rotinas (CRON jobs).
 * Carrega as rotinas da instalação em sistema_scheduled_routines.
 *
 * @class RoutineScheduleService
 */
export class RoutineScheduleService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;
  private executionService: RoutineExecutionService;
  private logService: RoutineLogService;
  private executionQueue: RoutineExecutionQueue;

  constructor() {
    this.executionService = new RoutineExecutionService();
    this.logService = new RoutineLogService();
    this.executionQueue = new RoutineExecutionQueue((data) => this.processRoutineJob(data));
  }

  /**
   * Inicia o scheduler e carrega rotinas ativas da instalação
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
    await this.executionQueue.close();
    this.isRunning = false;
  }

  /**
   * Carrega rotinas ativas da instalação e agenda cada uma
   */
  private async loadRoutinesFromDatabase(): Promise<void> {
    try {
      const routines = await prisma.sistema_scheduled_routines.findMany({ where: { ativo: true } });

      for (const routine of routines) {
        await this.scheduleRoutine(routine);
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
  public async scheduleRoutine(routine: RoutineRow): Promise<void> {
    await this.scheduleAnyRoutine(routine, 'erp');
  }

  /**
   * Agenda uma rotina do SaaS
   */
  public async scheduleSaasRoutine(routine: RoutineRow): Promise<void> {
    await this.scheduleAnyRoutine(routine, 'saas');
  }

  private async scheduleAnyRoutine(routine: AnyRoutine, source: RoutineSource): Promise<void> {
    if (!routine.ativo) return;

    const key = jobKey(source, routine.id);
    if (this.cronJobs.has(key)) {
      this.unscheduleAnyRoutine(source, routine.id);
    }

    const cronExpression = buildCronExpression(routine as unknown as Parameters<typeof buildCronExpression>[0]);
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
      this.executionQueue.enqueue({ source, routineId: routine.id });
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

  /**
   * Retorna a Queue BullMQ para monitoramento (Bull Board). null quando usa fila em memória.
   */
  public getQueueForMonitoring(): ReturnType<RoutineExecutionQueue['getQueue']> {
    return this.executionQueue.getQueue();
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
   * Executa imediatamente uma rotina ERP (para chamada manual). Passa pela fila.
   */
  public executeRoutineNow(routine: RoutineRow, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): void {
    this.executionQueue.enqueue({
      source: 'erp',
      routineId: routine.id,
      manual: true,
      usuario: usuario ?? undefined,
      ipAddress: ipAddress ?? undefined
    });
  }

  /**
   * Executa imediatamente uma rotina SaaS (para chamada manual). Passa pela fila.
   * @param usuario - Usuário que executou manualmente (quando presente)
   * @param ipAddress - IP do cliente (quando manual)
   */
  public executeSaasRoutineNow(routine: RoutineRow, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): void {
    this.executionQueue.enqueue({
      source: 'saas',
      routineId: routine.id,
      manual: true,
      usuario: usuario ?? undefined,
      ipAddress: ipAddress ?? undefined
    });
  }

  /**
   * Processa um job da fila (chamado pelo worker BullMQ ou fila em memória)
   */
  public async processRoutineJob(data: RoutineJobData): Promise<void> {
    const { source, routineId, usuario, ipAddress, manual } = data;
    const routine = source === 'erp'
      ? await prisma.sistema_scheduled_routines.findUnique({ where: { id: routineId } })
      : null;

    if (!routine) {
      logger.warn('Rotina não encontrada para execução', {
        context: 'RoutineScheduleService',
        source,
        routineId
      });
      return;
    }
    // ativo = só execução automática (CRON); manual ignora o status
    if (!manual && !routine.ativo) {
      logger.debug('Rotina inativa, ignorando execução automática', {
        context: 'RoutineScheduleService',
        source,
        routineId
      });
      return;
    }

    await this.runAnyRoutine(routine as AnyRoutine, source, usuario ?? null, ipAddress ?? null);
  }

  /**
   * Executa uma rotina (chamado pelo CRON job ou manualmente)
   */
  private async runAnyRoutine(routine: AnyRoutine, source: RoutineSource, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<void> {
    if (source === 'saas') {
      await this.runSaasRoutine(routine, usuario, ipAddress);
    } else {
      await this.runRoutine(routine);
    }
  }

  /**
   * Executa uma rotina do ERP (chamado pelo CRON job)
   */
  private async runRoutine(routine: RoutineRow): Promise<void> {
    const startTime = new Date();
    let executionLog = null;

    try {
      // Criar log de execução
      executionLog = await this.logService.createExecutionLog(routine, startTime);

      // Executar a rotina baseada no tipo
      const resultado = await this.executionService.executeRoutineByType(
        routine as unknown as Parameters<RoutineExecutionService['executeRoutineByType']>[0]
      );

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
  private async runSaasRoutine(routine: RoutineRow, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<void> {
    const startTime = new Date();

    try {
      const resultado = await this.executionService.executeRoutineByType(
        routine as unknown as Parameters<RoutineExecutionService['executeRoutineByType']>[0]
      );
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
  public async getStatus(): Promise<SchedulerStatus> {
    const erpIds = Array.from(this.cronJobs.keys())
      .filter((k) => k.startsWith('erp:'))
      .map((k) => parseInt(k.split(':')[1], 10));
    const queueStats = await this.executionQueue.getQueueStats();
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      scheduledRoutines: erpIds,
      queueSize: queueStats.queueSize,
      queueRunning: queueStats.queueRunning,
      queueConcurrency: queueStats.queueConcurrency
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
  public async getHealthStatus(): Promise<HealthStatus> {
    const queueStats = await this.executionQueue.getQueueStats();
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.size,
      uptime: process.uptime(),
      queueSize: queueStats.queueSize,
      queueRunning: queueStats.queueRunning
    };
  }

  /**
   * Retorna estatísticas detalhadas do scheduler e sistema
   * @returns Estatísticas detalhadas
   */
  public async getDetailedStats(): Promise<DetailedStats> {
    const queueStats = await this.executionQueue.getQueueStats();
    return {
      scheduler: {
        isRunning: this.isRunning,
        activeJobs: this.cronJobs.size,
        uptime: process.uptime(),
        queueSize: queueStats.queueSize,
        queueRunning: queueStats.queueRunning,
        queueConcurrency: queueStats.queueConcurrency
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

