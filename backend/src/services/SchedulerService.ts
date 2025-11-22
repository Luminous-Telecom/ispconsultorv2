import { ScheduledRoutine } from '../models';
import { logger } from '../utils/logger';
import { calculateNextExecution } from '../utils/SchedulerUtils';
import { RoutineScheduleService } from './RoutineScheduleService';
import { RoutineExecutionService } from './RoutineExecutionService';
import { RoutineLogService } from './RoutineLogService';
import type { JsonValue } from '../types';
import type {
  SchedulerStatus,
  WorkersStatus,
  HealthStatus,
  DetailedStats,
  CreateRoutineData
} from '../types/scheduler';

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
  }

  /**
   * Para o scheduler
   */
  public async stop(): Promise<void> {
    await this.scheduleService.stop();
  }

  /**
   * Agenda uma rotina específica
   * @param routine - Rotina a ser agendada
   */
  public async scheduleRoutine(routine: ScheduledRoutine): Promise<void> {
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
  public async createRoutine(data: CreateRoutineData): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.create({
      ...data,
      ativo: true,
      proxima_execucao: calculateNextExecution(data)
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
  public async updateRoutine(id: number, data: Partial<ScheduledRoutine>): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // Se mudou horário ou frequência, recalcular próxima execução
    if (data.hora_execucao !== undefined || data.frequencia !== undefined || 
        data.dia_execucao !== undefined || data.dia_semana !== undefined) {
      const updatedData = { ...routine.get({ plain: true }), ...data };
      data.proxima_execucao = calculateNextExecution(updatedData);
    }

    await routine.update(data);
    
    // Reagendar se estiver ativa, ou remover agendamento se estiver inativa
    if (routine.ativo) {
      await this.scheduleService.scheduleRoutine(routine);
    } else {
      this.scheduleService.unscheduleRoutine(id);
    }

    return routine;
  }

  /**
   * Deleta uma rotina e remove seu agendamento
   * @param id - ID da rotina
   */
  public async deleteRoutine(id: number): Promise<void> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    this.scheduleService.unscheduleRoutine(id);
    await routine.destroy();
  }

  /**
   * Ativa ou desativa uma rotina
   * @param id - ID da rotina
   * @param ativo - Status ativo/inativo
   * @returns Rotina atualizada
   */
  public async toggleRoutine(id: number, ativo: boolean): Promise<ScheduledRoutine> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    await routine.update({ ativo });

    if (ativo) {
      await this.scheduleService.scheduleRoutine(routine);
    } else {
      this.scheduleService.unscheduleRoutine(id);
    }

    return routine;
  }

  /**
   * Executa uma rotina manualmente
   * @param id - ID da rotina
   * @returns Mensagem de confirmação
   */
  public async executeRoutineManually(id: number): Promise<{ message: string }> {
    const routine = await ScheduledRoutine.findByPk(id);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // Executar em background sem aguardar
    this.executeRoutineInBackground(routine).catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Erro ao executar rotina em background', {
        context: 'SchedulerService',
        action: 'executeRoutineManually',
        rotinaId: id,
        error: errorMessage,
        stack: errorStack
      });
    });
    
    return { message: 'Rotina iniciada em background' };
  }

  /**
   * Executa uma rotina em background (usado por executeRoutineManually)
   * @param routine - Rotina a ser executada
   */
  private async executeRoutineInBackground(routine: ScheduledRoutine): Promise<void> {
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
      logger.error('Erro ao executar rotina manualmente', {
        context: 'SchedulerService',
        action: 'executeRoutineInBackground',
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
    return this.scheduleService.getStatus();
  }

  /**
   * Retorna todas as rotinas com seus logs recentes
   * @returns Array de rotinas
   */
  public async getAllRoutines(): Promise<ScheduledRoutine[]> {
    return await this.logService.getAllRoutines();
  }

  /**
   * Busca uma rotina por ID com seus logs
   * @param id - ID da rotina
   * @returns Rotina encontrada ou null
   */
  public async getRoutineById(id: number): Promise<ScheduledRoutine | null> {
    return await this.logService.getRoutineById(id);
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
  public getHealthStatus(): HealthStatus {
    return this.scheduleService.getHealthStatus();
  }

  /**
   * Retorna estatísticas detalhadas do scheduler e sistema
   * @returns Estatísticas detalhadas
   */
  public getDetailedStats(): DetailedStats {
    return this.scheduleService.getDetailedStats();
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
