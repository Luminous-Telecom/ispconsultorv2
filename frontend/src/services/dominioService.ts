/**
 * DominioService - Serviço usando BaseService
 */
import { BaseService, defaultApiClient } from './core';
import { resolveServiceErrorMessage, CONTEXT_ERROR_MESSAGES } from '../utils/apiErrorHelper';
import { type ApiResponse, Dominio, CreateDominio, UpdateDominio, DominioFilters, PaginatedResponse } from '../types';

export type SincronizarSeiAnatelDominiosResponse = {
  dominiosCandidatos: number;
  pdfsDistintos: number;
  dominiosAtualizados: number;
  resultados: Array<{
    link_oficio_anatel: string;
    quantidade_dominios: number;
    nome_oficio?: string | null;
    versao_numero?: string | null;
    sei?: string;
    erro?: string;
  }>;
};

class DominioServiceClass extends BaseService<Dominio, CreateDominio, UpdateDominio, DominioFilters> {
  constructor() {
    super(defaultApiClient, '/dominios');
  }
}

const dominioServiceInstance = new DominioServiceClass();

export type CodigoMotivoBaixarPdf =
  | 'http'
  | 'timeout'
  | 'link_invalido'
  | 'tamanho'
  | 'nao_pdf'
  | 'rede'
  | 'desconhecido';

export type MotivoBaixarPdf = {
  codigo: CodigoMotivoBaixarPdf;
  detalhe: string | null;
};

export type OcorrenciaBaixarPdf = MotivoBaixarPdf & {
  quantidade: number;
};

export type BaixarPdfsBlockdomiResult = {
  pdfsBaixados: number;
  pdfsJaLocais: number;
  registrosAtualizados: number;
  falhas: number;
  ignoradosNaoPdf: number;
  ocorrencias: OcorrenciaBaixarPdf[];
};

export type ProgressoBaixarPdfsBlockdomi = {
  fase: 'lendo' | 'baixando';
  total: number;
  processados: number;
  pdfsBaixados: number;
  pdfsJaLocais: number;
  registrosAtualizados: number;
  falhas: number;
  ignoradosNaoPdf: number;
  atual: string | null;
  motivo: MotivoBaixarPdf | null;
};

export type StatusBaixarPdfsBlockdomi = {
  estado: 'ocioso' | 'executando' | 'concluido' | 'erro';
  resultado: BaixarPdfsBlockdomiResult | null;
  erro: string | null;
  progresso: ProgressoBaixarPdfsBlockdomi;
};

export class DominioService {
  static async list(filters: DominioFilters = {}): Promise<PaginatedResponse<Dominio>> {
    return dominioServiceInstance.list(filters);
  }

  static async getById(id: number): Promise<Dominio> {
    const response = await dominioServiceInstance.getById(id);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async create(data: CreateDominio): Promise<Dominio> {
    const response = await dominioServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async update(id: number, data: UpdateDominio): Promise<Dominio> {
    const response = await dominioServiceInstance.update(id, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Dominio;
  }

  static async delete(id: number): Promise<void> {
    await dominioServiceInstance.delete(id);
  }

  static async bulkDelete(ids: number[]): Promise<{ deleted: number; versao: string }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ deleted: number; versao: string }>('/dominios/bulk-delete', { ids });
    const data = (response as { data?: { deleted: number; versao: string } }).data;
    return data ?? { deleted: 0, versao: '' };
  }

  static async bulkUpdate(payload: {
    ids: number[];
    nome_oficio?: string | null;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    link_oficio_anatel?: string | null;
    link_oficio_justica?: string | null;
    link_planilha_dominios?: string | null;
    numero_sei_anatel?: string | null;
    descricao?: string | null;
    ativo?: boolean;
  }): Promise<{ updated: number }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ updated: number }>('/dominios/bulk-update', payload);
    const data = (response as { data?: { updated: number } }).data;
    return data ?? { updated: 0 };
  }

  /**
   * Dispara o download. O andamento e o fim chegam pelo socket blockdomi:pdfs.
   */
  static async baixarPdfs(): Promise<StatusBaixarPdfsBlockdomi> {
    const { defaultApiClient } = await import('./core');
    const inicio: ApiResponse<StatusBaixarPdfsBlockdomi> = await defaultApiClient.post(
      '/dominios/baixar-pdfs',
      {},
      { timeout: 60000 }
    );
    if (!inicio.success || inicio.data == null) {
      throw new Error(resolveServiceErrorMessage(inicio.message, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_DOWNLOAD_PDFS_ERROR));
    }
    return inicio.data;
  }

  static async sincronizarSeiAnatel(): Promise<SincronizarSeiAnatelDominiosResponse> {
    const { defaultApiClient } = await import('./core');
    const response: ApiResponse<SincronizarSeiAnatelDominiosResponse> = await defaultApiClient.post(
      '/dominios/sincronizar-sei-anatel',
      {},
      { timeout: 600000 }
    );
    if (!response.success || response.data == null) {
      throw new Error(resolveServiceErrorMessage(response.message, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_SEI_SYNC_ERROR));
    }
    return response.data;
  }

  static async bulkCreate(payload: {
    items: string[];
    nome_oficio?: string | null;
    data_inicio_bloqueio?: string | null;
    data_fim_bloqueio?: string | null;
    link_oficio_anatel?: string | null;
    link_oficio_justica?: string | null;
    link_planilha_dominios?: string | null;
    numero_sei_anatel?: string | null;
  }): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
    const { defaultApiClient } = await import('./core');
    const response = await defaultApiClient.post<{ created: number; updated: number; skipped: number; errors: string[] }>('/dominios/bulk', payload, { timeout: 120000 });
    const data = (response as { data?: { created: number; updated: number; skipped: number; errors: string[] } }).data;
    return data ?? { created: 0, updated: 0, skipped: 0, errors: [] };
  }
}

export const dominioService = dominioServiceInstance;
