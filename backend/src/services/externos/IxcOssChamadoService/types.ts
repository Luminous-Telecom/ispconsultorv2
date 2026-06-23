export type OssChamadoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'executar'
  | 'finalizar'
  | 'reabrir'
  | 'registrar_mensagem';

export interface IxcNamedRecord {
  id: string;
  [campo: string]: string;
}

export interface IxcOssChamado {
  id: string;
  [campo: string]: string;
}

export interface IxcListResponse {
  page?: string;
  total?: string;
  registros?: IxcOssChamado[];
}

export interface IxcActionResponse {
  type?: 'success' | 'error';
  message?: string;
  mensagem?: string;
  id?: string;
  protocolo?: string;
  data_abertura?: string;
}

export interface ListOssChamadosFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface OssChamadoPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}

export interface ListOssChamadosResponse {
  data: IxcOssChamado[];
  pagination: OssChamadoPagination;
}

export interface LookupItem {
  id: string;
  nome: string;
}

export interface ListLookupResponse {
  data: LookupItem[];
  pagination: OssChamadoPagination;
}

export type OssChamadoInput = Record<string, string | number | null | undefined>;

export interface IxcOssMensagem {
  id: string;
  id_chamado: string;
  id_evento: string;
  id_operador: string;
  id_tecnico?: string;
  mensagem: string;
  data: string;
  evento_nome?: string;
  operador_nome?: string;
  colaborador_nome?: string;
}
