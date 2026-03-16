import { Queue, Worker } from 'bullmq';
import { logger } from '../../../utils/logger';
import type { RoutineJobData, RoutineJobProcessor } from './types';

const QUEUE_NAME = 'scheduler-routines';

function getConnectionConfig(): { host: string; port: number; password?: string; maxRetriesPerRequest: null } | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const password = process.env.REDIS_PASSWORD?.trim() || parsed.password || undefined;
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      ...(password ? { password } : {}),
      maxRetriesPerRequest: null
    };
  } catch {
    return null;
  }
}

function getConcurrency(): number {
  const envVal = process.env.SCHEDULER_QUEUE_CONCURRENCY;
  const parsed = envVal != null ? parseInt(envVal, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
}

/**
 * Fila de execução de rotinas do scheduler usando BullMQ (Redis).
 * Fallback para fila em memória quando Redis não está disponível.
 */
export class RoutineExecutionQueue {
  private processor: RoutineJobProcessor;
  private concurrency: number;
  private queue: Queue<RoutineJobData, unknown, string> | null = null;
  private worker: Worker<RoutineJobData, unknown, string> | null = null;
  private memoryQueue: Array<RoutineJobData> = [];
  private memoryRunning = 0;
  private useBullMQ = false;

  constructor(processor: RoutineJobProcessor) {
    this.processor = processor;
    this.concurrency = getConcurrency();
    const conn = getConnectionConfig();
    if (conn) {
      try {
        this.queue = new Queue<RoutineJobData, unknown, string>(QUEUE_NAME, {
          connection: conn,
          defaultJobOptions: {
            removeOnComplete: { count: 100 },
            removeOnFail: { count: 500 }
          }
        });
        this.worker = new Worker<RoutineJobData, unknown, string>(
          QUEUE_NAME,
          async (job) => {
            await this.processor(job.data);
          },
          {
            connection: conn,
            concurrency: this.concurrency
          }
        );
        this.worker.on('error', (err) => {
          logger.error('Erro no worker BullMQ do scheduler', {
            context: 'RoutineExecutionQueue',
            error: err.message
          });
        });
        this.useBullMQ = true;
        logger.info('RoutineExecutionQueue usando BullMQ (Redis)');
      } catch (err) {
        logger.warn('Falha ao inicializar BullMQ; usando fila em memória', {
          context: 'RoutineExecutionQueue',
          error: err instanceof Error ? err.message : String(err)
        });
        this.queue = null;
        this.worker = null;
      }
    } else {
      logger.info('RoutineExecutionQueue usando fila em memória (REDIS_URL não definida)');
    }
  }

  enqueue(data: RoutineJobData): void {
    if (this.useBullMQ && this.queue) {
      this.queue.add('run', data).catch((err) => {
        logger.error('Erro ao enfileirar rotina no BullMQ', {
          context: 'RoutineExecutionQueue',
          routineId: data.routineId,
          source: data.source,
          error: err instanceof Error ? err.message : String(err)
        });
      });
    } else {
      this.memoryQueue.push(data);
      this.processMemory();
    }
  }

  private processMemory(): void {
    if (this.memoryRunning >= this.concurrency || this.memoryQueue.length === 0) return;
    const data = this.memoryQueue.shift();
    if (!data) return;
    this.memoryRunning++;
    this.processor(data)
      .catch((err) => {
        logger.error('Erro na fila de execução de rotinas', {
          context: 'RoutineExecutionQueue',
          error: err instanceof Error ? err.message : String(err)
        });
      })
      .finally(() => {
        this.memoryRunning--;
        this.processMemory();
      });
  }

  async getQueueStats(): Promise<{ queueSize: number; queueRunning: number; queueConcurrency: number }> {
    if (this.useBullMQ && this.queue) {
      const [queueSize, queueRunning] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount()
      ]);
      return {
        queueSize,
        queueRunning,
        queueConcurrency: this.concurrency
      };
    }
    return {
      queueSize: this.memoryQueue.length,
      queueRunning: this.memoryRunning,
      queueConcurrency: this.concurrency
    };
  }

  get concurrencyLimit(): number {
    return this.concurrency;
  }

  /**
   * Retorna a instância da Queue BullMQ para monitoramento (Bull Board).
   * Retorna null quando usa fila em memória.
   */
  getQueue(): Queue<RoutineJobData, unknown, string> | null {
    return this.queue;
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    this.useBullMQ = false;
  }
}
