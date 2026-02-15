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
}

export interface ImportarListaResult {
  versao_lista: string;
  dominios: { created: number; updated: number; skipped: number; errors: string[] };
  ipv4: { created: number; updated: number; skipped: number; errors: string[] };
  ipv6: { created: number; updated: number; skipped: number; errors: string[] };
}

export interface GerarVersaoResult {
  id: number;
  numero: string;
}

export class BlockdomiService {
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
}
