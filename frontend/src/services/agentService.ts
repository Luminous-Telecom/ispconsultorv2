import { defaultApiClient } from './core';
import { Agent, AgentConnectionTestResult, ConfigureAgentWireguard, CreateAgent, UpdateAgent } from '../types';

export class AgentService {
  static async list(filters?: { cliente_id?: number; empresa_id?: number }): Promise<Agent[]> {
    const q: Record<string, number> = {};
    if (filters?.cliente_id != null) q.cliente_id = filters.cliente_id;
    if (filters?.empresa_id != null) q.empresa_id = filters.empresa_id;
    const qs = defaultApiClient.buildQueryString(q);
    const response = await defaultApiClient.get<Agent[]>(`/agents${qs}`);
    const r = response as { data?: Agent[] };
    return r.data ?? (response as unknown as Agent[]);
  }

  static async getById(id: string): Promise<Agent> {
    const response = await defaultApiClient.get<Agent>(`/agents/${id}`);
    const r = response as { data?: Agent };
    return r.data ?? (response as unknown as Agent);
  }

  static async create(data: CreateAgent): Promise<Agent> {
    const response = await defaultApiClient.post<Agent>('/agents', data);
    const r = response as { data?: Agent };
    return r.data ?? (response as unknown as Agent);
  }

  static async update(id: string, data: UpdateAgent): Promise<Agent> {
    const response = await defaultApiClient.patch<Agent>(`/agents/${id}`, data);
    const r = response as { data?: Agent };
    return r.data ?? (response as unknown as Agent);
  }

  static async delete(id: string): Promise<void> {
    await defaultApiClient.delete(`/agents/${id}`);
  }

  static async regenerateToken(id: string): Promise<Agent> {
    const response = await defaultApiClient.post<Agent>(`/agents/${id}/regenerate-token`, {});
    const r = response as { data?: Agent };
    return r.data ?? (response as unknown as Agent);
  }

  static async configureWireguard(id: string, data: ConfigureAgentWireguard): Promise<Agent> {
    const response = await defaultApiClient.post<Agent>(`/agents/${id}/wireguard`, data, { timeout: 90_000 });
    const r = response as { data?: Agent };
    return r.data ?? (response as unknown as Agent);
  }

  static async testConnection(id: string): Promise<AgentConnectionTestResult> {
    const response = await defaultApiClient.post<AgentConnectionTestResult>(`/agents/${id}/test`, {}, { timeout: 25_000 });
    const r = response as { data?: AgentConnectionTestResult };
    return r.data ?? (response as unknown as AgentConnectionTestResult);
  }
}
