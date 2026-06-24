/**
 * OrdemServicoService - integração com a API IXC Provedor (su_oss_chamado).
 * O backend (/api/ixc/ordens-servico) traduz as chamadas para o webservice IXC.
 */
import { BaseService, defaultApiClient } from './core';
import type { BaseFilters } from './core/BaseService';
import { PaginatedResponse } from '../types';

export interface OrdemServico {
  id: string | number;
  cliente_id?: string | number;
  id_estrutura?: string;
  id_filial?: string;
  estrutura_nome?: string;
  filial_nome?: string;
  cliente_nome?: string;
  tecnico_nome?: string;
  assunto_nome?: string;
  setor_nome?: string;
  cidade_nome?: string;
  origem_endereco?: string;
  origem?: string;
  id_assunto?: string;
  id_tecnico?: string;
  setor?: string;
  protocolo?: string;
  tipo?: string;
  prioridade?: string;
  status?: string;
  melhor_horario_agenda?: string;
  mensagem?: string;
  mensagem_resposta?: string;
  data_abertura?: string;
  data_agenda?: string;
  data_final?: string;
  data_fechamento?: string;
  id_cidade?: string;
  bairro?: string;
  endereco?: string;
  complemento?: string;
  referencia?: string;
  [campo: string]: unknown;
}

export type CreateOrdemServico = Partial<OrdemServico>;
export type UpdateOrdemServico = Partial<OrdemServico>;

export type OrdemServicoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'executar'
  | 'finalizar'
  | 'reabrir'
  | 'registrar_mensagem';

export interface OrdemServicoAcaoPayload {
  mensagem?: string;
  mensagem_resposta?: string;
  data_agenda?: string;
  data_agenda_final?: string;
  id_tecnico?: string;
  setor?: string;
  id_assunto?: string;
  /** S = alterar setor no encaminhamento | N = manter setor atual */
  altera_setor_encaminhamento?: string;
}

export interface OrdemServicoMensagem {
  id: string;
  id_chamado: string;
  id_evento: string;
  id_operador: string;
  id_tecnico?: string;
  evento_nome?: string;
  operador_nome?: string;
  colaborador_nome?: string;
  mensagem: string;
  data: string;
}

export interface OrdemServicoArquivo {
  id: string;
  ordem_servico_id: string;
  descricao: string;
  nome: string;
  mime_type: string;
}

export interface CreateOrdemServicoArquivoRequest {
  descricao?: string;
  arquivo: File;
}

export interface OrdemServicoFilters extends BaseFilters {
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

class OrdemServicoServiceClass extends BaseService<
  OrdemServico,
  CreateOrdemServico,
  UpdateOrdemServico,
  OrdemServicoFilters
> {
  constructor() {
    super(defaultApiClient, '/ixc/ordens-servico');
  }
}

const ordemServicoServiceInstance = new OrdemServicoServiceClass();

export class OrdemServicoService {
  static async list(filters: OrdemServicoFilters = {}): Promise<PaginatedResponse<OrdemServico>> {
    return ordemServicoServiceInstance.list(filters);
  }

  static async getById(id: number | string): Promise<OrdemServico> {
    const response = await ordemServicoServiceInstance.getById(id as number);
    if (response.data) {
      return response.data;
    }
    return response as unknown as OrdemServico;
  }

  static async listMensagens(id: number | string): Promise<OrdemServicoMensagem[]> {
    const response = await defaultApiClient.get<OrdemServicoMensagem[]>(
      `/ixc/ordens-servico/${id}/mensagens`
    );
    return response.data ?? [];
  }

  static async deleteMensagem(
    ordemServicoId: number | string,
    mensagemId: number | string
  ): Promise<void> {
    await defaultApiClient.delete(
      `/ixc/ordens-servico/${ordemServicoId}/mensagens/${mensagemId}`
    );
  }

  static async listArquivos(id: number | string): Promise<OrdemServicoArquivo[]> {
    const response = await defaultApiClient.get<OrdemServicoArquivo[]>(
      `/ixc/ordens-servico/${id}/arquivos`
    );
    return response.data ?? [];
  }

  static async uploadArquivo(
    ordemServicoId: number | string,
    data: CreateOrdemServicoArquivoRequest
  ): Promise<void> {
    const formData = new FormData();
    formData.append('arquivo', data.arquivo);
    if (data.descricao) {
      formData.append('descricao', data.descricao);
    }

    await defaultApiClient.post(
      `/ixc/ordens-servico/${ordemServicoId}/arquivos`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  static async deleteArquivo(
    ordemServicoId: number | string,
    arquivoId: number | string
  ): Promise<void> {
    await defaultApiClient.delete(
      `/ixc/ordens-servico/${ordemServicoId}/arquivos/${arquivoId}`
    );
  }

  static async fetchArquivoBlob(
    ordemServicoId: number | string,
    arquivoId: number | string,
    view = false
  ): Promise<Blob> {
    const viewParam = view ? '?view=true' : '';
    const response = await defaultApiClient.get<Blob>(
      `/ixc/ordens-servico/${ordemServicoId}/arquivos/${arquivoId}/download${viewParam}`,
      { responseType: 'blob' }
    );

    const blob = (response.data ?? response) as Blob;
    if (!(blob instanceof Blob)) {
      throw new Error('Erro ao baixar arquivo');
    }

    return blob;
  }

  static async downloadArquivo(
    ordemServicoId: number | string,
    arquivoId: number | string,
    nome: string
  ): Promise<void> {
    const blob = await OrdemServicoService.fetchArquivoBlob(ordemServicoId, arquivoId, false);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome || 'arquivo';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  static async create(data: CreateOrdemServico): Promise<OrdemServico> {
    const response = await ordemServicoServiceInstance.create(data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as OrdemServico;
  }

  static async update(id: number | string, data: UpdateOrdemServico): Promise<OrdemServico> {
    const response = await ordemServicoServiceInstance.update(id as number, data);
    if (response.data) {
      return response.data;
    }
    return response as unknown as OrdemServico;
  }

  static async delete(id: number | string): Promise<void> {
    await ordemServicoServiceInstance.delete(id as number);
  }

  static async executarAcao(
    id: number | string,
    acao: OrdemServicoAcao,
    data: OrdemServicoAcaoPayload = {}
  ): Promise<{ type?: string; message?: string; id?: string }> {
    const url = `/ixc/ordens-servico/${id}/acoes/${acao}`;

    const response = await defaultApiClient.post<{ data?: { type?: string; message?: string; id?: string } }>(
      url,
      data
    );

    return response.data?.data ?? (response.data as { type?: string; message?: string; id?: string });
  }
}

export const ordemServicoService = ordemServicoServiceInstance;
