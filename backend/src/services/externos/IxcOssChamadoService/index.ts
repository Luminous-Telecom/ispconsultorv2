/**
 * Integração com a API REST do IXC Provedor — Ordens de Serviço (su_oss_chamado).
 * Autenticação Basic com o token do IXC (formato `id:hash`, codificado em base64).
 * Operações: listar, buscar por id, criar, editar e deletar chamados de OS.
 */
import axios, { AxiosInstance, isAxiosError } from 'axios';

const IXC_RESOURCE = 'su_oss_chamado';
const IXC_MENSAGEM_RESOURCE = 'su_oss_chamado_mensagem';
const IXC_ALTERAR_SETOR_RESOURCE = 'su_oss_chamado_alterar_setor';
/** Evento "Abertura" na aba Mensagens/Interações da OS. */
const IXC_EVENTO_ABERTURA = '1';
/** Evento "Observação" — registrar mensagem na OS. */
const IXC_EVENTO_OBSERVACAO = '12';

export type OssChamadoAcao =
  | 'agendar'
  | 'encaminhar'
  | 'executar'
  | 'finalizar'
  | 'reabrir'
  | 'registrar_mensagem';

export const OSS_CHAMADO_ACOES: OssChamadoAcao[] = [
  'agendar',
  'encaminhar',
  'executar',
  'finalizar',
  'reabrir',
  'registrar_mensagem',
];
const IXC_ESTRUTURA_RESOURCE = 'estrutura';
const IXC_FUNCIONARIOS_RESOURCE = 'funcionarios';
const IXC_ASSUNTO_RESOURCE = 'su_oss_assunto';
const IXC_SETOR_RESOURCE = 'empresa_setor';
const IXC_FILIAL_RESOURCE = 'filial';
const IXC_CIDADE_RESOURCE = 'cidade';

interface IxcNamedRecord {
  id: string;
  [campo: string]: string;
}

export interface IxcOssChamado {
  id: string;
  [campo: string]: string;
}

interface IxcListResponse {
  page?: string;
  total?: string;
  registros?: IxcOssChamado[];
}

interface IxcActionResponse {
  type?: 'success' | 'error';
  message?: string;
  mensagem?: string;
  id?: string;
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

/** Campos adicionados pelo enrich — não enviar ao IXC. */
const CAMPOS_ENRIQUECIDOS = [
  'estrutura_nome',
  'tecnico_nome',
  'assunto_nome',
  'setor_nome',
  'filial_nome',
  'cidade_nome',
];

function stripCamposEnriquecidos(registro: IxcOssChamado): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(registro)) {
    if (CAMPOS_ENRIQUECIDOS.includes(key)) continue;
    result[key] = String(value ?? '');
  }
  return result;
}

/** Campos que o IXC preenche sozinho — não enviar na criação. */
const CAMPOS_AUTOGERADOS_CRIACAO = ['protocolo', 'data_abertura', 'ultima_atualizacao'];

function prepareCreateBody(payload: OssChamadoInput): Record<string, string> {
  const body = { ...OSS_DEFAULTS, ...sanitizeInput(payload) };
  delete body.id;
  for (const campo of CAMPOS_AUTOGERADOS_CRIACAO) {
    delete body[campo];
  }
  return body;
}

/**
 * Valores padrão usados ao criar/editar uma OS no IXC.
 * O formulário envia apenas os campos relevantes; os demais usam estes defaults.
 */
