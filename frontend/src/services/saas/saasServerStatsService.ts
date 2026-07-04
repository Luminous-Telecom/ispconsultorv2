import { defaultApiClient } from '../core';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES } from '../../utils/apiErrorHelper';

export interface ServerRamStats {
  total: number;
  free: number;
  used: number;
  usedPercent: number;
}

export interface ServerDiskStats {
  total: number;
  free: number;
  used: number;
  usedPercent: number;
}

export interface ServerCpuStats {
  usedPercent: number;
  cores: number;
}

export interface ServerDiskIoStats {
  readBytesPerSec: number;
  writeBytesPerSec: number;
  readOpsPerSec: number;
  writeOpsPerSec: number;
}

export interface ServerQueueStats {
  queueSize: number;
  queueRunning: number;
  queueConcurrency: number;
}

export interface ServerStats {
  ram: ServerRamStats;
  disk: ServerDiskStats;
  diskIo: ServerDiskIoStats;
  queueStats: ServerQueueStats;
  uptime: number;
  cpuLoad: number[];
  cpu: ServerCpuStats;
}

export class SaasServerStatsService {
  static async getServerStats(): Promise<ServerStats> {
    const response = await defaultApiClient.get<ServerStats>('/saas/server-stats');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.SERVER_STATS_LOAD_ERROR));
  }
}
