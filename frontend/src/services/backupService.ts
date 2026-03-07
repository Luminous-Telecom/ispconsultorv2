import { apiService } from './api';
import { unwrapResponse } from './core';

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
    const response = await apiService.get<Backup[]>('/saas/backups');
    return unwrapResponse<Backup[]>(response, { fallback: [], throwOnFailure: false });
  }

  static async deleteBackup(nome: string): Promise<void> {
    const response = await apiService.delete<{ success: boolean; message: string }>(
      `/saas/backups/${encodeURIComponent(nome)}`
    );
    unwrapResponse(response, { fallback: { success: true, message: '' } });
  }

  static async downloadBackup(nome: string): Promise<Blob> {
    const response = await apiService.get<Blob>(
      `/saas/backups/${encodeURIComponent(nome)}/download`,
      { responseType: 'blob' }
    );
    const blob = unwrapResponse<Blob>(response);

    if (!blob || !(blob instanceof Blob)) {
      throw new Error('Resposta do servidor n˜o ˜ um arquivo v˜lido');
    }

    return blob;
  }

  static async restoreBackup(nome: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      `/saas/backups/${encodeURIComponent(nome)}/restore`
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);

    return {
      success: true,
      message: data.message ?? 'Restaura˜˜o solicitada.'
    };
  }

  static async executeManual(tipo: BackupManualTipo): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      '/saas/backups/manual',
      { tipo }
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);

    return {
      success: true,
      message: data.message ?? 'Backup em fila.'
    };
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

