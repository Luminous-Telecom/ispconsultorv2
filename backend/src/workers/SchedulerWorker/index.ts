import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import ScheduledRoutine from '../../models/sistema/ScheduledRoutine';
import RoutineExecutionLog from '../../models/sistema/RoutineExecutionLog';
import { EnvioBoletosRoutine } from '../../services/scheduler/routines/EnvioBoletosRoutine';
import { RemessaBancariaRoutine } from '../../services/scheduler/routines/RemessaBancariaRoutine';
import { IRoutine } from '../../interfaces/IRoutine';
import type { WorkersStatus } from '../WorkerManager';
import { logger } from '../../utils/logger';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface StatusMessageData {
  message: string;
  last_update?: string;
  duration?: number;
}

interface CompleteMessageData {
  message: string;
  result?: Record<string, JsonValue>;
  duration: number;
  completed_at?: string;
}

interface ErrorMessageData {
  duration?: number;
  error?: string;
  error_data?: Record<string, JsonValue>;
  failed_at?: string;
}

type WorkerMessageData = StatusMessageData | CompleteMessageData | ErrorMessageData;

export interface WorkerMessage {
  type: 'execute' | 'status' | 'error' | 'complete';
  data?: WorkerMessageData;
  error?: string;
  routineId?: number;
  executionId?: number;
}

export interface WorkerData {
  routineId: number;
  routineData: Record<string, JsonValue>;
  executionId: number;
}

class SchedulerWorker {
  private static workers: Map<number, Worker> = new Map();
  private static maxWorkers = 5;
  private static activeWorkers = 0;

