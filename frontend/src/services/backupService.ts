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

export interface BackupStreamEvent {
  step?: string;
  progress?: number;
  message?: string;
  logs?: string[];
  success?: boolean;
  error?: string;
}

export function consumeBackupSseBuffer(buffer: string): { events: BackupStreamEvent[]; rest: string } {
  const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = parts.pop() ?? '';
  const events: BackupStreamEvent[] = [];
  for (const part of parts) {
    const dataLine = part.split('\n').filter((line) => line.startsWith('data: ')).pop();
    if (!dataLine) continue;
    try {
      const data = JSON.parse(dataLine.slice(6)) as BackupStreamEvent;
      if (!data || typeof data !== 'object') continue;
      events.push(data);
    } catch {
      // bloco incompleto ou comentário sem JSON
    }
  }
  return { events, rest };
}

export class BackupService {
  static async list(): Promise<Backup[]> {
    const response = await apiService.get<Backup[]>('/backups');
    return unwrapResponse<Backup[]>(response, { fallback: [], throwOnFailure: false });
  }

  static async deleteBackup(nome: string): Promise<void> {
    const response = await apiService.delete<{ success: boolean; message: string }>(
      `/backups/${encodeURIComponent(nome)}`
    );
    unwrapResponse(response, { fallback: { success: true, message: '' } });
  }

  /** URL autenticada por cookie (mesma origem com `/api` no proxy habitual). */
  static getBackupDownloadUrl(nome: string): string {
    const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
    const path = `/backups/${encodeURIComponent(nome)}/download`;
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
    a.className = 'visually-hidden-input';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  static async restoreBackup(nome: string): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      `/backups/${encodeURIComponent(nome)}/restore`,
      undefined,
      { timeout: BACKUP_LONG_OPERATION_TIMEOUT_MS, forceLoading: true }
    );
    const data = unwrapResponse<{ success: boolean; message?: string }>(response);

    return {
      success: true,
      message: data.message ?? 'Restauracao solicitada.'
    };
  }

  static async executeManualStream(
    tipo: BackupManualTipo,
    onEvent: (event: BackupStreamEvent) => void
  ): Promise<{ success: boolean; message: string }> {
    const base = API_CONFIG.BASE_URL.replace(/\/+$/, '');
    const response = await fetch(`${base}/backups/manual-stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ tipo }),
    });

    if (!response.ok) {
      let message = `Falha no backup (HTTP ${response.status})`;
      try {
        const body = await response.json() as { message?: string };
        if (body.message) message = body.message;
      } catch {
        // corpo não JSON
      }
      throw new Error(message);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Resposta do backup sem conteúdo');

    const decoder = new TextDecoder();
    let buffer = '';
    let finalMessage = '';
    let succeeded = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = consumeBackupSseBuffer(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        onEvent(event);
        if (event.error) throw new Error(event.error);
        if (event.message) finalMessage = event.message;
        if (event.success) succeeded = true;
      }
    }

    if (!succeeded) throw new Error(finalMessage || 'Backup encerrado sem confirmação');
    return { success: true, message: finalMessage };
  }

  static async executeManual(tipo: BackupManualTipo): Promise<{ success: boolean; message: string }> {
    const response = await apiService.post<{ success: boolean; message?: string }>(
      '/backups/manual',
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
      '/backups/upload',
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