const OSS_DEFAULTS: Record<string, string> = {
  // Integração trabalha somente com OS de estrutura própria (tipo E).
  tipo: 'E',
  id_ticket: '',
  id_assunto: '',
  dica_assinatura_digital: '',
  id_cliente: '',
  id_estrutura: '',
  id_filial: '',
  id_login: '',
  id_contrato_kit: '',
  origem_endereco: 'M',
  origem_endereco_estrutura: 'E',
  latitude: '',
  longitude: '',
  status_conexao: '',
  prioridade: 'N',
  melhor_horario_agenda: 'Q',
  setor: '',
  id_tecnico: '',
  mensagem: '',
  id_receber: '',
  idx: '',
  status_pesquisa_satisfacao: '',
  status: 'A',
  habilita_assinatura_cliente: '',
  status_assinatura: 'A',
  gera_comissao: 'S',
  liberado: '1',
  impresso: 'N',
  preview: '',
  id_wfl_param_os: '',
  id_wfl_tarefa: '',
  id_su_diagnostico: '',
  regiao_manutencao: '',
  origem_cadastro: 'P',
  origem_change_endereco: 'default',
  status_sla: 'NULL',
  ultima_atualizacao: '',
  ids_login_regiao_manutencao: '',
  origem_os_aberta: '',
  id_cidade: '',
  bairro: '',
  endereco: '',
  complemento: '',
  referencia: '',
  id_condominio: '',
  bloco: '',
  apartamento: '',
  data_abertura: '',
  data_inicio: '',
  data_hora_analise: '',
  data_agenda: '',
  data_agenda_final: '',
  data_hora_encaminhado: '',
  data_hora_assumido: '',
  data_hora_execucao: '',
  data_final: '',
  data_fechamento: '',
  data_prazo_limite: '',
  data_reservada: '',
  data_reagendar: '',
  data_prev_final: '',
  mensagem_resposta: '',
  justificativa_sla_atrasado: '',
  valor_total: '',
  valor_outras_despesas: '',
  valor_unit_comissao: '0,00',
  valor_total_comissao: '0,00',
};

function ixcBaseUrl(): string {
  const raw = process.env.IXC_API_URL?.trim();
  if (!raw) {
    throw new Error('IXC_API_URL não configurado. Defina a URL do webservice IXC no .env.');
  }
  return raw.replace(/\/+$/, '');
}

function ixcAuthHeader(): string {
  const token = process.env.IXC_API_TOKEN?.trim();
  if (!token) {
    throw new Error('IXC_API_TOKEN não configurado. Defina o token do IXC no .env.');
  }
  return `Basic ${Buffer.from(token).toString('base64')}`;
}

/** usuarios.id do token IXC (prefixo antes dos dois pontos). */
function resolveOperadorId(): string {
  return process.env.IXC_API_TOKEN?.split(':')[0]?.trim() ?? '';
}

function paginaVazia(page: number, limit: number): ListOssChamadosResponse {
  return {
    data: [],
    pagination: {
      current_page: page,
      per_page: limit,
      total: 0,
      last_page: 1,
      from: 0,
      to: 0,
    },
  };
}

async function ixcListar<T>(resource: string, body: Record<string, string>): Promise<T> {
  const response = await createIxcClient().request<T>({
    method: 'GET',
    url: `/${resource}`,
    headers: { ixcsoft: 'listar' },
    data: body,
  });
  return response.data as T;
}

const gridMensagemAbertura = (operadorId: string) =>
  JSON.stringify([
    { TB: `${IXC_MENSAGEM_RESOURCE}.id_operador`, OP: '=', P: operadorId },
    { TB: `${IXC_MENSAGEM_RESOURCE}.id_evento`, OP: '=', P: IXC_EVENTO_ABERTURA },
  ]);

async function fetchOsIdsAbertasPeloOperador(operadorId: string): Promise<string[]> {
  const data = await ixcListar<{ registros?: IxcNamedRecord[] }>(IXC_MENSAGEM_RESOURCE, {
    qtype: `${IXC_MENSAGEM_RESOURCE}.id_operador`,
    query: operadorId,
    oper: '=',
    page: '1',
    rp: '1000',
    sortname: `${IXC_MENSAGEM_RESOURCE}.id`,
    sortorder: 'desc',
    grid_param: gridMensagemAbertura(operadorId),
  });

  const ids = (data.registros ?? [])
    .map((r) => r.id_chamado)
    .filter(Boolean)
    .map(String);
  return [...new Set(ids)];
}

async function osAbertaPeloOperador(ixcOsId: string | number): Promise<boolean> {
  const operadorId = resolveOperadorId();
  if (!operadorId) return false;

  const data = await ixcListar<{ total?: string }>(IXC_MENSAGEM_RESOURCE, {
    qtype: `${IXC_MENSAGEM_RESOURCE}.id_chamado`,
    query: String(ixcOsId),
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${IXC_MENSAGEM_RESOURCE}.id`,
    sortorder: 'desc',
    grid_param: JSON.stringify([
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_chamado`, OP: '=', P: String(ixcOsId) },
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_operador`, OP: '=', P: operadorId },
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_evento`, OP: '=', P: IXC_EVENTO_ABERTURA },
    ]),
  });

  return (parseInt(data.total ?? '0', 10) || 0) > 0;
}

