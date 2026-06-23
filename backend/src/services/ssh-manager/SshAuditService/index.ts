import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { SistemaLogOperacionalQueryService } from '../../sistema/SistemaLogOperacionalQueryService';

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
  SistemaLogOperacionalService.registrarSshAudit(data);
}

export type SshAuditLogType = 'equipamentos' | 'agentes';

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
  return SistemaLogOperacionalQueryService.searchSshAuditLogs(params);
}
