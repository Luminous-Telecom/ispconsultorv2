import { BaseService, defaultApiClient } from './core';
import {
  SshDevice,
  CreateSshDevice,
  UpdateSshDevice,
  SshDeviceFilters,
  SshConnectionTestResult,
  SshCommandResult,
  PaginatedResponse,
} from '../types';

class SshDeviceServiceClass extends BaseService<SshDevice, CreateSshDevice, UpdateSshDevice, SshDeviceFilters> {
  constructor() {
    super(defaultApiClient, '/ssh-manager/devices');
  }
}

const instance = new SshDeviceServiceClass();

export class SshDeviceService {
  static async list(filters: SshDeviceFilters = {}): Promise<PaginatedResponse<SshDevice>> {
    return instance.list(filters);
  }

  static async getById(id: string): Promise<SshDevice> {
    const response = await defaultApiClient.get<SshDevice>(`/ssh-manager/devices/${id}`);
    const r = response as { data?: SshDevice };
    return r.data ?? (response as unknown as SshDevice);
  }

  static async create(data: CreateSshDevice): Promise<SshDevice> {
    const response = await instance.create(data);
    return response.data ?? (response as unknown as SshDevice);
  }

  static async update(id: string, data: UpdateSshDevice): Promise<SshDevice> {
    const response = await defaultApiClient.patch<SshDevice>(`/ssh-manager/devices/${id}`, data);
    const r = response as { data?: SshDevice };
    return r.data ?? (response as unknown as SshDevice);
  }

  static async delete(id: string): Promise<void> {
    await defaultApiClient.delete(`/ssh-manager/devices/${id}`);
  }

  static async testConnection(id: string): Promise<SshConnectionTestResult> {
    const response = await defaultApiClient.post<SshConnectionTestResult>(
      `/ssh-manager/devices/${id}/test`,
      {}
    );
    const r = response as { data?: SshConnectionTestResult };
    return r.data ?? (response as unknown as SshConnectionTestResult);
  }

  static async executeCommand(id: string, command: string): Promise<SshCommandResult> {
    const response = await defaultApiClient.post<SshCommandResult>(
      `/ssh-manager/devices/${id}/execute`,
      { command }
    );
    const r = response as { data?: SshCommandResult };
    return r.data ?? (response as unknown as SshCommandResult);
  }

  static async queueManualBackup(id: string): Promise<{ message: string }> {
    const response = await defaultApiClient.post<{ message: string }>(`/ssh-manager/devices/${id}/backup`, {}, { timeout: 120000 });
    if (response.success === false) {
      throw new Error(response.message || response.error || 'Erro ao enfileirar backup');
    }
    const msg = response.data && typeof response.data === 'object' && 'message' in response.data
      ? String((response.data as { message: string }).message)
      : '';
    return { message: msg };
  }
}