function sortRegistros(
  registros: IxcOssChamado[],
  sortColumn: string,
  sortDirection: 'asc' | 'desc'
): IxcOssChamado[] {
  const dir = sortDirection === 'asc' ? 1 : -1;
  return [...registros].sort((a, b) => {
    const av = a[sortColumn] ?? '';
    const bv = b[sortColumn] ?? '';
    const an = Number(av);
    const bn = Number(bv);
    if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
      return (an - bn) * dir;
    }
    return String(av).localeCompare(String(bv), 'pt-BR', { numeric: true }) * dir;
  });
}

function createIxcClient(): AxiosInstance {
  return axios.create({
    baseURL: ixcBaseUrl(),
    timeout: 30_000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: ixcAuthHeader(),
    },
  });
}

/** Normaliza o payload do formulário para strings (formato esperado pelo IXC). */
function sanitizeInput(payload: OssChamadoInput): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    result[key] = String(value);
  }
  return result;
}

function actionErrorMessage(data: IxcActionResponse, fallback: string): string {
  const raw = data.message || data.mensagem || fallback;
  return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

function nowIxcDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Monta body da OS para PUT com header ixcsoft — preserva descrição original da OS. */
function buildActionBody(
  acao: OssChamadoAcao,
  atual: IxcOssChamado,
  payload: OssChamadoInput
): Record<string, string> {
  const sanitized = sanitizeInput(payload);
  const body: Record<string, string> = { ...stripCamposEnriquecidos(atual) };

  const mensagemAcao = sanitized.mensagem;
  delete sanitized.mensagem;

  if (acao !== 'finalizar') {
    delete sanitized.mensagem_resposta;
  }

  Object.assign(body, sanitized);

  if (acao === 'agendar') {
    const dataAgenda = sanitized.data_agenda ?? body.data_agenda;
    if (dataAgenda) {
      body.data_agenda = dataAgenda;
      body.data_inicio = dataAgenda;
    }
    if (sanitized.data_agenda_final) {
      body.data_agenda_final = sanitized.data_agenda_final;
    }
    if (sanitized.id_tecnico) {
      body.id_tecnico = sanitized.id_tecnico;
    }
    body.status = 'AG';
  }

  if (acao === 'finalizar' && sanitized.mensagem_resposta) {
    body.mensagem_resposta = sanitized.mensagem_resposta;
  }

  // Preserva descrição da OS — exceto registrar_mensagem
  if (mensagemAcao && acao !== 'registrar_mensagem') {
    body.mensagem = String(atual.mensagem ?? '');
  }

  return body;
}

/** Encaminhar OS via POST su_oss_chamado_alterar_setor. */
async function executarEncaminharOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const sanitized = sanitizeInput(payload);
  const alteraSetor = sanitized.altera_setor_encaminhamento === 'S';
  const response = await createIxcClient().request<IxcActionResponse>({
    method: 'POST',
    url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
    data: {
      id_chamado: String(id),
      id_setor: alteraSetor && sanitized.setor ? sanitized.setor : String(atual.setor ?? ''),
      id_tecnico: sanitized.id_tecnico || String(atual.id_tecnico ?? ''),
      id_assunto: sanitized.id_assunto || String(atual.id_assunto ?? ''),
      mensagem,
      status: 'EN',
    },
  });

  if (response.data?.type === 'error') {
    throw new Error(actionErrorMessage(response.data, 'Erro ao encaminhar ordem de serviço no IXC'));
  }

  return response.data;
}

/**
 * Agendar OS: POST su_oss_chamado_alterar_setor (status AG) + PUT agendar (datas).
 * O PUT ixcsoft:agendar sozinho grava data_agenda mas não altera o status.
 */
