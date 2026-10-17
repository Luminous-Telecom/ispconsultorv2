import { EventEmitter } from 'events';
import SchedulerWorker from '../SchedulerWorker';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';

type RoutineRow = {
  id: number;
  configuracao: unknown;
  hora_execucao: Date | string;
  frequencia: string;
};

function configRecord(value: unknown): Record<string, never> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, never>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, never>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function horaHm(value: Date | string): string {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }
  const parts = String(value).split(':');
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}`;
}

export interface WorkerManagerConfig {
  maxWorkers?: number;
  checkInterval?: number; // em milissegundos
  retryAttempts?: number;
  retryDelay?: number; // em milissegundos
}

interface WorkerInfo {
  executionId: number;
  threadId: number | undefined;
  isRunning: boolean;
}

export interface WorkersStatus {
  active: number;
  max: number;
  workers: WorkerInfo[];
}

export class WorkerManager extends EventEmitter {
  private static instance: WorkerManager;
  private config: Required<WorkerManagerConfig>;
  private isRunning = false;
  private checkInterval?: NodeJS.Timeout;
  private activeExecutions: Map<number, Promise<void>> = new Map();

  private constructor(config: WorkerManagerConfig = {}) {
    super();
    this.config = {
      maxWorkers: config.maxWorkers || 5,
      checkInterval: config.checkInterval || 60000, // 1 minuto
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 5000 // 5 segundos
    };
  }

  static getInstance(config?: WorkerManagerConfig): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager(config);
    }
    return WorkerManager.instance;
  }

  /**
   * Inicia o gerenciador de workers
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Verificar rotinas pendentes na inicialização
    await this.processPendingRoutines();

    // Configurar verificação periódica
    this.checkInterval = setInterval(async () => {
      try {
        await this.processScheduledRoutines();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Erro na verificação periódica de rotinas', {
          context: 'WorkerManager',
          action: 'start',
          error: errorMessage,
          stack: errorStack
        });
        this.emit('error', error);
      }
    }, this.config.checkInterval);

    this.emit('started');
  }

  /**
   * Para o gerenciador de workers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Parar verificação periódica
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    // Aguardar execuções ativas terminarem
    const activePromises = Array.from(this.activeExecutions.values());
    if (activePromises.length > 0) {
      await Promise.allSettled(activePromises);
    }

    // Parar todos os workers
    await SchedulerWorker.stopAllWorkers();

    this.activeExecutions.clear();
    this.emit('stopped');
  }

  /**
   * Processa rotinas agendadas
   */
  private async processScheduledRoutines(): Promise<void> {
    const now = new Date();
    
    // Buscar rotinas que devem ser executadas
    const routines = await prisma.sistema_scheduled_routines.findMany({
      where: {
        ativo: true,
        proxima_execucao: { lte: now },
      },
      orderBy: { proxima_execucao: 'asc' },
    });

    for (const routine of routines) {
      try {
        await this.executeRoutine(routine);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Erro ao executar rotina', {
          context: 'WorkerManager',
          action: 'processScheduledRoutines',
          rotinaId: routine.id,
          error: errorMessage,
          stack: errorStack
        });
        this.emit('routineError', { routine, error });
      }
    }
  }

  /**
   * Processa rotinas pendentes (para casos de reinicialização)
   */
  private async processPendingRoutines(): Promise<void> {
    const routines = await prisma.sistema_scheduled_routines.findMany({
      where: {
        ativo: true,
        proxima_execucao: { lt: new Date() },
      },
      orderBy: { proxima_execucao: 'asc' },
    });

    if (routines.length > 0) {
      for (const routine of routines) {
        try {
          await this.executeRoutine(routine);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Erro ao processar rotina pendente', {
            context: 'WorkerManager',
            action: 'processPendingRoutines',
            rotinaId: routine.id,
            error: errorMessage,
            stack: errorStack
          });
        }
      }
    }
  }

  /**
   * Executa uma rotina específica
   */
  async executeRoutine(routine: RoutineRow): Promise<void> {
    // Verificar se já está sendo executada
    if (this.activeExecutions.has(routine.id)) {
      return;
    }

    // Verificar limite de workers
    const workersStatus = SchedulerWorker.getWorkersStatus();
    if (workersStatus.active >= this.config.maxWorkers) {
      return;
    }

    const executionPromise = this.executeWithRetry(routine);
    this.activeExecutions.set(routine.id, executionPromise);

    try {
      await executionPromise;
      this.emit('routineCompleted', { routine });
    } catch (error) {
      this.emit('routineFailed', { routine, error });
    } finally {
      this.activeExecutions.delete(routine.id);
    }
  }

  /**
   * Executa rotina com retry automático
   */
  private async executeWithRetry(routine: RoutineRow): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        
        await SchedulerWorker.executeRoutine(routine.id, configRecord(routine.configuracao));
        
        // Atualizar próxima execução
        await this.updateNextExecution(routine);
        
        return;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        lastError = error instanceof Error ? error : new Error(errorMessage);

        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    // Todas as tentativas falharam
    throw lastError || new Error('Execução falhou sem erro específico');
  }

  /**
   * Atualiza a próxima execução da rotina
   */
  private async updateNextExecution(routine: RoutineRow): Promise<void> {
    const [hours, minutes] = horaHm(routine.hora_execucao).split(':');
    const nextExecution = new Date();
    
    // Definir a hora configurada
    nextExecution.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Calcular próxima execução baseado na frequência
    switch (routine.frequencia) {
      case 'diaria':
        nextExecution.setDate(nextExecution.getDate() + 1);
        break;
      case 'semanal':
        nextExecution.setDate(nextExecution.getDate() + 7);
        break;
      case 'mensal':
        nextExecution.setMonth(nextExecution.getMonth() + 1);
        break;
      case 'anual':
        nextExecution.setFullYear(nextExecution.getFullYear() + 1);
        break;
      case 'personalizada':
        // Para frequência personalizada, usar cron expression ou configurar manualmente
        nextExecution.setDate(nextExecution.getDate() + 1); // Default: 24h
        break;
      default:
        nextExecution.setDate(nextExecution.getDate() + 1);
    }

    await prisma.sistema_scheduled_routines.update({
      where: { id: routine.id },
      data: { proxima_execucao: nextExecution },
    });
  }

  /**
   * Executa rotina manualmente
   */
  async executeRoutineManually(routineId: number): Promise<void> {
    const routine = await prisma.sistema_scheduled_routines.findUnique({ where: { id: routineId } });
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    // ativo controla só o agendamento automático; execução manual é sempre permitida
    await this.executeRoutine(routine);
  }

  /**
   * Obtém status do gerenciador
   */
  getStatus(): {
    isRunning: boolean;
    activeExecutions: number;
    workersStatus: WorkersStatus;
    config: Required<WorkerManagerConfig>;
  } {
    return {
      isRunning: this.isRunning,
      activeExecutions: this.activeExecutions.size,
      workersStatus: SchedulerWorker.getWorkersStatus(),
      config: this.config
    };
  }

  /**
   * Utilitário para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default WorkerManager;
