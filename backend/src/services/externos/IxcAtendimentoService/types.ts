export interface IxcAtendimento {
  id: string;
  id_local?: string;
  ixc_id?: string;
  origem?: 'ixc' | 'ispconsultor';
  protocolo?: string;
  id_filial?: string;
  id_estrutura?: string;
  id_assunto?: string;
  id_ticket_setor?: string;
  id_responsavel_technico?: string;
  id_cliente?: string;
  id_contrato?: string;
  titulo?: string;
  menssagem?: string;
  prioridade?: string;
  melhor_horario_reserve?: string;
  data_reservada?: string;
  su_status?: string;
  ultima_atualizacao?: string;
  data_criacao?: string;
  tipo?: string;
  cliente_id?: string | number;
  cliente_nome?: string;
  filial_nome?: string;
  estrutura_nome?: string;
  assunto_nome?: string;
  departamento_nome?: string;
  responsavel_nome?: string;
  [campo: string]: string | number | undefined;
}

export interface IxcAtendimentoMensagem {
  id: string;
  id_ticket: string;
  mensagem: string;
  data: string;
  operador?: string;
  su_status?: string;
  visibilidade_mensagens?: string;
  ultima_atualizacao?: string;
}

export interface IxcAtendimentoArquivo {
  id: string;
  id_ticket?: string;
  descricao: string;
  nome?: string;
  local_arquivo?: string;
}

export interface ListAtendimentosFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  cliente_id?: number;
  /** Departamento do atendimento (`su_ticket.id_ticket_setor`). */
  id_ticket_setor?: string;
  /**
   * `T` = em aberto (padrão IXC). `all` = sem filtro de status.
   * Vazio/omitido = abertos (`T`).
   */
  status?: string;
}

export interface AtendimentoPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface ListAtendimentosResponse {
  data: IxcAtendimento[];
  pagination: AtendimentoPagination;
}

export type AtendimentoInput = Record<string, string | number | null | undefined>;

export interface IxcAtualizaCampo {
  tipo?: string;
  campo?: string;
  valor?: string;
}

export interface IxcActionResponse {
  type?: 'success' | 'error';
  message?: string;
  mensagem?: string;
  id?: string;
  protocolo?: string;
  atualiza_campos?: IxcAtualizaCampo[];
}
