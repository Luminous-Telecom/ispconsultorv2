/**
 * AtendimentoService — integração com a API IXC Provedor (su_ticket).
 * Backend: /api/ixc/atendimentos
 */
import { BaseService, defaultApiClient } from './core';
import type { BaseFilters } from './core/BaseService';
import { PaginatedResponse } from '../types';
import { extractApiErrorMessage, CONTEXT_ERROR_MESSAGES } from '../utils/apiErrorHelper';

const IXC_ATENDIMENTO_TIMEOUT_MS = 120_000;

export interface Atendimento {
  id: string | number;
  id_local?: string | number;
  ixc_id?: string;
  origem?: 'ixc' | 'ispconsultor';
  protocolo?: string;
  id_filial?: string;
  id_estrutura?: string;
  id_assunto?: string;
  id_ticket_setor?: string;
  id_responsavel_technico?: string;
  id_cliente?: string;
  cliente_id?: string | number;
  cliente_nome?: string;
  titulo?: string;
  menssagem?: string;
  prioridade?: string;
  melhor_horario_reserve?: string;
  data_reservada?: string;
  su_status?: string;
  ultima_atualizacao?: string;
  data_criacao?: string;
  tipo?: string;
  filial_nome?: string;
  estrutura_nome?: string;
  assunto_nome?: string;
  departamento_nome?: string;
  responsavel_nome?: string;
  [campo: string]: unknown;
}

export type CreateAtendimento = Partial<Atendimento>;
export type UpdateAtendimento = Partial<Atendimento>;

export interface AtendimentoMensagem {
  id: string;
  id_ticket: string;
  mensagem: string;
  data: string;
  operador?: string;
  su_status?: string;
  visibilidade_mensagens?: string;
  ultima_atualizacao?: string;
}

export interface AtendimentoArquivo {
  id: string;
  descricao: string;
  nome?: string;
  mime_type?: string;
}

export interface CreateAtendimentoArquivoRequest {
  arquivo: File;
  descricao?: string;
}

export interface AtendimentoOrdemServico {
  id: string;
  protocolo?: string;
  status?: string;
  mensagem?: string;
  [campo: string]: unknown;
}

export interface AtendimentoFilters extends BaseFilters {
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  cliente_id?: number;
  id_ticket_setor?: string;
  /** `T` = abertos. `all` = todos (padrão na listagem global). */
  status?: string;
}

class AtendimentoServiceClass extends BaseService<
  Atendimento,
  CreateAtendimento,
  UpdateAtendimento,
  AtendimentoFilters
> {
  constructor() {
    super(defaultApiClient, '/ixc/atendimentos');
  }
}

const atendimentoServiceInstance = new AtendimentoServiceClass();

export class AtendimentoService {
  static async list(filters: AtendimentoFilters = {}): Promise<PaginatedResponse<Atendimento>> {
    return atendimentoServiceInstance.list(filters);
  }

