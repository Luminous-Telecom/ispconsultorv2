import { prisma } from '../../../db/prisma';
import { logger } from '../../../utils/logger';
import { calculateNextExecution } from '../../../utils/SchedulerUtils';
import { RoutineScheduleService } from '../RoutineScheduleService';
import { RoutineExecutionService } from '../RoutineExecutionService';
import { RoutineLogService } from '../RoutineLogService';
import { registrarExecucaoRotinaAuditoria } from '../../sistema/AuditoriaRegistroService';
import type { JsonValue } from '../../../types/index';
import type {
  SchedulerStatus,
  WorkersStatus,
  HealthStatus,
  DetailedStats,
  CreateRoutineData
} from '../../../types/scheduler';

function diaSemanaErpFromCreateData(d: number | string | undefined): number | undefined {
  if (d === undefined) return undefined;
  if (typeof d === 'number') {
    return d >= 0 && d <= 6 ? d : undefined;
  }
  if (/^\d+$/.test(d)) {
    const n = parseInt(d, 10);
    return n >= 0 && n <= 6 ? n : undefined;
  }
  return undefined;
}

/** Coluna TIME do Prisma exige Date, não "HH:mm". */
function horaExecucaoParaColuna(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return undefined;
  return new Date(`1970-01-01T${match[1]}:${match[2]}:00.000Z`);
}

/**
 * Serviço orquestrador responsável por coordenar os serviços especializados:
 * - RoutineScheduleService: Agendamento CRON
 * - RoutineExecutionService: Execução de lógica de negócio
 * - RoutineLogService: Logs e histórico
 * 
 * Mantém compatibilidade com a API pública existente (Singleton pattern).
 * 
 * @class SchedulerService
 */
type RoutineRow = {
  id: number;
  ativo?: boolean;
  nome?: string | null;
  tipo?: string | null;
  empresa_id?: number | null;
  [key: string]: unknown;
};

export class SchedulerService {
  private static instance: SchedulerService;
  private scheduleService: RoutineScheduleService;
  private executionService: RoutineExecutionService;
  private logService: RoutineLogService;

  private constructor() {
    // Singleton pattern - construtor privado
    this.scheduleService = new RoutineScheduleService();
    this.executionService = new RoutineExecutionService();
    this.logService = new RoutineLogService();
  }

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Inicia o scheduler
   */
  public async start(): Promise<void> {
    await this.scheduleService.start();
    const { getSshDeviceBackupQueue } = await import('../../ssh-manager/SshDeviceBackupQueue');
    getSshDeviceBackupQueue();
  }

  /**
   * Para o scheduler
   */
  public async stop(): Promise<void> {
    await this.scheduleService.stop();
    try {
      const { getSshDeviceBackupQueue } = await import('../../ssh-manager/SshDeviceBackupQueue');
      await getSshDeviceBackupQueue().close();
    } catch {
      /* fila pode não ter sido inicializada */
    }
  }

  /**
   * Retorna a Queue BullMQ para monitoramento (Bull Board). null quando Redis não está disponível.
   */
  public getQueueForMonitoring(): ReturnType<RoutineScheduleService['getQueueForMonitoring']> {
    return this.scheduleService.getQueueForMonitoring();
  }

  /**
   * Agenda uma rotina específica
   * @param routine - Rotina a ser agendada
   */
  public async scheduleRoutine(routine: RoutineRow): Promise<void> {
    await this.scheduleService.scheduleRoutine(routine);
  }

  /**
   * Remove o agendamento de uma rotina
   * @param routineId - ID da rotina
   */
  public unscheduleRoutine(routineId: number): void {
    this.scheduleService.unscheduleRoutine(routineId);
  }

  /**
   * Cria uma nova rotina e agenda
   * @param data - Dados da rotina
   * @returns Rotina criada
   */
  public async createRoutine(data: CreateRoutineData & { empresa_id?: number | null }): Promise<RoutineRow> {
    const { minuto: _minSaaS, hora: _horaSaaS, dia_mes: _dmSaaS, mes: _mesSaaS, dia_semana: rawDow, configuracao, ...erpFields } = data;
    void _minSaaS;
    void _horaSaaS;
    void _dmSaaS;
    void _mesSaaS;

    const routine = await prisma.sistema_scheduled_routines.create({
      data: {
        ...erpFields,
        configuracao: typeof configuracao === 'string' ? configuracao : JSON.stringify(configuracao ?? {}),
        dia_semana: diaSemanaErpFromCreateData(rawDow) ?? null,
        hora_execucao: horaExecucaoParaColuna(erpFields.hora_execucao) ?? horaExecucaoParaColuna('00:00'),
        ativo: true,
        proxima_execucao: calculateNextExecution(data),
      } as never,
    });

    // Se estiver ativa, agendar imediatamente
    if (routine.ativo) {
      await this.scheduleService.scheduleRoutine(routine);
    }

    return routine;
  }

