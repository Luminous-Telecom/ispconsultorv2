import { API_CONFIG } from 'config/api';
import { apiService } from './api';
import { unwrapResponse } from './core';

/** Backup manual/restauracao roda no servidor ate concluir; o timeout global da API (10s) corta a resposta antes. */
const BACKUP_LONG_OPERATION_TIMEOUT_MS = 30 * 60 * 1000;

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

  /** URL autenticada por cookie (mesma origem com `/api` no proxy habitual). */
  static getBackupDownloadUrl(nome: string): string {
    const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
    const path = `/saas/backups/${encodeURIComponent(nome)}/download`;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /**
   * Inicia o download pelo navegador (streaming para disco).
   * Evita Axios+blob, que mantem o arquivo inteiro na RAM e estoura memoria/timeout em backups grandes.
   */
  static startBackupDownload(nome: string): void {
    const href = BackupService.getBackupDownloadUrl(nome);
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('download', nome);
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  static async restoreBackup(nome: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      `/saas/backups/${encodeURIComponent(nome)}/restore`,
      undefined,
      { timeout: BACKUP_LONG_OPERATION_TIMEOUT_MS, forceLoading: true }
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);

    return {
      success: true,
      message: data.message ?? 'Restauracao solicitada.'
    };
  }

  static async executeManual(tipo: BackupManualTipo): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      '/saas/backups/manual',
      { tipo },
      { timeout: BACKUP_LONG_OPERATION_TIMEOUT_MS, forceLoading: true }
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);

    return {
      success: true,
      message: data.message ?? 'Backup em fila.'
    };
  }

  static async uploadBackup(file: File): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('arquivo', file);
    const response = await apiService.post<{ success: boolean; message?: string; data?: { nome: string } }>(
      '/saas/backups/upload',
      formData,
      { timeout: BACKUP_LONG_OPERATION_TIMEOUT_MS, forceLoading: true }
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);
    return {
      success: true,
      message: data.message ?? 'Backup importado com sucesso.'
    };
  }

}

