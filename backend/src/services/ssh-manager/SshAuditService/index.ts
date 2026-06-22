import { Op, literal, type WhereOptions } from 'sequelize';
import { SshAuditLog } from '../../../models/ssh-manager/SshAuditLog';
import { logger } from '../../../utils/logger';

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
  deviceId?: number | null;
  deviceName?: string | null;
  empresaId?: number | null;
  command?: string | null;
  output?: string | null;
  success: boolean;
  errorMessage?: string | null;
  ip: string;
  duration?: number | null;
}

export function logSshAudit(data: SshAuditData): void {
  setImmediate(async () => {
    try {
      await SshAuditLog.create({
        empresa_id: data.empresaId != null && data.empresaId > 0 ? data.empresaId : null,
        action: data.action,
        user_id: data.userId,
        device_id: data.deviceId != null ? String(data.deviceId) : null,
        device_name: data.deviceName ?? null,
        command: data.command ?? null,
        output: data.output ? data.output.slice(0, 5000) : null,
        success: data.success,
        error_message: data.errorMessage ?? null,
        ip: data.ip,
        duration: data.duration ?? null,
      });
    } catch (err) {
      logger.warn('Falha ao registrar auditoria SSH (não crítico)', {
        context: 'SshAuditService',
        action: data.action,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    }
  });
}

export type SshAuditLogType = 'equipamentos' | 'agentes';

const POST_ENRICH_SORT_COLUMNS = new Set(['clienteName', 'command', 'errorMessage']);

const SORT_COLUMN_MAP: Record<string, string> = {
  timestamp: 'created_at',
  action: 'action',
  deviceName: 'device_name',
  userId: 'user_id',
  success: 'success',
  duration: 'duration',
  ip: 'ip',
};

function rowToLog(row: SshAuditLog): Record<string, unknown> {
  return {
    id: String(row.id),
    timestamp: row.created_at.toISOString(),
    action: row.action,
    userId: row.user_id,
    empresa_id: row.empresa_id,
    deviceId: row.device_id,
    deviceName: row.device_name,
    command: row.command,
    output: row.output,
    success: row.success,
    errorMessage: row.error_message,
    ip: row.ip,
    duration: row.duration,
  };
}

export async function searchSshAuditLogs(params: {
  deviceId?: string;
  userId?: string;
  action?: SshAuditAction;
  logType?: SshAuditLogType;
  startDate?: string;
  endDate?: string;
  search?: string;
  searchField?: string;
  searchUserIds?: string[];
  page?: number;
  limit?: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  empresaId?: number;
}): Promise<{ logs: Record<string, unknown>[]; total: number }> {
  const { page = 1, limit = 20 } = params;
  const and: WhereOptions[] = [];

  if (params.logType === 'equipamentos') {
    and.push({ action: { [Op.notIn]: ['AGENT_CONNECT', 'AGENT_DISCONNECT'] } });
  } else if (params.logType === 'agentes') {
    and.push({ action: { [Op.in]: ['AGENT_CONNECT', 'AGENT_DISCONNECT'] } });
  }

  if (params.empresaId != null && params.empresaId > 0) {
    and.push({ empresa_id: params.empresaId });
  }
  if (params.deviceId) and.push({ device_id: params.deviceId });
  if (params.userId) and.push({ user_id: params.userId });
  if (params.action) and.push({ action: params.action });

  if (params.startDate || params.endDate) {
    const range: { [Op.gte]?: Date; [Op.lte]?: Date } = {};
    if (params.startDate) range[Op.gte] = new Date(params.startDate);
    if (params.endDate) range[Op.lte] = new Date(params.endDate);
    and.push({ created_at: range });
  }

  const search = params.search?.trim();
  if (search) {
    const like = `%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const field = params.searchField?.trim();

    if (field === 'id') {
      const n = parseInt(search, 10);
      if (Number.isFinite(n)) and.push({ id: n });
    } else if (field === 'command') {
      and.push({ command: { [Op.like]: like } });
    } else if (field === 'deviceName') {
      and.push({ device_name: { [Op.like]: like } });
    } else if (field === 'userId') {
      if (params.searchUserIds && params.searchUserIds.length > 0) {
        and.push({ user_id: { [Op.in]: params.searchUserIds } });
      } else {
        and.push({ user_id: { [Op.like]: like } });
      }
    } else if (field === 'errorMessage') {
      and.push({ error_message: { [Op.like]: like } });
    } else {
      and.push({
        [Op.or]: [
          { command: { [Op.like]: like } },
          { error_message: { [Op.like]: like } },
          { device_name: { [Op.like]: like } },
          { user_id: { [Op.like]: like } },
        ],
      });
    }
  }

  const where: WhereOptions = and.length > 0 ? { [Op.and]: and } : {};

  const reqCol = params.sortColumn?.trim();
  const reqDir = params.sortDirection === 'asc' ? 'ASC' : 'DESC';
  const usePostEnrichSort = reqCol && POST_ENRICH_SORT_COLUMNS.has(reqCol);
  const sortCol =
    !usePostEnrichSort && reqCol && SORT_COLUMN_MAP[reqCol]
      ? SORT_COLUMN_MAP[reqCol]
      : 'created_at';

  const offset = (page - 1) * limit;

  const { rows, count } = await SshAuditLog.findAndCountAll({
    where,
    order: [[sortCol, usePostEnrichSort ? 'DESC' : reqDir]],
    limit,
    offset,
  });

  return {
    logs: rows.map(rowToLog),
    total: count,
  };
}
