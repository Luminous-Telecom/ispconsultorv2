import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

const SSH_AUDIT_INDEX = 'backnet-ssh-audit';

export type SshAuditAction =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'COMMAND'
  | 'AUTH_FAIL'
  | 'TERMINAL_OPEN'
  | 'TERMINAL_CLOSE';

export interface SshAuditData {
  action: SshAuditAction;
  userId: string;
  deviceId?: string | null;
  deviceName?: string | null;
  command?: string | null;
  output?: string | null;
  success: boolean;
  errorMessage?: string | null;
  ip: string;
  duration?: number | null;
}

async function ensureSshIndex(): Promise<void> {
  const svc = getElasticsearchService();
  const client = svc.getClient();
  if (!client) return;

  const exists = await client.indices.exists({ index: SSH_AUDIT_INDEX });
  if (!exists) {
    await client.indices.create({
      index: SSH_AUDIT_INDEX,
      mappings: {
        properties: {
          timestamp: { type: 'date' },
          action: { type: 'keyword' },
          userId: { type: 'keyword' },
          deviceId: { type: 'keyword' },
          deviceName: { type: 'keyword' },
          command: { type: 'text' },
          output: { type: 'text', index: false },
          success: { type: 'boolean' },
          errorMessage: { type: 'text' },
          ip: { type: 'ip' },
          duration: { type: 'long' },
        },
      },
    });
  }
}

/**
 * Indexa um evento de auditoria SSH de forma assíncrona e não-bloqueante.
 */
export function logSshAudit(data: SshAuditData): void {
  setImmediate(async () => {
    try {
      const svc = getElasticsearchService();
      const client = svc.getClient();
      if (!client) return;

      const isConnected = await svc.checkConnection();
      if (!isConnected) return;

      await ensureSshIndex();

      const document = {
        timestamp: safeFormatDateISOLocal(new Date()) || new Date().toISOString(),
        action: data.action,
        userId: data.userId,
        deviceId: data.deviceId ?? null,
        deviceName: data.deviceName ?? null,
        command: data.command ?? null,
        output: data.output ? data.output.slice(0, 5000) : null,
        success: data.success,
        errorMessage: data.errorMessage ?? null,
        ip: data.ip,
        duration: data.duration ?? null,
      };

      await client.index({ index: SSH_AUDIT_INDEX, document });
    } catch (err) {
      logger.warn('Falha ao registrar auditoria SSH no Elasticsearch (não crítico)', {
        context: 'SshAuditService',
        action: data.action,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  });
}

/**
 * Busca logs SSH paginados do Elasticsearch.
 */
export async function searchSshAuditLogs(params: {
  deviceId?: string;
  userId?: string;
  action?: SshAuditAction;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: Record<string, unknown>[]; total: number }> {
  const svc = getElasticsearchService();
  const client = svc.getClient();

  if (!client) {
    throw new Error('Elasticsearch não está configurado');
  }

  const isConnected = await svc.checkConnection();
  if (!isConnected) {
    throw new Error('Elasticsearch não está disponível');
  }

  await ensureSshIndex();

  const { page = 1, limit = 20 } = params;
  const from = (page - 1) * limit;

  const must: Record<string, unknown>[] = [];

  if (params.deviceId) must.push({ term: { deviceId: params.deviceId } });
  if (params.userId) must.push({ term: { userId: params.userId } });
  if (params.action) must.push({ term: { action: params.action } });

  if (params.startDate || params.endDate) {
    const range: Record<string, string> = {};
    if (params.startDate) range['gte'] = params.startDate;
    if (params.endDate) range['lte'] = params.endDate;
    must.push({ range: { timestamp: range } });
  }

  const query = must.length > 0 ? { bool: { must } } : { match_all: {} };

  const response = await client.search({
    index: SSH_AUDIT_INDEX,
    from,
    size: limit,
    sort: [{ timestamp: { order: 'desc' } }],
    query,
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

  const logs = response.hits.hits.map((hit) => ({
    id: hit._id,
    ...(hit._source as Record<string, unknown>),
  }));

  return { logs, total };
}