  /**
   * Atualiza uma rotina existente e reagenda se necessário
   * @param id - ID da rotina
   * @param data - Dados para atualização
   * @returns Rotina atualizada
   */
  public async updateRoutine(id: number, data: Record<string, unknown>): Promise<RoutineRow> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id } });
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    const payload = { ...data };
    if (data.hora_execucao !== undefined || data.frequencia !== undefined ||
        data.dia_execucao !== undefined || data.dia_semana !== undefined) {
      payload.proxima_execucao = calculateNextExecution({ ...routine, ...data } as unknown as CreateRoutineData);
    }
    if (payload.configuracao != null && typeof payload.configuracao !== 'string') {
      payload.configuracao = JSON.stringify(payload.configuracao);
    }
    if (payload.hora_execucao !== undefined) {
      payload.hora_execucao = horaExecucaoParaColuna(payload.hora_execucao) ?? horaExecucaoParaColuna('00:00');
    }

    const updated = await prisma.sistema_scheduled_routines.update({ where: { id }, data: payload as never });
    
    // Reagendar se estiver ativa, ou remover agendamento se estiver inativa
    if (updated.ativo) {
      await this.scheduleService.scheduleRoutine(updated);
    } else {
      this.scheduleService.unscheduleRoutine(id);
    }

    return updated;
  }

  /**
   * Deleta uma rotina e remove seu agendamento
   * @param id - ID da rotina
   */
  public async deleteRoutine(id: number): Promise<void> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id } });
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    this.scheduleService.unscheduleRoutine(id);
    await prisma.sistema_scheduled_routines.delete({ where: { id } });
  }

  /**
   * Ativa ou desativa uma rotina
   * @param id - ID da rotina
   * @param ativo - Status ativo/inativo
   * @returns Rotina atualizada
   */
  public async toggleRoutine(id: number, ativo: boolean): Promise<RoutineRow> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id } });
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    const updated = await prisma.sistema_scheduled_routines.update({ where: { id }, data: { ativo } });

    if (updated.ativo) {
      await this.scheduleService.scheduleRoutine(updated);
    } else {
      this.scheduleService.unscheduleRoutine(id);
    }

    return updated;
  }

  /**
   * Executa uma rotina manualmente
   * @param id - ID da rotina
   * @param usuario - Dados do usuário que executou (quando manual)
   * @param ipAddress - IP do cliente (quando manual)
   * @returns Mensagem de confirmação
   */
  public async executeRoutineManually(id: number, usuario?: { id: number; nome: string | null; email: string | null } | null, ipAddress?: string | null): Promise<{ message: string }> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id } });
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }
    // ativo controla só o agendamento automático; execução manual é sempre permitida
    this.scheduleService.executeRoutineNow(routine, usuario, ipAddress);
    return { message: 'Rotina iniciada em background' };
  }

  /**
   * Retorna o status atual do scheduler
   * @returns Status do scheduler
   */
  public async getStatus(): Promise<SchedulerStatus> {
    return await this.scheduleService.getStatus();
  }

  /**
   * Retorna todas as rotinas com seus logs recentes
   * @returns Array de rotinas
   */
  public async getAllRoutines(): Promise<RoutineRow[]> {
    return await this.logService.getAllRoutines() as unknown as RoutineRow[];
  }

  /**
   * Busca uma rotina por ID com seus logs
   * @param id - ID da rotina
   * @returns Rotina encontrada ou null
   */
  public async getRoutineById(id: number): Promise<RoutineRow | null> {
    return await this.logService.getRoutineById(id) as unknown as RoutineRow | null;
  }

  /**
   * Retorna o status dos workers
   * @returns Status dos workers
   */
  public getWorkersStatus(): WorkersStatus {
    return this.scheduleService.getWorkersStatus();
  }

  /**
   * Retorna o status de saúde do scheduler
   * @returns Health status
   */
  public async getHealthStatus(): Promise<HealthStatus> {
    return await this.scheduleService.getHealthStatus();
  }

  /**
   * Retorna estatísticas detalhadas do scheduler e sistema
   * @returns Estatísticas detalhadas
   */
  public async getDetailedStats(): Promise<DetailedStats> {
    return await this.scheduleService.getDetailedStats();
  }

  /**
   * Busca logs de execução, opcionalmente filtrados por rotina
   * @param routineId - ID da rotina (opcional)
   * @returns Array de logs com informações da rotina
   */
  public async getExecutionLogs(routineId?: number) {
    return await this.logService.getExecutionLogs(routineId);
  }

  /**
   * Busca os logs de execução mais recentes
   * @param limit - Limite de registros (padrão: 10)
   * @returns Array de logs recentes com informações da rotina
   */
  public async getRecentExecutionLogs(limit = 10) {
    return await this.logService.getRecentExecutionLogs(limit);
  }
}

export default SchedulerService;
