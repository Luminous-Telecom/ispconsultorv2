import { defaultApiClient } from './core';
import { SshAuditLog, SshAuditFilters, PaginatedResponse } from '../types';

export class SshAuditService {
  static async list(filters: SshAuditFilters = {}): Promise<PaginatedResponse<SshAuditLog>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
    });
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await defaultApiClient.get<PaginatedResponse<SshAuditLog>>(`/ssh-manager/audit${qs}`);
    const r = response as { data?: PaginatedResponse<SshAuditLog> };
    return (r.data ?? response) as PaginatedResponse<SshAuditLog>;
  }
}