async function executarAgendarOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const sanitized = sanitizeInput(payload);
  const dataAgenda = sanitized.data_agenda?.trim();
  if (!dataAgenda) {
    throw new Error('Data de agendamento é obrigatória');
  }

  const idTecnico = sanitized.id_tecnico?.trim();
  if (!idTecnico) {
    throw new Error('Técnico é obrigatório');
  }

  const statusResponse = await createIxcClient().request<IxcActionResponse>({
    method: 'POST',
    url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
    data: {
      id_chamado: String(id),
      id_setor: sanitized.setor || String(atual.setor ?? ''),
      id_tecnico: idTecnico,
      id_assunto: sanitized.id_assunto || String(atual.id_assunto ?? ''),
      mensagem,
      status: 'AG',
    },
  });

  if (statusResponse.data?.type === 'error') {
    throw new Error(actionErrorMessage(statusResponse.data, 'Erro ao agendar ordem de serviço no IXC'));
  }

  const body = buildActionBody('agendar', atual, payload);

  try {
    const response = await createIxcClient().request<IxcActionResponse>({
      method: 'PUT',
      url: `/${IXC_RESOURCE}/${id}`,
      headers: { ixcsoft: 'agendar' },
      data: body,
    });

    if (response.data?.type === 'error') {
      throw new Error(actionErrorMessage(response.data, 'Erro ao registrar datas do agendamento no IXC'));
    }

    return response.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao registrar datas do agendamento no IXC');
  }
}

/**
 * Finalizar OS: PUT finalizar (mensagem_resposta) + POST alterar_setor (status F).
 * Uma única conclusão — o PUT sozinho não altera o status para finalizada.
 */
async function executarFinalizarOs(
  id: string | number,
  payload: OssChamadoInput,
  atual: IxcOssChamado
): Promise<IxcActionResponse> {
  const conclusao = String(payload.mensagem_resposta ?? payload.mensagem ?? '').trim();
  if (!conclusao) {
    throw new Error('Resposta é obrigatória');
  }

  const body = buildActionBody('finalizar', atual, {
    ...payload,
    mensagem_resposta: conclusao,
  });

  try {
    const putResponse = await createIxcClient().request<IxcActionResponse>({
      method: 'PUT',
      url: `/${IXC_RESOURCE}/${id}`,
      headers: { ixcsoft: 'finalizar' },
      data: body,
    });

    if (putResponse.data?.type === 'error') {
      throw new Error(actionErrorMessage(putResponse.data, 'Erro ao finalizar ordem de serviço no IXC'));
    }

    const statusResponse = await createIxcClient().request<IxcActionResponse>({
      method: 'POST',
      url: `/${IXC_ALTERAR_SETOR_RESOURCE}`,
      data: {
        id_chamado: String(id),
        id_setor: String(atual.setor ?? ''),
        id_tecnico: String(payload.id_tecnico ?? atual.id_tecnico ?? ''),
        id_assunto: String(atual.id_assunto ?? ''),
        mensagem: conclusao,
        status: 'F',
      },
    });

    if (statusResponse.data?.type === 'error') {
      throw new Error(actionErrorMessage(statusResponse.data, 'Erro ao finalizar ordem de serviço no IXC'));
    }

    return statusResponse.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao finalizar ordem de serviço no IXC');
  }
}

async function registrarMensagemOs(
  id: string | number,
  payload: OssChamadoInput
): Promise<IxcActionResponse> {
  const mensagem = String(payload.mensagem ?? '').trim();
  if (!mensagem) {
    throw new Error('Mensagem é obrigatória');
  }

  const operadorId = resolveOperadorId();
  const atual = await fetchOsRawById(id);
  if (!atual || Number(atual.id_estrutura) <= 0) {
    throw new Error('Ordem de serviço não encontrada');
  }

  const body: Record<string, string> = {
    id_chamado: String(id),
    id_evento: IXC_EVENTO_OBSERVACAO,
    mensagem,
    status: String(atual.status ?? 'A'),
    data: nowIxcDateTime(),
    id_tecnico: String(payload.id_tecnico ?? atual.id_tecnico ?? ''),
    id_operador: operadorId,
    gera_comissao: 'S',
    finaliza_processo: 'N',
    tipo_cobranca: 'NENHUM',
  };

  try {
    const response = await createIxcClient().post<IxcActionResponse>(`/${IXC_MENSAGEM_RESOURCE}`, body);
    if (response.data?.type === 'error') {
      throw new Error(actionErrorMessage(response.data, 'Erro ao registrar mensagem no IXC'));
    }
    return response.data;
  } catch (error) {
    throw wrapIxcError(error, 'Erro ao registrar mensagem no IXC');
  }
}

