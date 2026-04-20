import { Queue, Worker } from 'bullmq';
import { logger } from '../../../utils/logger';
import { runSshDeviceBackup, RunSshDeviceBackupContext } from '../SshDeviceBackupRunner';

const QUEUE_NAME = 'ssh-device-backup';

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
      maxRetriesPerRequest: null,
    };
  } catch {
    return null;
  }
}

function getConcurrency(): number {
  const envVal = process.env.SSH_BACKUP_QUEUE_CONCURRENCY;
  const parsed = envVal != null ? parseInt(envVal, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 2;
}

export type SshDeviceBackupJobData = {
  /** Sempre serializado como string na fila (BullMQ/JSON). */
  deviceId: string;
  manual?: boolean;
  userId?: string;
  ip?: string;
};

/**
 * Fila de backup por equipamento SSH (BullMQ + Redis).
 * Fallback em memória quando REDIS_URL não está definida.
 */
class SshDeviceBackupQueueImpl {
  private static instance: SshDeviceBackupQueueImpl | null = null;

  private concurrency: number;
  private queue: Queue<SshDeviceBackupJobData, unknown, string> | null = null;
  private worker: Worker<SshDeviceBackupJobData, unknown, string> | null = null;
  private memoryQueue: SshDeviceBackupJobData[] = [];
  private memoryRunning = 0;
  private useBullMQ = false;

  private constructor() {
    this.concurrency = getConcurrency();
    const conn = getConnectionConfig();
    if (conn) {
      try {
        this.queue = new Queue<SshDeviceBackupJobData, unknown, string>(QUEUE_NAME, {
          connection: conn,
          defaultJobOptions: {
            removeOnComplete: { count: 200 },
            removeOnFail: { count: 500 },
          },
        });
        this.worker = new Worker<SshDeviceBackupJobData, unknown, string>(
          QUEUE_NAME,
          async (job) => {
            const ctx: RunSshDeviceBackupContext | undefined =
              job.data.manual != null || job.data.userId != null || job.data.ip != null
                ? {
                    manual: job.data.manual,
                    userId: job.data.userId,
                    ip: job.data.ip,
                  }
                : undefined;
            await runSshDeviceBackup(job.data.deviceId, ctx);
          },
          {
            connection: conn,
            concurrency: this.concurrency,
          }
        );
        this.worker.on('error', (err) => {
          logger.error('Erro no worker BullMQ de backup SSH', {
            context: 'SshDeviceBackupQueue',
            error: err.message,
            stack: err.stack,
          });
        });
        this.worker.on('failed', (job, err) => {
          logger.error('Job BullMQ de backup SSH falhou', {
            context: 'SshDeviceBackupQueue',
            jobId: job?.id,
            deviceId: job?.data?.deviceId,
            error: err.message,
            stack: err.stack,
          });
        });
        this.useBullMQ = true;
        logger.info('SshDeviceBackupQueue usando BullMQ (Redis)');
      } catch (err) {
        logger.warn('Falha ao inicializar BullMQ para backup SSH; usando fila em memória', {
          context: 'SshDeviceBackupQueue',
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
        this.queue = null;
        this.worker = null;
      }
    } else {
      logger.info('SshDeviceBackupQueue usando fila em memória (REDIS_URL não definida)');
    }
  }

  static getInstance(): SshDeviceBackupQueueImpl {
    if (!SshDeviceBackupQueueImpl.instance) {
      SshDeviceBackupQueueImpl.instance = new SshDeviceBackupQueueImpl();
    }
    return SshDeviceBackupQueueImpl.instance;
  }

  enqueue(deviceId: string | number, extra?: Omit<SshDeviceBackupJobData, 'deviceId'>): void {
    const data: SshDeviceBackupJobData = { deviceId: String(deviceId), ...extra };
    if (this.useBullMQ && this.queue) {
      this.queue.add('backup', data).catch((err) => {
        logger.error('Erro ao enfileirar backup SSH', {
          context: 'SshDeviceBackupQueue',
          deviceId,
          manual: data.manual,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
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
    const ctx: RunSshDeviceBackupContext | undefined =
      data.manual != null || data.userId != null || data.ip != null
        ? { manual: data.manual, userId: data.userId, ip: data.ip }
        : undefined;
    runSshDeviceBackup(data.deviceId, ctx)
      .catch((err) => {
        logger.error('Erro na fila em memória de backup SSH', {
          context: 'SshDeviceBackupQueue',
          deviceId: data.deviceId,
          manual: data.manual,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      })
      .finally(() => {
        this.memoryRunning--;
        this.processMemory();
      });
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
    SshDeviceBackupQueueImpl.instance = null;
  }
}

export function getSshDeviceBackupQueue(): SshDeviceBackupQueueImpl {
  return SshDeviceBackupQueueImpl.getInstance();
}
