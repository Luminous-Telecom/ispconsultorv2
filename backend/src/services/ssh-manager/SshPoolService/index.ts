import { Client as SshClient } from 'ssh2';
import { SshDevice } from '../../../models/ssh-manager/SshDevice';
import { openDeviceConnection } from '../SshConnectionService';
import { logger } from '../../../utils/logger';

const IDLE_TIMEOUT_MS = parseInt(process.env.SSH_IDLE_TIMEOUT_MS ?? '300000', 10);
const RECONNECT_MAX_ATTEMPTS = parseInt(process.env.SSH_RECONNECT_MAX_ATTEMPTS ?? '5', 10);

interface PoolEntry {
  conn: SshClient;
  lastUsed: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  reconnectAttempts: number;
}

class SshPoolService {
  private static instance: SshPoolService;

  private devicePool = new Map<string, PoolEntry>();

  private deviceKey(device: SshDevice | { id: string | number }): string {
    return String(device.id);
  }

  static getInstance(): SshPoolService {
    if (!SshPoolService.instance) {
      SshPoolService.instance = new SshPoolService();
    }
    return SshPoolService.instance;
  }

  /**
   * Retorna conexão existente ou cria nova para o device.
   */
  async getDeviceConnection(device: SshDevice): Promise<SshClient> {
    const key = this.deviceKey(device);
    const existing = this.devicePool.get(key);
    if (existing) {
      this.touchEntry(existing);
      return existing.conn;
    }

    return this.createDeviceConnection(device);
  }

  /**
   * Remove e fecha a conexão de um device do pool.
   */
  releaseDevice(deviceId: string | number): void {
    const key = String(deviceId);
    const entry = this.devicePool.get(key);
    if (entry) {
      this.destroyEntry(entry);
      this.devicePool.delete(key);
    }
  }

  /**
   * Fecha todas as conexões abertas no pool.
   */
  releaseAll(): void {
    for (const [id, entry] of this.devicePool) {
      this.destroyEntry(entry);
      this.devicePool.delete(id);
    }
  }

  private async createDeviceConnection(device: SshDevice, attempt = 0): Promise<SshClient> {
    try {
      const conn = await openDeviceConnection(device);
      const entry: PoolEntry = { conn, lastUsed: Date.now(), idleTimer: null, reconnectAttempts: 0 };

      conn.on('end', () => this.handleDeviceDisconnect(device, entry));
      conn.on('close', () => this.handleDeviceDisconnect(device, entry));
      conn.on('error', (err) => {
        logger.warn('SSH pool: erro em conexão de device', { device: device.name, error: err.message });
        this.handleDeviceDisconnect(device, entry);
      });

      this.startIdleTimer(entry, () => {
        logger.info('SSH pool: device ocioso, encerrando', { device: device.name });
        this.releaseDevice(this.deviceKey(device));
      });

      this.devicePool.set(this.deviceKey(device), entry);
      return conn;
    } catch (err) {
      if (attempt < RECONNECT_MAX_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
        logger.warn('SSH pool: tentando reconectar ao device', {
          device: device.name,
          attempt: attempt + 1,
          delayMs: delay,
        });
        await sleep(delay);
        return this.createDeviceConnection(device, attempt + 1);
      }
      throw err;
    }
  }

  private handleDeviceDisconnect(device: SshDevice, entry: PoolEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    this.devicePool.delete(this.deviceKey(device));
    logger.info('SSH pool: device desconectado', { device: device.name });
  }

  private touchEntry(entry: PoolEntry): void {
    entry.lastUsed = Date.now();
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer);
      entry.idleTimer = null;
    }
  }

  private startIdleTimer(entry: PoolEntry, onIdle: () => void): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(onIdle, IDLE_TIMEOUT_MS);
  }

  private destroyEntry(entry: PoolEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    try { entry.conn.destroy(); } catch { /* ignora */ }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const sshPool = SshPoolService.getInstance();