function wrapIxcError(error: unknown, fallback: string): Error {
  if (isAxiosError(error)) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return new Error('Falha de autenticação no IXC. Verifique IXC_API_TOKEN.');
    }
    const data = error.response?.data as IxcActionResponse | undefined;
    if (data) {
      return new Error(actionErrorMessage(data, fallback));
    }
    if (error.code === 'ECONNABORTED') {
      return new Error('Tempo de resposta do IXC excedido.');
    }
  }
  return error instanceof Error ? error : new Error(fallback);
}

/**
 * Busca registros do IXC por ids e retorna mapa id -> registro.
 */
async function fetchRegistrosPorIds(
  resource: string,
  ids: Iterable<string>
): Promise<Map<string, IxcNamedRecord>> {
  const mapa = new Map<string, IxcNamedRecord>();
  const unique = [...new Set([...ids].filter((id) => id && id !== '0'))];

  await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await ixcListar<{ registros?: IxcNamedRecord[] }>(resource, {
          qtype: `${resource}.id`,
          query: id,
          oper: '=',
          page: '1',
          rp: '1',
          sortname: `${resource}.id`,
          sortorder: 'asc',
        });
        const registro = data.registros?.[0];
        if (registro?.id) mapa.set(String(registro.id), registro);
      } catch {
        // ignora falha pontual de lookup
      }
    })
  );

  return mapa;
}