  /**
   * Executa uma rotina em um worker separado
   */
  static async executeRoutine(routineId: number, routineData: Record<string, JsonValue>): Promise<number> {
    if (this.activeWorkers >= this.maxWorkers) {
      throw new Error('Número máximo de workers ativos atingido');
    }

    // Criar log de execução
    const executionLog = await RoutineExecutionLog.create({
      routine_id: routineId,
      status: 'executando',
      data_inicio: new Date(),
      resultado: {
        worker_id: this.activeWorkers + 1,
        timestamp: new Date().toISOString()
      }
    });

    const workerData: WorkerData = {
      routineId,
      routineData,
      executionId: executionLog.id
    };

    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData
      });

      this.workers.set(executionLog.id, worker);
      this.activeWorkers++;

      worker.on('message', async (message: WorkerMessage) => {
        try {
          await this.handleWorkerMessage(message, executionLog.id);
          
          if (message.type === 'complete' || message.type === 'error') {
            this.cleanupWorker(executionLog.id);
            if (message.type === 'complete') {
              resolve(executionLog.id);
            } else {
              reject(new Error(message.error));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error('Erro ao processar mensagem do worker', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionLog.id,
            error: errorMessage,
            stack: errorStack
          });
          this.cleanupWorker(executionLog.id);
          reject(error);
        }
      });

      worker.on('error', async (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Erro no worker', {
          context: 'SchedulerWorker',
          action: 'executeRoutine',
          executionLogId: executionLog.id,
          error: errorMessage,
          stack: errorStack
        });
        await this.logExecutionError(executionLog.id, error.message);
        this.cleanupWorker(executionLog.id);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error('Worker parou com código de saída', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionLog.id,
            exitCode: code
          });
        }
        this.cleanupWorker(executionLog.id);
      });

      // Timeout de 30 minutos
      setTimeout(() => {
        if (this.workers.has(executionLog.id)) {
          logger.warn('Worker atingiu timeout', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionLog.id,
            timeoutMinutes: 30
          });
          worker.terminate();
          this.cleanupWorker(executionLog.id);
        }
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Processa mensagens dos workers
   */
  private static async handleWorkerMessage(message: WorkerMessage, executionId: number): Promise<void> {
    const executionLog = await RoutineExecutionLog.findByPk(executionId);
    if (!executionLog) return;

    switch (message.type) {
      case 'status':
        await executionLog.update({
          resultado: {
            ...executionLog.resultado,
            ...message.data,
            last_update: new Date().toISOString()
          }
        });
        break;

      case 'complete':
        await executionLog.update({
          status: 'sucesso',
          data_fim: new Date(),
          duracao_ms: message.data?.duration || 0,
          resultado: {
            ...executionLog.resultado,
            ...message.data,
            completed_at: new Date().toISOString()
          }
        });
        break;

      case 'error': {
        const errorData = message.data as ErrorMessageData;
        await executionLog.update({
          status: 'erro',
          data_fim: new Date(),
          duracao_ms: errorData?.duration || 0,
          erro: message.error || 'Erro na execução',
          resultado: {
            ...executionLog.resultado,
            error: message.error || null,
            error_data: errorData?.error_data || null,
            failed_at: new Date().toISOString()
          }
        });
        break;
      }
    }
  }

  /**
   * Registra erro de execução
   */
  private static async logExecutionError(executionId: number, error: string): Promise<void> {
    try {
      const executionLog = await RoutineExecutionLog.findByPk(executionId);
      if (executionLog) {
        await executionLog.update({
          status: 'erro',
          data_fim: new Date(),
          erro: error,
          resultado: {
            ...executionLog.resultado,
            error,
            failed_at: new Date().toISOString()
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      const errorStack = err instanceof Error ? err.stack : undefined;
      logger.error('Erro ao registrar falha de execução', {
        context: 'SchedulerWorker',
        action: 'logExecutionError',
        executionId,
        error: errorMessage,
        stack: errorStack
      });
    }
  }

  /**
   * Limpa recursos do worker
   */
  private static cleanupWorker(executionId: number): void {
    const worker = this.workers.get(executionId);
    if (worker) {
      worker.terminate();
      this.workers.delete(executionId);
      this.activeWorkers--;
    }
  }

  /**
   * Obtém status dos workers ativos
   */
  static getWorkersStatus(): WorkersStatus {
    return {
      active: this.activeWorkers,
      max: this.maxWorkers,
      workers: Array.from(this.workers.entries()).map(([id, worker]) => ({
        executionId: id,
        threadId: worker.threadId,
        isRunning: worker.threadId !== undefined
      }))
    };
  }

  /**
   * Para todos os workers
   */
  static async stopAllWorkers(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(worker => {
      return new Promise<void>((resolve) => {
        worker.terminate();
        worker.on('exit', () => resolve());
      });
    });

    await Promise.all(promises);
    this.workers.clear();
    this.activeWorkers = 0;
  }
}

// Código executado no worker
if (!isMainThread && workerData) {
  (async () => {
    const { routineId, routineData: _routineData, executionId } = workerData as WorkerData;
    const startTime = Date.now();

    try {
      // Enviar status inicial
      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: 'Iniciando execução da rotina' }
      } as WorkerMessage);

      // Buscar dados da rotina
      const routine = await ScheduledRoutine.findByPk(routineId, {
        include: ['executionLogs']
      });

      if (!routine) {
        throw new Error('Rotina não encontrada');
      }

      // Criar instância da rotina baseada no tipo
      let routineInstance: IRoutine;
      switch (routine.tipo) {
        case 'geracao_titulos':
          // Funcionalidade de carnê foi removida
          throw new Error('Geração de títulos não está mais disponível - funcionalidade de carnê foi removida');
        case 'envio_boletos':
          routineInstance = new EnvioBoletosRoutine();
          break;
        case 'remessa_bancaria':
          routineInstance = new RemessaBancariaRoutine();
          break;
        case 'verificar_vencimentos':
          const { VerificarVencimentosRoutine } = await import('../../services/scheduler/routines/VerificarVencimentosRoutine');
          routineInstance = new VerificarVencimentosRoutine();
          break;
        default:
          throw new Error(`Tipo de rotina não suportado: ${routine.tipo}`);
      }

      // Enviar status de progresso
      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: `Executando rotina: ${routine.nome}` }
      } as WorkerMessage);

      // Executar rotina
      const result = await routineInstance.execute(routine.configuracao);

      // Atualizar contadores da rotina
      await routine.update({
        total_execucoes: routine.total_execucoes + 1,
        execucoes_com_sucesso: routine.execucoes_com_sucesso + 1,
        ultima_execucao: new Date()
      });

      const duration = Date.now() - startTime;

      // Enviar resultado
      parentPort?.postMessage({
        type: 'complete',
        routineId,
        executionId,
        data: {
          message: 'Rotina executada com sucesso',
          result,
          duration
        }
      } as WorkerMessage);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Atualizar contadores da rotina em caso de erro
      try {
        const routine = await ScheduledRoutine.findByPk(routineId);
        if (routine) {
          await routine.update({
            total_execucoes: routine.total_execucoes + 1,
            execucoes_com_erro: routine.execucoes_com_erro + 1,
            ultima_execucao: new Date()
          });
        }
      } catch (updateError) {
        const errorMessage = updateError instanceof Error ? updateError.message : 'Erro desconhecido';
        const errorStack = updateError instanceof Error ? updateError.stack : undefined;
        logger.error('Erro ao atualizar contadores da rotina', {
          context: 'SchedulerWorker',
          action: 'workerExecution',
          rotinaId: workerData.routineId,
          error: errorMessage,
          stack: errorStack
        });
      }

      // Enviar erro
      parentPort?.postMessage({
        type: 'error',
        routineId,
        executionId,
        error: errorMessage,
        data: { duration }
      } as WorkerMessage);
    }
  })();
}

export default SchedulerWorker;
