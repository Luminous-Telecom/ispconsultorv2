import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { prisma } from '../../db/prisma';
import { criarLogExecucaoMysql, atualizarLogExecucaoMysql } from '../../services/scheduler/RotinaExecucaoLogService';
import { EnvioBoletosRoutine } from '../../services/scheduler/routines/EnvioBoletosRoutine';
import { RemessaBancariaRoutine } from '../../services/scheduler/routines/RemessaBancariaRoutine';
import { IRoutine } from '../../interfaces/IRoutine';
import type { WorkersStatus } from '../WorkerManager';
import { logger } from '../../utils/logger';
import { getCurrentTimestamp } from '../../utils/timezoneUtils';

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

async function loadRoutine(routineId: number) {
  return prisma.sistema_scheduled_routines.findUnique({ where: { id: routineId } });
}

function configRecord(value: unknown): Record<string, JsonValue> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, JsonValue>;
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, JsonValue>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export interface WorkerMessage {
  type: 'execute' | 'status' | 'error' | 'complete';
  data?: WorkerMessageData;
  error?: string;
  routineId?: number;
  executionId?: number | string;
}

export interface WorkerData {
  routineId: number;
  routineData: Record<string, JsonValue>;
  executionId: string;
}

class SchedulerWorker {
  private static workers: Map<string, Worker> = new Map();
  private static maxWorkers = 5;
  private static activeWorkers = 0;
  /** Metadados por executionId para logs de rotina na tabela unificada */
  private static executionMeta = new Map<
    string,
    { routineId: number; empresaId: number | null; nome: string; tipo: string }
  >();