  static async getById(id: number | string, clienteId?: number): Promise<Atendimento> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    const response = await defaultApiClient.get<Atendimento>(`/ixc/atendimentos/${id}${params}`);
    if (response.data) {
      return response.data;
    }
    return response as unknown as Atendimento;
  }

  static async create(data: CreateAtendimento): Promise<Atendimento> {
    const response = await defaultApiClient.post<Atendimento>('/ixc/atendimentos', data, {
      timeout: IXC_ATENDIMENTO_TIMEOUT_MS,
    });
    if (response.data) {
      return response.data;
    }
    return response as unknown as Atendimento;
  }

  static async update(id: number | string, data: UpdateAtendimento): Promise<Atendimento> {
    const response = await defaultApiClient.put<Atendimento>(`/ixc/atendimentos/${id}`, data, {
      timeout: IXC_ATENDIMENTO_TIMEOUT_MS,
    });
    if (response.data) {
      return response.data;
    }
    return response as unknown as Atendimento;
  }

  static async delete(id: number | string, clienteId?: number): Promise<void> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    await defaultApiClient.delete(`/ixc/atendimentos/${id}${params}`);
  }

  static async listMensagens(
    id: number | string,
    clienteId?: number
  ): Promise<AtendimentoMensagem[]> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    const response = await defaultApiClient.get<AtendimentoMensagem[]>(
      `/ixc/atendimentos/${id}/mensagens${params}`
    );
    return response.data ?? [];
  }

  static async createMensagem(
    id: number | string,
    mensagem: string,
    clienteId?: number,
    suStatus?: string
  ): Promise<unknown> {
    return defaultApiClient.post(
      `/ixc/atendimentos/${id}/mensagens`,
      { mensagem, cliente_id: clienteId, su_status: suStatus },
      { timeout: IXC_ATENDIMENTO_TIMEOUT_MS }
    );
  }

  static async deleteMensagem(
    id: number | string,
    mensagemId: number | string,
    clienteId?: number
  ): Promise<void> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    await defaultApiClient.delete(`/ixc/atendimentos/${id}/mensagens/${mensagemId}${params}`);
  }

  static async listArquivos(
    id: number | string,
    clienteId?: number
  ): Promise<AtendimentoArquivo[]> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    const response = await defaultApiClient.get<AtendimentoArquivo[]>(
      `/ixc/atendimentos/${id}/arquivos${params}`
    );
    return response.data ?? [];
  }

  static async uploadArquivo(
    atendimentoId: number | string,
    data: CreateAtendimentoArquivoRequest,
    clienteId?: number
  ): Promise<void> {
    const formData = new FormData();
    formData.append('arquivo', data.arquivo);
    if (data.descricao) {
      formData.append('descricao', data.descricao);
    }
    if (clienteId) {
      formData.append('cliente_id', String(clienteId));
    }

    await defaultApiClient.post(`/ixc/atendimentos/${atendimentoId}/arquivos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  static async deleteArquivo(
    atendimentoId: number | string,
    arquivoId: number | string,
    clienteId?: number
  ): Promise<void> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    await defaultApiClient.delete(
      `/ixc/atendimentos/${atendimentoId}/arquivos/${arquivoId}${params}`
    );
  }

  static async fetchArquivoBlob(
    atendimentoId: number | string,
    arquivoId: number | string,
    clienteId?: number,
    view = false
  ): Promise<Blob> {
    const viewParam = view ? 'view=true' : '';
    const clienteParam = clienteId ? `cliente_id=${clienteId}` : '';
    const queryParts = [viewParam, clienteParam].filter(Boolean);
    const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const response = await defaultApiClient.get<Blob>(
      `/ixc/atendimentos/${atendimentoId}/arquivos/${arquivoId}/download${query}`,
      { responseType: 'blob' }
    );

    const blob = (response.data ?? response) as Blob;
    if (!(blob instanceof Blob)) {
      throw new Error('Erro ao baixar arquivo');
    }

    return blob;
  }

  static async downloadArquivo(
    atendimentoId: number | string,
    arquivoId: number | string,
    nome: string,
    clienteId?: number
  ): Promise<void> {
    const blob = await AtendimentoService.fetchArquivoBlob(
      atendimentoId,
      arquivoId,
      clienteId,
      false
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome || 'arquivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  static async listOrdensServico(
    id: number | string,
    clienteId?: number
  ): Promise<AtendimentoOrdemServico[]> {
    const params = clienteId ? `?cliente_id=${clienteId}` : '';
    const response = await defaultApiClient.get<AtendimentoOrdemServico[]>(
      `/ixc/atendimentos/${id}/ordens-servico${params}`
    );
    return response.data ?? [];
  }

  static async imprimirPdf(
    id: number | string,
    options: { clienteId?: number; modeloId?: number } = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (options.clienteId) params.set('cliente_id', String(options.clienteId));
    if (options.modeloId) params.set('modelo_id', String(options.modeloId));
    const qs = params.toString() ? `?${params.toString()}` : '';

    try {
      const response = await defaultApiClient.get<Blob>(`/ixc/atendimentos/${id}/imprimir${qs}`, {
        responseType: 'blob',
        timeout: 60_000,
      });

      const blob = response.data ?? (response as unknown as Blob);
      if (!(blob instanceof Blob)) {
        throw new Error('Resposta do servidor não é um PDF válido');
      }

      if (blob.size < 1000) {
        try {
          const text = await blob.text();
          const errorData = JSON.parse(text) as { message?: string };
          if (errorData.message?.trim()) {
            throw new Error(errorData.message.trim());
          }
        } catch (parseError) {
          if (parseError instanceof Error && !('isAxiosError' in parseError)) {
            throw parseError;
          }
        }
      }

      return blob;
    } catch (error) {
      if (error instanceof Error && !('isAxiosError' in error)) {
        throw error;
      }

      const message = await extractApiErrorMessage(error, {
        defaultMessage: CONTEXT_ERROR_MESSAGES.PDF_GENERATE_ERROR,
        handleBlobResponse: true,
      });
      throw new Error(message);
    }
  }
}
