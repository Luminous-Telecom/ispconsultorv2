import { apiService } from './api';

export interface Backup {
  nome: string;
  nomeCompleto: string;
  tamanho: number;
  tamanhoFormatado: string;
  data: string;
  dataFormatada: string;
  tipo: string;
}

export interface BackupListResponse {
  success: boolean;
  data?: Backup[];
  message?: string;
}

export type BackupManualTipo = 'database' | 'arquivos' | 'logs' | 'completo';

export class BackupService {
  static async list(): Promise<Backup[]> {
    const response = await apiService.get<Backup[]>('/backups') as BackupListResponse;
    if (!response.success || !response.data) {
      return [];
    }
    return response.data;
  }

  static async deleteBackup(nome: string): Promise<void> {
    const response = await apiService.delete<{ success?: boolean; message?: string }>(
      `/backups/${encodeURIComponent(nome)}`
    );
    const r = response as { success?: boolean; message?: string };
    if (r.success === false && r.message) {
      throw new Error(r.message);
    }
  }

  static async downloadBackup(nome: string): Promise<Blob> {
    const response = await apiService.get<Blob>(
      `/backups/${encodeURIComponent(nome)}/download`,
      { responseType: 'blob' }
    ) as { data?: Blob };
    const blob = response?.data ?? (response as unknown as Blob);
    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Resposta do servidor não é um arquivo válido');
    }
    return blob;
  }

  static async restoreBackup(nome: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success?: boolean; message?: string }>(
      `/backups/${encodeURIComponent(nome)}/restore`
    ) as { success?: boolean; message?: string; data?: { success?: boolean; message?: string } };
    const data = response.data ?? response;
    if (data.success === false && data.message) {
      throw new Error(data.message);
    }
    return {
      success: true,
      message: data.message ?? 'Restauração solicitada.'
    };
  }

  static async executeManual(tipo: BackupManualTipo): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success?: boolean; message?: string; data?: { message?: string } }>(
      '/backups/manual',
      { tipo }
    ) as { success?: boolean; message?: string; data?: { message?: string } };
    const msg = response.message ?? response.data?.message ?? 'Backup em fila.';
    if (response.success === false) {
      throw new Error(msg);
    }
    return { success: true, message: msg };
  }

  static triggerFileDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
