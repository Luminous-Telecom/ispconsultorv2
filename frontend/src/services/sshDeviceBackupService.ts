import { defaultApiClient } from './core';
import { API_CONFIG } from '../config/api';

export interface SshDeviceBackupFile {
  fileName: string;
  size: number;
  modifiedAt: string;
  device_id?: string;
  device_name?: string;
}

export class SshDeviceBackupService {
  static async listByDevice(deviceId: string): Promise<SshDeviceBackupFile[]> {
    const response = await defaultApiClient.get<SshDeviceBackupFile[]>(
      `/ssh-manager/devices/${deviceId}/backups`
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  static async listByCliente(clienteId: number): Promise<SshDeviceBackupFile[]> {
    const qs = defaultApiClient.buildQueryString({ cliente_id: clienteId });
    const response = await defaultApiClient.get<SshDeviceBackupFile[]>(
      `/ssh-manager/device-backups${qs}`
    );
    return Array.isArray(response.data) ? response.data : [];
  }

  private static getDownloadUrl(deviceId: string, fileName: string): string {
    return `${API_CONFIG.BASE_URL}/ssh-manager/devices/${encodeURIComponent(deviceId)}/backups/download?nome=${encodeURIComponent(fileName)}`;
  }

  static async fetchAsText(deviceId: string, fileName: string): Promise<string> {
    const url = SshDeviceBackupService.getDownloadUrl(deviceId, fileName);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Falha ao carregar conteúdo');
    }
    return res.text();
  }

  static async download(deviceId: string, fileName: string): Promise<void> {
    const url = SshDeviceBackupService.getDownloadUrl(deviceId, fileName);
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message || 'Falha ao baixar');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
