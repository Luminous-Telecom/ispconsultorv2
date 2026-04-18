/**
 * BlockdomiService - Importação unificada com controle de versão
 */
import { defaultApiClient } from './core';

export interface ImportarListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  numero_sei_anatel?: string | null;
}

export interface ImportarListaResult {
  versao_lista: string;
  dominios: { created: number; updated: number; skipped: number; errors: string[] };
  ipv4: { created: number; updated: number; skipped: number; errors: string[] };
  ipv6: { created: number; updated: number; skipped: number; errors: string[] };
}

export interface RemoverListaPayload {
  dominios: string[];
  ipv4: string[];
  ipv6: string[];
}

export interface RemoverListaResult {
  dominios: { deleted: number; notFound: number; versao?: string };
  ipv4: { deleted: number; notFound: number; versao?: string };
  ipv6: { deleted: number; notFound: number; versao?: string };
}

export interface GerarVersaoResult {
  id: number;
  numero: string;
}

export class BlockdomiService {
  static async getVersaoAtual(): Promise<string> {
    const response = await defaultApiClient.get<string>('/blockdomi/versao-atual', { responseType: 'text' });
    const data = (response as { data?: string }).data;
    return data ?? '';
  }

  static async gerarVersao(): Promise<GerarVersaoResult> {
    const response = await defaultApiClient.post<GerarVersaoResult>('/blockdomi/gerar-versao', {});
    const data = (response as { data?: GerarVersaoResult }).data;
    if (!data) {
      throw new Error('Resposta inválida do servidor');
    }
    return data;
  }

  static async importarLista(payload: ImportarListaPayload): Promise<ImportarListaResult> {
    const response = await defaultApiClient.post<ImportarListaResult>(
      '/blockdomi/importar-lista',
      payload,
      { timeout: 120000 }
    );
    const data = (response as { data?: ImportarListaResult }).data;
    if (!data) {
      throw new Error('Resposta inválida do servidor');
    }
    return data;
  }

  static async removerLista(payload: RemoverListaPayload): Promise<RemoverListaResult> {
    const response = await defaultApiClient.post<RemoverListaResult>(
      '/blockdomi/remover-lista',
      payload,
      { timeout: 120000 }
    );
    const data = (response as { data?: RemoverListaResult }).data;
    if (!data) {
      throw new Error('Resposta inválida do servidor');
    }
    return data;
  }

  static async uploadOficioPdf(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('arquivo', file);
    const response = await defaultApiClient.post<{ success: boolean; data?: { url: string; path: string } }>(
      '/blockdomi/upload-oficio-pdf',
      formData,
      { timeout: 120000 }
    );
    const data = (response as { data?: { url: string; path: string } }).data;
    if (!data?.url) {
      throw new Error('Resposta inválida do servidor');
    }
    return { url: data.url };
  }

  /** Envia o PDF do ofício Anatel e retorna o número SEI extraído (arquivo não permanece armazenado). */
  static async extractSeiAnatelFromPdf(file: File): Promise<{ sei: string }> {
    const formData = new FormData();
    formData.append('arquivo', file);
    const response = await defaultApiClient.post<{ sei: string }>(
      '/blockdomi/extract-sei-anatel-pdf',
      formData,
      { timeout: 120000 }
    );
    const sei = response.data?.sei;
    if (!response.success || !sei) {
      throw new Error(response.message || 'Não foi possível extrair o SEI deste PDF.');
    }
    return { sei };
  }
}
