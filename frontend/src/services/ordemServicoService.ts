/**
 * OrdemServicoService - integração com a API IXC Provedor (su_oss_chamado).
 * O backend (/api/ixc/ordens-servico) traduz as chamadas para o webservice IXC.
 */
import { BaseService, defaultApiClient } from './core';
import type { BaseFilters } from './core/BaseService';
import { PaginatedResponse } from '../types';

export interface OrdemServico {
  id: string | number;
  id_cliente?: string;
  id_estrutura?: string;
  id_filial?: string;
  estrutura_nome?: string;
  filial_nome?: string;
  tecnico_nome?: string;
  assunto_nome?: string;
  setor_nome?: string;
  cidade_nome?: string;
  status_sla?: string;
  origem_endereco?: string;
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
