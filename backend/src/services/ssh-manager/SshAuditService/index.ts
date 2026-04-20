import { getElasticsearchService } from '../../elasticsearch/ElasticsearchService';
import { logger } from '../../../utils/logger';
import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

const SSH_AUDIT_INDEX = 'backnet-ssh-audit';

export type SshAuditAction =
  | 'CONNECT'
  | 'DISCONNECT'
  | 'COMMAND'
  | 'TERMINAL_COMMAND'
  | 'AUTH_FAIL'
  | 'TERMINAL_OPEN'
  | 'TERMINAL_CLOSE'
  | 'AGENT_CONNECT'
  | 'AGENT_DISCONNECT';

export interface SshAuditData {
  action: SshAuditAction;
  userId: string;
  deviceId?: string | number | null;
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
        deviceId: data.deviceId != null && data.deviceId !== '' ? String(data.deviceId) : null,
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

function escapeWildcard(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/\?/g, '\\?');
}

/**
 * Busca logs SSH paginados do Elasticsearch.
 */
export type SshAuditLogType = 'equipamentos' | 'agentes';

export async function searchSshAuditLogs(params: {
  deviceId?: string;
  userId?: string;
  action?: SshAuditAction;
  /** Filtra por tipo: equipamentos (exclui agentes) ou agentes (só connect/disconnect) */
  logType?: SshAuditLogType;
  startDate?: string;
  endDate?: string;
  search?: string;
  searchField?: string;
  /** IDs de usuário resolvidos por nome (quando searchField=userId e busca é por nome) */
  searchUserIds?: string[];
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
  const mustNot: Record<string, unknown>[] = [];

  if (params.logType === 'equipamentos') {
    mustNot.push({ terms: { action: ['AGENT_CONNECT', 'AGENT_DISCONNECT'] } });
  } else if (params.logType === 'agentes') {
    must.push({ terms: { action: ['AGENT_CONNECT', 'AGENT_DISCONNECT'] } });
  }

  if (params.deviceId) must.push({ term: { deviceId: params.deviceId } });
  if (params.userId) must.push({ term: { userId: params.userId } });
  if (params.action) must.push({ term: { action: params.action } });

  if (params.startDate || params.endDate) {
    const range: Record<string, string> = {};
    if (params.startDate) range['gte'] = params.startDate;
    if (params.endDate) range['lte'] = params.endDate;
    must.push({ range: { timestamp: range } });
  }

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    const safe = escapeWildcard(term);
    const field = params.searchField?.trim();

    const buildFieldClause = (esField: string, useWildcard: boolean) => {
      if (useWildcard) {
        return { wildcard: { [esField]: `*${safe}*` } };
      }
      return { match: { [esField]: { query: term, operator: 'or' } } };
    };

    if (field === 'id') {
      must.push({ wildcard: { _id: `*${safe}*` } });
    } else if (field === 'command') {
      must.push(buildFieldClause('command', false));
    } else if (field === 'deviceName') {
      must.push(buildFieldClause('deviceName', true));
    } else if (field === 'userId') {
      if (params.searchUserIds && params.searchUserIds.length > 0) {
        must.push({ terms: { userId: params.searchUserIds } });
      } else {
        must.push(buildFieldClause('userId', true));
      }
    } else if (field === 'errorMessage') {
      must.push(buildFieldClause('errorMessage', false));
    } else {
      must.push({
        bool: {
          should: [
            { match: { command: { query: term, operator: 'or' } } },
            { match: { errorMessage: { query: term, operator: 'or' } } },
            { wildcard: { deviceName: `*${safe}*` } },
            { wildcard: { userId: `*${safe}*` } },
          ],
          minimum_should_match: 1,
        },
      });
    }
  }

  const boolQuery: Record<string, unknown> = {};
  if (must.length > 0) boolQuery.must = must;
  if (mustNot.length > 0) boolQuery.must_not = mustNot;
  const query = Object.keys(boolQuery).length > 0 ? { bool: boolQuery } : { match_all: {} };

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