/** Busca OS no IXC por id. */
async function fetchOsRawById(id: string | number): Promise<IxcOssChamado | null> {
  const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
    qtype: `${IXC_RESOURCE}.id`,
    query: String(id),
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${IXC_RESOURCE}.id`,
    sortorder: 'desc',
  });
  return data.registros?.[0] ?? null;
}

async function enrichOsRegistros(registros: IxcOssChamado[]): Promise<IxcOssChamado[]> {
  if (registros.length === 0) return [];

  const [estruturas, tecnicos, assuntos, setores, filiais, cidades] = await Promise.all([
    fetchRegistrosPorIds(IXC_ESTRUTURA_RESOURCE, registros.map((r) => String(r.id_estrutura ?? ''))),
    fetchRegistrosPorIds(IXC_FUNCIONARIOS_RESOURCE, registros.map((r) => String(r.id_tecnico ?? ''))),
    fetchRegistrosPorIds(IXC_ASSUNTO_RESOURCE, registros.map((r) => String(r.id_assunto ?? ''))),
    fetchRegistrosPorIds(IXC_SETOR_RESOURCE, registros.map((r) => String(r.setor ?? ''))),
    fetchRegistrosPorIds(IXC_FILIAL_RESOURCE, registros.map((r) => String(r.id_filial ?? ''))),
    fetchRegistrosPorIds(IXC_CIDADE_RESOURCE, registros.map((r) => String(r.id_cidade ?? ''))),
  ]);

  return registros.map((registro) => {
    const filial = filiais.get(String(registro.id_filial ?? ''));
    const cidade = cidades.get(String(registro.id_cidade ?? ''));
    return {
      ...registro,
      estrutura_nome: estruturas.get(String(registro.id_estrutura ?? ''))?.descricao ?? '',
      tecnico_nome: tecnicos.get(String(registro.id_tecnico ?? ''))?.funcionario ?? '',
      assunto_nome: assuntos.get(String(registro.id_assunto ?? ''))?.assunto ?? '',
      setor_nome: setores.get(String(registro.setor ?? ''))?.setor ?? '',
      filial_nome: filial?.fantasia || filial?.razao || '',
      cidade_nome: cidade?.nome ?? '',
    };
  });
}

export class IxcOssChamadoService {
  static async list(filters: ListOssChamadosFilters = {}): Promise<ListOssChamadosResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const search = filters.search?.trim();
    const sortColumn = filters.sortColumn?.trim() || 'id';
    const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const searchField = filters.searchField?.trim() || 'estrutura_nome';

    try {
      const operadorId = resolveOperadorId();
      if (!operadorId) return paginaVazia(page, limit);

      const osIds = await fetchOsIdsAbertasPeloOperador(operadorId);
      if (osIds.length === 0) return paginaVazia(page, limit);

      const brutos = await Promise.all(osIds.map((id) => fetchOsRawById(id)));
      let registros = brutos.filter(
        (r): r is IxcOssChamado => !!r && Number(r.id_estrutura) > 0
      );

      if (search) {
        const termo = search.toLowerCase();
        if (CAMPOS_ENRIQUECIDOS.includes(searchField)) {
          registros = await enrichOsRegistros(registros);
        }
        const camposBusca = [
          searchField,
          'mensagem',
          'protocolo',
          'mensagem_resposta',
          'endereco',
          'bairro',
          'complemento',
          'referencia',
        ];
        registros = registros.filter((r) =>
          [...new Set(camposBusca)].some((campo) =>
            String(r[campo] ?? '').toLowerCase().includes(termo)
          )
        );
      }

      registros = sortRegistros(registros, sortColumn, sortDirection);

      const total = registros.length;
      const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
      const offset = (page - 1) * limit;
      const pagina = registros.slice(offset, offset + limit);
      const data = await enrichOsRegistros(pagina);

      return {
        data,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          last_page: lastPage,
          from: total > 0 ? offset + 1 : 0,
          to: Math.min(offset + limit, total),
        },
      };
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao listar ordens de serviço no IXC');
    }
  }

  /** Listagem paginada e pesquisável de um recurso auxiliar do IXC (estrutura, funcionarios, etc.). */
  static async listResource(
    resource: string,
    nomeCampo: string,
    filters: ListOssChamadosFilters = {},
    additionalFilters: Record<string, string> = {}
  ): Promise<ListLookupResponse> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const search = filters.search?.trim();
    const hasSearch = !!search;
    const sortDirection = filters.sortDirection === 'desc' ? 'desc' : 'asc';
    const sortColumn = filters.sortColumn === 'id' ? 'id' : nomeCampo;

    const extraFilters = Object.entries(additionalFilters);
    const hasExtraFilters = extraFilters.length > 0;

    const gridBase: Array<{ TB: string; OP: string; P: string }> = [
      { TB: `${resource}.ativo`, OP: '=', P: 'S' },
      ...extraFilters.map(([field, value]) => ({
        TB: `${resource}.${field}`,
        OP: '=',
        P: value,
      })),
    ];

    const [primaryField, primaryValue] = hasExtraFilters
      ? extraFilters[0]
      : ['ativo', 'S'];

    const body: Record<string, string> = {
      qtype: `${resource}.${primaryField}`,
      query: primaryValue,
      oper: '=',
      page: String(page),
      rp: String(limit),
      sortname: `${resource}.${sortColumn}`,
      sortorder: sortDirection,
    };

    if (hasExtraFilters || hasSearch) {
      body.grid_param = JSON.stringify(
        hasSearch
          ? [...gridBase, { TB: `${resource}.${nomeCampo}`, OP: 'L', P: search }]
          : gridBase
      );
    }

    try {
      const response = await createIxcClient().request<{ total?: string; registros?: IxcNamedRecord[] }>({
        method: 'GET',
        url: `/${resource}`,
        headers: { ixcsoft: 'listar' },
        data: body,
      });

      const registros = response.data?.registros ?? [];
      const total = parseInt(response.data?.total ?? '0', 10) || 0;
      const lastPage = Math.max(1, Math.ceil(total / limit) || 1);

      const data: LookupItem[] = registros.map((registro) => ({
        id: String(registro.id),
        nome:
          resource === IXC_FILIAL_RESOURCE
            ? registro.fantasia || registro.razao || ''
            : registro[nomeCampo] ?? '',
      }));

      return {
        data,
        pagination: {
          current_page: page,
          per_page: limit,
          total,
          last_page: lastPage,
          from: total > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, total),
        },
      };
    } catch (error) {
      throw wrapIxcError(error, `Erro ao listar ${resource} no IXC`);
    }
  }

  static async getById(id: string | number): Promise<IxcOssChamado | null> {
    try {
      if (!(await osAbertaPeloOperador(id))) return null;

      const registro = await fetchOsRawById(id);
      if (!registro || Number(registro.id_estrutura) <= 0) return null;

      const [enriquecido] = await enrichOsRegistros([registro]);
      return enriquecido ?? null;
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao buscar ordem de serviço no IXC');
    }
  }

  static async create(payload: OssChamadoInput): Promise<IxcActionResponse> {
    const body = prepareCreateBody(payload);

    try {
      const response = await createIxcClient().post<IxcActionResponse>(`/${IXC_RESOURCE}`, body);
      if (response.data?.type === 'error') {
        throw new Error(actionErrorMessage(response.data, 'Erro ao criar ordem de serviço no IXC'));
      }
      return response.data;
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao criar ordem de serviço no IXC');
    }
  }

  static async update(id: string | number, payload: OssChamadoInput): Promise<IxcActionResponse> {
    if (!(await osAbertaPeloOperador(id))) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const atual = await fetchOsRawById(id);
    if (!atual || Number(atual.id_estrutura) <= 0) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const body: Record<string, string> = {
      ...stripCamposEnriquecidos(atual),
      ...sanitizeInput(payload),
    };

    try {
      const response = await createIxcClient().put<IxcActionResponse>(`/${IXC_RESOURCE}/${id}`, body);
      if (response.data?.type === 'error') {
        throw new Error(actionErrorMessage(response.data, 'Erro ao editar ordem de serviço no IXC'));
      }
      return response.data;
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao editar ordem de serviço no IXC');
    }
  }

  /**
   * Executa ação de workflow da OS no IXC (header ixcsoft) ou registra mensagem.
   * Requer registro completo da OS no body — obtido do IXC antes de mesclar o payload.
   */
  static async executeAcao(
    id: string | number,
    acao: OssChamadoAcao,
    payload: OssChamadoInput = {}
  ): Promise<IxcActionResponse> {
    const abertaPeloOperador = await osAbertaPeloOperador(id);
    if (!abertaPeloOperador) {
      throw new Error('Ordem de serviço não encontrada');
    }

    if (acao === 'registrar_mensagem') {
      return registrarMensagemOs(id, payload);
    }

    const atual = await fetchOsRawById(id);
    if (!atual || Number(atual.id_estrutura) <= 0) {
      throw new Error('Ordem de serviço não encontrada');
    }

    if (acao === 'encaminhar') {
      return executarEncaminharOs(id, payload, atual);
    }

    if (acao === 'agendar') {
      return executarAgendarOs(id, payload, atual);
    }

    if (acao === 'finalizar') {
      return executarFinalizarOs(id, payload, atual);
    }

    const mensagemAcao = String(payload.mensagem ?? '').trim();
    const body = buildActionBody(acao, atual, payload);

    try {
      const response = await createIxcClient().request<IxcActionResponse>({
        method: 'PUT',
        url: `/${IXC_RESOURCE}/${id}`,
        headers: { ixcsoft: acao },
        data: body,
      });

      if (response.data?.type === 'error') {
        throw new Error(actionErrorMessage(response.data, 'Erro ao executar ação no IXC'));
      }

      if (mensagemAcao) {
        await registrarMensagemOs(id, {
          ...payload,
          mensagem: mensagemAcao,
          id_tecnico: payload.id_tecnico ?? atual.id_tecnico,
        });
      }

      return response.data;
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao executar ação no IXC');
    }
  }

  static async delete(id: string | number): Promise<IxcActionResponse> {
    if (!(await osAbertaPeloOperador(id))) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const atual = await fetchOsRawById(id);
    if (!atual || Number(atual.id_estrutura) <= 0) {
      throw new Error('Ordem de serviço não encontrada');
    }

    try {
      const response = await createIxcClient().delete<IxcActionResponse>(`/${IXC_RESOURCE}/${id}`);
      if (response.data?.type === 'error') {
        throw new Error(actionErrorMessage(response.data, 'Erro ao excluir ordem de serviço no IXC'));
      }
      return response.data;
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao excluir ordem de serviço no IXC');
    }
  }
}