  /**
   * Executa uma rotina em um worker separado
   */
  static async executeRoutine(routineId: number, routineData: Record<string, JsonValue>): Promise<string> {
    if (this.activeWorkers >= this.maxWorkers) {
      throw new Error('Número máximo de workers ativos atingido');
    }

    const routine = await loadRoutine(routineId);
    if (!routine) {
      throw new Error('Rotina não encontrada');
    }

    const startTime = new Date();
    const { id: executionId } = await criarLogExecucaoMysql(
      routine.id,
      routine.nome ?? 'Rotina',
      routine.tipo ?? 'unknown',
      startTime,
      'erp',
      routine.empresa_id ?? null
    );

    SchedulerWorker.executionMeta.set(executionId, {
      routineId: routine.id,
      empresaId: routine.empresa_id ?? null,
      nome: routine.nome ?? 'Rotina',
      tipo: routine.tipo ?? 'unknown',
    });

    const workerData: WorkerData = {
      routineId,
      routineData,
      executionId
    };

    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData
      });

      this.workers.set(executionId, worker);
      this.activeWorkers++;

      worker.on('message', async (message: WorkerMessage) => {
        try {
          await this.handleWorkerMessage(message, executionId);

          if (message.type === 'complete' || message.type === 'error') {
            this.cleanupWorker(executionId);
            if (message.type === 'complete') {
              resolve(executionId);
            } else {
              reject(new Error(message.error));
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Erro ao processar mensagem do worker', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionId,
            error: errorMessage
          });
          this.cleanupWorker(executionId);
          reject(error);
        }
      });

      worker.on('error', async (error) => {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro no worker', {
          context: 'SchedulerWorker',
          action: 'executeRoutine',
          executionLogId: executionId,
          error: errorMessage
        });
        await this.logExecutionError(executionId, error.message);
        this.cleanupWorker(executionId);
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          logger.error('Worker parou com código de saída', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionId,
            exitCode: code
          });
        }
        this.cleanupWorker(executionId);
      });

      setTimeout(() => {
        if (this.workers.has(executionId)) {
          logger.warn('Worker atingiu timeout', {
            context: 'SchedulerWorker',
            action: 'executeRoutine',
            executionLogId: executionId,
            timeoutMinutes: 30
          });
          worker.terminate();
          this.cleanupWorker(executionId);
        }
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Processa mensagens dos workers
   */
  private static async handleWorkerMessage(message: WorkerMessage, executionId: string): Promise<void> {
    const endTime = new Date();
    const duration = message.data?.duration ?? 0;

    switch (message.type) {
      case 'status':
        try {
          await atualizarLogExecucaoMysql(executionId, {
            status: 'executando',
            data_fim: endTime,
            duracao_ms: duration,
            resultado: { ...(message.data || {}), last_update: getCurrentTimestamp() }
          });
        } catch {
          // Não falhar o fluxo por erro ao atualizar status intermediário
        }
        break;

      case 'complete': {
        const completeData = message.data as CompleteMessageData;
        await atualizarLogExecucaoMysql(executionId, {
          status: 'sucesso',
          data_fim: endTime,
          duracao_ms: completeData?.duration || 0,
          resultado: { ...completeData, completed_at: getCurrentTimestamp() }
        });
        break;
      }

      case 'error': {
        const errorData = message.data as ErrorMessageData;
        await atualizarLogExecucaoMysql(executionId, {
          status: 'erro',
          data_fim: endTime,
          duracao_ms: errorData?.duration || 0,
          erro: message.error || 'Erro na execução',
          resultado: {
            error: message.error || null,
            error_data: errorData?.error_data || null,
            failed_at: getCurrentTimestamp()
          }
        });
        break;
      }
    }
  }

  /**
   * Registra erro de execução
   */
  private static async logExecutionError(executionId: string, error: string): Promise<void> {
    try {
      await atualizarLogExecucaoMysql(executionId, {
        status: 'erro',
        data_fim: new Date(),
        duracao_ms: 0,
        erro: error,
        resultado: { error, failed_at: getCurrentTimestamp() }
      });
    } catch (err) {
      logger.error('Erro ao registrar falha de execução', {
        context: 'SchedulerWorker',
        action: 'logExecutionError',
        executionId,
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Limpa recursos do worker
   */
  private static cleanupWorker(executionId: string): void {
    SchedulerWorker.executionMeta.delete(executionId);
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
        executionId: id as unknown as number,
        threadId: worker.threadId,
        isRunning: worker.threadId !== undefined
      }))
    };
  }

  /**
   * Para todos os workers
   */
  static async stopAllWorkers(): Promise<void> {
    const promises = Array.from(this.workers.values()).map((worker) => {
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
      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: 'Iniciando execução da rotina' }
      } as WorkerMessage);

      const routine = await loadRoutine(routineId);

      if (!routine) {
        throw new Error('Rotina não encontrada');
      }

      let routineInstance: IRoutine;
      switch (routine.tipo) {
        case 'geracao_titulos':
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
        case 'desbloquear_blockdomi':
          const { DesbloquearBlockdomiRoutine } = await import('../../services/scheduler/routines/DesbloquearBlockdomiRoutine');
          routineInstance = new DesbloquearBlockdomiRoutine();
          break;
        default:
          throw new Error(`Tipo de rotina não suportado: ${routine.tipo}`);
      }

      parentPort?.postMessage({
        type: 'status',
        routineId,
        executionId,
        data: { message: `Executando rotina: ${routine.nome}` }
      } as WorkerMessage);

      const result = await routineInstance.execute(configRecord(routine.configuracao), {
        saas: false,
        empresa_id: routine.empresa_id ?? undefined,
      });

      await prisma.sistema_scheduled_routines.update({
        where: { id: routine.id },
        data: {
          total_execucoes: { increment: 1 },
          execucoes_com_sucesso: { increment: 1 },
          ultima_execucao: new Date(),
        },
      });

      const duration = Date.now() - startTime;

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

      try {
        const routine = await loadRoutine(routineId);
        if (routine) {
          await prisma.sistema_scheduled_routines.update({
            where: { id: routine.id },
            data: {
              total_execucoes: { increment: 1 },
              execucoes_com_erro: { increment: 1 },
              ultima_execucao: new Date(),
            },
          });
        }
      } catch {
        // ignorar
      }

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
