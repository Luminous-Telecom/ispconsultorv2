import { AtendimentoMensagem } from '../../../models/atendimentos/AtendimentoMensagem';
import { AtendimentoLocal } from '../../../models/atendimentos/AtendimentoLocal';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';
import { runWithIxcCredentials } from '../ixcApiContext';
import {
  actionErrorMessage,
  createIxcClient,
  ixcListar,
  resolveOperadorId,
  sanitizeInput,
  wrapIxcError,
  nowIxcDateTime,
} from '../IxcOssChamadoService/ixcHttp';
import {
  IXC_FILIAL_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_ASSUNTO_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_SETOR_RESOURCE,
} from '../IxcOssChamadoService/constants';
import { enrichOssChamadosFromIxc } from '../IxcOssChamadoService/ossEnrich';
import type { IxcOssChamado } from '../IxcOssChamadoService/types';
import { AtendimentoLocalService } from '../../atendimentos/AtendimentoLocalService';
import { AtendimentoArquivoService } from '../../atendimentos/AtendimentoArquivoService';
import { AtendimentoDepartamentoService } from '../../atendimentos/AtendimentoDepartamentoService';
import { AtendimentoTecnicoService } from '../../atendimentos/AtendimentoTecnicoService';
import {
  fetchFuncionariosForDepartamentos,
  resolveDepartamentoIdsForLookup,
} from './atendimentoTecnicoContext';
import { IxcOssChamadoService } from '../IxcOssChamadoService';
import { OrdemServicoLocalService } from '../../ordens/OrdemServicoLocalService';
import { resolveApiOperadorContext } from '../IxcOssChamadoService/ossUsuarioContext';
import {
  ATENDIMENTO_DEFAULTS,
  applyAtendimentoTipoEstrutura,
  applyResponsavelToIxcBody,
  CAMPOS_AUTOGERADOS,
  CAMPOS_ENRIQUECIDOS,
  IXC_ATENDIMENTO_RESOURCE,
  IXC_DEPARTAMENTO_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_OSS_RESOURCE,
  mapErpCampoToIxcQuery,
  normalizeIxcTicketRegistro,
  readResponsavelFromIxcRegistro,
} from './constants';
import { generateAtendimentoProtocolo } from './atendimentoProtocolo';
import { syncResponsavelEDepartamentoNoIxc } from './atendimentoAcoes';
import type {
  AtendimentoInput,
  AtendimentoPagination,
  IxcActionResponse,
  IxcAtendimento,
  IxcAtendimentoArquivo,
  IxcAtendimentoMensagem,
  ListAtendimentosFilters,
  ListAtendimentosResponse,
} from './types';

function parseClienteId(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function emptyPagination(page: number, limit: number): AtendimentoPagination {
  return {
    current_page: page,
    per_page: limit,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  };
}

function buildPagination(page: number, limit: number, total: number): AtendimentoPagination {
  const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
  const offset = (page - 1) * limit;
  return {
    current_page: page,
    per_page: limit,
    total,
    last_page: lastPage,
    from: total > 0 ? offset + 1 : 0,
    to: Math.min(offset + limit, total),
  };
}

async function fetchNomeMap(
  resource: string,
  ids: string[],
  labelFields: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter((id) => id && id !== '0'))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  for (const id of unique) {
    try {
      const response = await createIxcClient().request<{
        type?: string;
        registros?: Array<Record<string, string>>;
      }>({
        method: 'GET',
        url: `/${resource}`,
        headers: { ixcsoft: 'listar' },
        data: {
          qtype: `${resource}.id`,
          query: id,
          oper: '=',
          page: '1',
          rp: '1',
          sortname: `${resource}.id`,
          sortorder: 'asc',
        },
      });
      const registro = response.data?.registros?.[0];
      if (!registro) continue;
      const label =
        labelFields
          .map((field) => String(registro[field] ?? '').trim())
          .find((value) => value && value !== '0') || id;
      map.set(id, label);
    } catch {
      // lookup best-effort
    }
  }

  return map;
}

async function enrichAtendimento(registro: Record<string, string>): Promise<IxcAtendimento> {
  const idFilial = String(registro.id_filial ?? '');
  const idEstrutura = String(registro.id_estrutura ?? '');
  const idAssunto = String(registro.id_assunto ?? '');
  const idDepartamento = String(registro.id_ticket_setor ?? '');
  const idResponsavel = readResponsavelFromIxcRegistro(registro);

  const [filiais, estruturas, assuntos, departamentos, responsaveis] = await Promise.all([
    fetchNomeMap(IXC_FILIAL_RESOURCE, [idFilial], ['fantasia', 'razao']),
    fetchNomeMap(IXC_ESTRUTURA_RESOURCE, [idEstrutura], ['descricao']),
    fetchNomeMap(IXC_ASSUNTO_RESOURCE, [idAssunto], ['assunto']),
    fetchNomeMap(IXC_DEPARTAMENTO_RESOURCE, [idDepartamento], ['setor']),
    fetchNomeMap(IXC_FUNCIONARIOS_RESOURCE, [idResponsavel], ['funcionario']),
  ]);

  return {
    ...registro,
    id: String(registro.id ?? ''),
    filial_nome: filiais.get(idFilial) || '',
    estrutura_nome: estruturas.get(idEstrutura) || '',
    assunto_nome: assuntos.get(idAssunto) || '',
    departamento_nome: departamentos.get(idDepartamento) || '',
    responsavel_nome: responsaveis.get(idResponsavel) || '',
  };
}

async function listRaw(
  resource: string,
  filters: ListAtendimentosFilters,
  fieldFilters: Record<string, string> = {},
  searchFieldDefault = 'titulo',
  gridOrFilters: Array<{ field: string; value: string; group: string }> = []
): Promise<{ registros: Record<string, string>[]; total: number }> {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
  const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
  const sortColumnRaw = (filters.sortColumn || 'id').trim() || 'id';
  const SORTABLE = new Set([
    'id',
    'protocolo',
    'titulo',
    'su_status',
    'status',
    'prioridade',
    'id_ticket_setor',
    'id_responsavel_technico',
    'ultima_atualizacao',
    'data_criacao',
    'id_filial',
    'id_assunto',
  ]);
  const sortColumn = SORTABLE.has(sortColumnRaw) ? sortColumnRaw : 'id';
  const search = filters.search?.trim();
  const searchFieldRaw = (filters.searchField || searchFieldDefault).trim() || searchFieldDefault;
  const SEARCHABLE = new Set([
    'id',
    'protocolo',
    'titulo',
    'menssagem',
    'su_status',
    'status',
    'id_ticket_setor',
    'id_responsavel_technico',
  ]);
  const searchField = SEARCHABLE.has(searchFieldRaw) ? searchFieldRaw : searchFieldDefault;

  const idLookup = String(fieldFilters.id ?? '').trim();
  const primaryField = 'id';
  const primaryValue = idLookup || '0';
  const primaryOper = idLookup ? '=' : '>';

  const sortColumnIxc = mapErpCampoToIxcQuery(sortColumn);
  const searchFieldIxc = mapErpCampoToIxcQuery(searchField);

  const body: Record<string, string> = {
    qtype: `${resource}.${primaryField}`,
    query: primaryValue,
    oper: primaryOper,
    page: String(page),
    rp: String(limit),
    sortname: `${resource}.${sortColumnIxc}`,
    sortorder: sortDirection,
  };

  const gridFilters: Array<Record<string, string>> = [];
  for (const [field, value] of Object.entries(fieldFilters)) {
    if (field === 'id') continue;
    gridFilters.push({
      TB: `${resource}.${field}`,
      OP: '=',
      P: value,
      C: 'AND',
      G: field,
    });
  }
  for (const item of gridOrFilters) {
    gridFilters.push({
      TB: `${resource}.${item.field}`,
      OP: '=',
      P: item.value,
      C: 'OR',
      G: item.group,
    });
  }
  if (search) {
    gridFilters.push({
      TB: `${resource}.${searchFieldIxc}`,
      OP: 'L',
      P: search,
      C: 'AND',
      G: 'search',
    });
  }
  if (gridFilters.length > 0) {
    body.grid_param = JSON.stringify(gridFilters);
  }

  const response = await createIxcClient().request<{
    type?: string;
    message?: string;
    mensagem?: string;
    total?: string;
    registros?: Record<string, string>[];
  }>({
    method: 'GET',
    url: `/${resource}`,
    headers: { ixcsoft: 'listar' },
    data: body,
  });

  if (typeof response.data === 'string') {
    throw new Error(
      'IXC recusou a listagem de atendimentos (filtro/ordenação inválidos ou sem permissão Listar/Dados no formulário Atendimentos).'
    );
  }

  if (response.data?.type === 'error') {
    throw new Error(
      actionErrorMessage(response.data as IxcActionResponse, `Erro ao listar ${resource} no IXC`)
    );
  }

  return {
    registros: response.data?.registros ?? [],
    total: parseInt(response.data?.total ?? '0', 10) || 0,
  };
}

async function resolveTicketDepartamentoIdsDoOperador(): Promise<string[]> {
  const { setorIds } = await resolveApiOperadorContext();
  if (setorIds.length === 0) return [];

  const deptoIds = new Set<string>();
  for (const setorId of setorIds) {
    try {
      const data = await ixcListar<{ registros?: Array<Record<string, string>> }>(
        IXC_SETOR_RESOURCE,
        {
          qtype: `${IXC_SETOR_RESOURCE}.id`,
          query: setorId,
          oper: '=',
          page: '1',
          rp: '1',
          sortname: `${IXC_SETOR_RESOURCE}.id`,
          sortorder: 'asc',
        }
      );
      const idDepto = String(data.registros?.[0]?.id_depto ?? '').trim();
      if (idDepto && idDepto !== '0') deptoIds.add(idDepto);
    } catch {
      // best-effort
    }
  }
  return [...deptoIds];
}

function buildDepartamentoGridOrFilters(
  deptoIds: string[]
): Array<{ field: string; value: string; group: string }> {
  return deptoIds.map((deptoId) => ({
    field: 'id_ticket_setor',
    value: deptoId,
    group: 'id_ticket_setor',
  }));
}

async function fetchTicketRegistroById(id: string | number): Promise<Record<string, string> | null> {
  const idStr = String(id).trim();
  if (!idStr) return null;

  const { registros: direto } = await listRaw(
    IXC_ATENDIMENTO_RESOURCE,
    { page: 1, limit: 1 },
    { id: idStr }
  );
  if (direto[0] && String(direto[0].id) === idStr) {
    return normalizeIxcTicketRegistro(direto[0]);
  }

  const deptoIds = await resolveTicketDepartamentoIdsDoOperador();
  if (deptoIds.length === 0) return null;

  const { registros } = await listRaw(
    IXC_ATENDIMENTO_RESOURCE,
    { page: 1, limit: 500 },
    {},
    'titulo',
    buildDepartamentoGridOrFilters(deptoIds)
  );

  const found = registros.find((registro) => String(registro.id) === idStr);
  return found ? normalizeIxcTicketRegistro(found) : null;
}

function buildTicketRegistroFromLocal(record: AtendimentoLocal): Record<string, string> {
  return {
    id: String(record.ixc_id ?? record.id),
    protocolo: String(record.protocolo ?? ''),
    id_filial: String(record.id_filial ?? ''),
    id_estrutura: String(record.id_estrutura ?? '0'),
    id_assunto: String(record.id_assunto ?? ''),
    id_ticket_setor: String(record.id_ticket_setor ?? ''),
    id_responsavel_technico: String(record.id_responsavel_technico ?? ''),
    titulo: String(record.titulo ?? ''),
    menssagem: String(record.menssagem ?? ''),
    prioridade: String(record.prioridade ?? 'N'),
    melhor_horario_reserve: String(record.melhor_horario_reserve ?? 'Q'),
    su_status: String(record.su_status ?? 'N'),
    tipo: String(record.tipo ?? 'E'),
    data_reservada: String(record.data_reservada ?? ''),
    ultima_atualizacao: String(record.ultima_atualizacao ?? ''),
    data_criacao: String(record.data_criacao ?? ''),
  };
}

async function resolveTicketRegistroForSync(
  ixcId: string,
  record: AtendimentoLocal | null
): Promise<Record<string, string> | null> {
  const ticket = await fetchTicketRegistroById(ixcId);
  if (ticket) return ticket;
  if (record?.ixc_id?.trim()) return buildTicketRegistroFromLocal(record);
  return null;
}

function stripAtendimentoCamposEnriquecidos(registro: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(registro)) {
    if (CAMPOS_ENRIQUECIDOS.includes(key)) continue;
    result[key] = String(value ?? '');
  }
  return result;
}

export type {
  AtendimentoInput,
  IxcAtendimento,
  IxcAtendimentoArquivo,
  IxcAtendimentoMensagem,
  ListAtendimentosFilters,
  ListAtendimentosResponse,
};

export class IxcAtendimentoService {
  private static async requireAtendimentoRecord(
    id: string | number,
    empresaId: number | null = null
  ) {
    const record = await AtendimentoLocalService.findRecord(id, empresaId);
    if (!record) throw new Error('Atendimento não encontrado');
    return record;
  }

  private static async buildIxcCreateBody(
    payload: AtendimentoInput,
    _clienteId: number
  ): Promise<Record<string, string>> {
    const body: Record<string, string> = {
      ...ATENDIMENTO_DEFAULTS,
      ...sanitizeInput(payload),
    };
    delete body.id;
    delete body.cliente_id;
    for (const campo of CAMPOS_AUTOGERADOS) {
      delete body[campo];
    }
    for (const campo of CAMPOS_ENRIQUECIDOS) {
      delete body[campo];
    }

    applyAtendimentoTipoEstrutura(body);

    applyResponsavelToIxcBody(body, payload.id_responsavel_technico);

    const operadorId = resolveOperadorId();
    if (operadorId) {
      body.id_operador = operadorId;
    }

    body.protocolo = generateAtendimentoProtocolo();
    return body;
  }

  private static async validateResponsavelParaDepartamento(payload: AtendimentoInput): Promise<void> {
    const departamentoId = String(payload.id_ticket_setor ?? '').trim();
    const responsavelId = String(payload.id_responsavel_technico ?? '').trim();
    if (!departamentoId || departamentoId === '0' || !responsavelId || responsavelId === '0') {
      return;
    }

    const itens = await fetchFuncionariosForDepartamentos('funcionario', [departamentoId]);
    if (itens.length === 0) {
      throw new Error(
        'Nenhum colaborador vinculado a este departamento de atendimento no IXC. Escolha outro departamento ou ajuste os vínculos no IXC.'
      );
    }

    const valido = itens.some((item) => String(item.id) === responsavelId);
    if (!valido) {
      throw new Error(
        'O colaborador selecionado não está vinculado ao departamento de atendimento no IXC. Escolha um colaborador da lista do departamento.'
      );
    }
  }

  static async list(
    filters: ListAtendimentosFilters = {},
    empresaId: number | null = null
  ): Promise<ListAtendimentosResponse> {
    return AtendimentoLocalService.list(filters, empresaId);
  }

  static async getById(
    id: string | number,
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<IxcAtendimento | null> {
    const local = await AtendimentoLocalService.getAtendimento(id, empresaId);
    if (local) return local;

    try {
      return await runWithIxcCredentials(
        empresaId,
        async () => {
          const registro = await fetchTicketRegistroById(id);
          if (!registro) return null;
          const enriched = await enrichAtendimento(registro);
          return {
            ...enriched,
            cliente_id: clienteId ?? enriched.cliente_id,
          };
        },
        clienteId
      );
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao buscar atendimento');
    }
  }

  static async create(
    payload: AtendimentoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);
    if (!clienteId) {
      throw new Error('Selecione o cliente');
    }

    const integracao = await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(
      clienteId,
      empresaId
    );
    const hasIxc = integracao != null;
    const record = await AtendimentoLocalService.createRecord(payload, empresaId, usuarioId);

    if (!hasIxc) {
      return {
        type: 'success',
        id: String(record.id),
        protocolo: record.protocolo,
      };
    }

    return runWithIxcCredentials(
      empresaId,
      async () => {
        await IxcAtendimentoService.validateResponsavelParaDepartamento(payload);
        const body = await IxcAtendimentoService.buildIxcCreateBody(payload, clienteId);

        try {
          const response = await createIxcClient().request<IxcActionResponse>({
            method: 'POST',
            url: `/${IXC_ATENDIMENTO_RESOURCE}`,
            headers: { ixcsoft: 'incluir' },
            data: body,
          });
          if (response.data?.type === 'error') {
            await AtendimentoLocalService.destroyRecord(record);
            throw new Error(actionErrorMessage(response.data, 'Erro ao criar atendimento no IXC'));
          }

          const ixcId = response.data?.id;
          if (!ixcId) {
            await AtendimentoLocalService.destroyRecord(record);
            throw new Error('IXC não retornou o ID do atendimento criado');
          }

          const protocoloAtualiza = (response.data?.atualiza_campos || []).find(
            (item) => item.campo === 'protocolo'
          );
          const protocolo =
            String(protocoloAtualiza?.valor ?? response.data?.protocolo ?? body.protocolo ?? '').trim() ||
            body.protocolo;

          await AtendimentoLocalService.linkToIxc(record, ixcId, {
            protocolo,
            su_status: String(body.su_status ?? 'N'),
          });

          const ticketAtualizado =
            (await resolveTicketRegistroForSync(ixcId, record)) ??
            (await fetchTicketRegistroById(ixcId)) ??
            buildTicketRegistroFromLocal(record);
          await AtendimentoLocalService.syncFromIxcTicket(
            ixcId,
            ticketAtualizado,
            empresaId,
            payload
          );

          return {
            type: 'success',
            id: String(record.id),
            ixc_id: String(ixcId),
            protocolo,
          };
        } catch (error) {
          await AtendimentoLocalService.destroyRecord(record);
          throw wrapIxcError(error, 'Erro ao criar atendimento no IXC');
        }
      },
      clienteId
    );
  }

  static async update(
    id: string | number,
    payload: AtendimentoInput,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    if (await AtendimentoLocalService.isAtendimentoLocal(id, empresaId)) {
      const result = await AtendimentoLocalService.update(id, payload, empresaId);
      return result;
    }

    const clienteId = parseClienteId(payload.cliente_id);
    const record = await AtendimentoLocalService.findRecord(id, empresaId);
    const ixcId = record?.ixc_id?.trim() || String(id).trim();

    if (record) {
      await AtendimentoLocalService.update(id, payload, empresaId);
    }

    return runWithIxcCredentials(
      empresaId,
      async () => {
        await IxcAtendimentoService.validateResponsavelParaDepartamento(payload);
        let atual = await fetchTicketRegistroById(ixcId);
        const atualVeioDoIxc = Boolean(atual);
        if (!atual && record) {
          atual = buildTicketRegistroFromLocal(record);
        }
        if (!atual) {
          throw new Error('Atendimento não encontrado');
        }

        const body: Record<string, string> = {
          ...ATENDIMENTO_DEFAULTS,
          ...stripAtendimentoCamposEnriquecidos(atual),
          ...sanitizeInput(payload),
        };
        delete body.id;
        delete body.cliente_id;
        for (const campo of CAMPOS_ENRIQUECIDOS) {
          delete body[campo];
        }

        applyAtendimentoTipoEstrutura(body);

        applyResponsavelToIxcBody(body, payload.id_responsavel_technico);

        try {
          const response = await createIxcClient().request<IxcActionResponse>({
            method: 'PUT',
            url: `/${IXC_ATENDIMENTO_RESOURCE}/${ixcId}`,
            headers: { ixcsoft: 'alterar' },
            data: body,
          });
          if (response.data?.type === 'error') {
            throw new Error(
              actionErrorMessage(response.data, 'Erro ao atualizar atendimento no IXC')
            );
          }

          await syncResponsavelEDepartamentoNoIxc(ixcId, atual, payload, body, {
            atualVeioDoIxc,
          });

          const ticketPosSync =
            (await resolveTicketRegistroForSync(ixcId, record ?? null)) ?? atual;
          await AtendimentoLocalService.syncFromIxcTicket(ixcId, ticketPosSync, empresaId, payload);

          return { type: 'success', id: String(record?.id ?? ixcId), ixc_id: ixcId };
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao atualizar atendimento no IXC');
        }
      },
      clienteId
    );
  }

  static async delete(
    id: string | number,
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<void> {
    if (await AtendimentoLocalService.isAtendimentoLocal(id, empresaId)) {
      await AtendimentoLocalService.delete(id, empresaId);
      return;
    }

    const record = await AtendimentoLocalService.findRecord(id, empresaId);
    const ixcId = record?.ixc_id?.trim() || String(id).trim();

    await runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const response = await createIxcClient().delete<IxcActionResponse>(
            `/${IXC_ATENDIMENTO_RESOURCE}/${ixcId}`
          );
          if (response.data?.type === 'error') {
            throw new Error(actionErrorMessage(response.data, 'Erro ao excluir atendimento no IXC'));
          }
          if (record) {
            await AtendimentoLocalService.destroyRecord(record);
          }
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao excluir atendimento no IXC');
        }
      },
      clienteId
    );
  }

  static async listMensagens(
    atendimentoId: string | number,
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<IxcAtendimentoMensagem[]> {
    const record = await AtendimentoLocalService.findRecord(atendimentoId, empresaId);
    if (record && !record.ixc_id?.trim()) {
      return AtendimentoLocalService.listMensagensLocais(atendimentoId, empresaId);
    }

    const ticketId = AtendimentoLocalService.resolveIxcTicketId(record, atendimentoId);

    return runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const { registros } = await listRaw(
            IXC_MENSAGEM_RESOURCE,
            { page: 1, limit: 200, sortColumn: 'data', sortDirection: 'desc' },
            { id_ticket: ticketId },
            'mensagem'
          );
          return registros.map((r) => ({
            id: String(r.id ?? ''),
            id_ticket: String(r.id_ticket ?? ticketId),
            mensagem: String(r.mensagem ?? ''),
            data: String(r.data ?? ''),
            operador: String(r.operador ?? ''),
            su_status: String(r.su_status ?? ''),
            visibilidade_mensagens: String(r.visibilidade_mensagens ?? ''),
            ultima_atualizacao: String(r.ultima_atualizacao ?? ''),
          }));
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao listar mensagens do atendimento');
        }
      },
      clienteId
    );
  }

  static async createMensagem(
    atendimentoId: string | number,
    mensagem: string,
    empresaId: number | null = null,
    clienteId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const texto = mensagem.trim();
    if (!texto) {
      throw new Error('Informe a mensagem');
    }

    const record = await AtendimentoLocalService.findRecord(atendimentoId, empresaId);
    if (record && !record.ixc_id?.trim()) {
      const agora = nowIxcDateTime();
      const created = await AtendimentoMensagem.create({
        empresa_id: empresaId,
        atendimento_id: record.id,
        mensagem: texto,
        data: agora,
        usuario_id: usuarioId,
        visibilidade_mensagens: 'E',
      });
      return { type: 'success', id: String(created.id) };
    }

    const ticketId = AtendimentoLocalService.resolveIxcTicketId(record, atendimentoId);

    return runWithIxcCredentials(
      empresaId,
      async () => {
        const operadorId = resolveOperadorId();
        const body: Record<string, string> = {
          id_ticket: ticketId,
          mensagem: texto,
          visibilidade_mensagens: 'PU',
        };
        if (operadorId) {
          body.operador = operadorId;
        }

        const retryDelaysMs = [0, 500, 1000, 2000];
        let lastError: unknown = null;

        for (const delayMs of retryDelaysMs) {
          if (delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          try {
            const response = await createIxcClient().request<IxcActionResponse>({
              method: 'POST',
              url: `/${IXC_MENSAGEM_RESOURCE}`,
              headers: { ixcsoft: 'incluir' },
              data: body,
            });
            if (response.data?.type === 'error') {
              throw new Error(actionErrorMessage(response.data, 'Erro ao registrar mensagem no IXC'));
            }
            return { type: 'success', id: response.data?.id };
          } catch (error) {
            lastError = error;
            const msg = error instanceof Error ? error.message : String(error);
            const isTransient =
              msg.includes('Contate o suporte IXC Soft') ||
              msg.includes('Ocorreu um erro ao processar');
            if (!isTransient || delayMs === retryDelaysMs[retryDelaysMs.length - 1]) {
              break;
            }
          }
        }

        throw wrapIxcError(lastError, 'Erro ao registrar mensagem no IXC');
      },
      clienteId
    );
  }

  static async deleteMensagem(
    atendimentoId: string | number,
    mensagemId: string | number,
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<void> {
    const record = await AtendimentoLocalService.findRecord(atendimentoId, empresaId);
    if (!record) {
      throw new Error('Atendimento não encontrado');
    }

    if (!record.ixc_id?.trim()) {
      const mensagemLocal = await AtendimentoMensagem.findOne({
        where: {
          id: Number(mensagemId),
          atendimento_id: record.id,
        },
      });
      if (!mensagemLocal) {
        throw new Error('Mensagem não encontrada');
      }
      await mensagemLocal.destroy();
      return;
    }

    const ixcMensagemId = String(mensagemId).trim();

    await runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const response = await createIxcClient().delete<IxcActionResponse>(
            `/${IXC_MENSAGEM_RESOURCE}/${ixcMensagemId}`
          );
          if (response.data?.type === 'error') {
            throw new Error(actionErrorMessage(response.data, 'Erro ao excluir mensagem no IXC'));
          }
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao excluir mensagem no IXC');
        }
      },
      clienteId ?? record.cliente_id
    );
  }

  static async listArquivos(
    atendimentoId: string | number,
    empresaId: number | null = null,
    _clienteId: number | null = null
  ): Promise<IxcAtendimentoArquivo[]> {
    const record = await AtendimentoLocalService.findRecord(atendimentoId, empresaId);
    if (!record) return [];
    return AtendimentoArquivoService.list(String(record.id));
  }

  static async createArquivo(
    atendimentoId: string | number,
    descricao: string,
    buffer: Buffer,
    nomeOriginal: string,
    mimeType: string | undefined,
    empresaId: number | null = null
  ): Promise<IxcAtendimentoArquivo> {
    const record = await IxcAtendimentoService.requireAtendimentoRecord(atendimentoId, empresaId);
    const localAtendimentoId = String(record.id);

    const arquivo = {
      buffer,
      originalname: nomeOriginal,
      mimetype: mimeType ?? 'application/octet-stream',
      size: buffer.length,
    } as Express.Multer.File;

    const created = await AtendimentoArquivoService.create({
      atendimento_id: localAtendimentoId,
      empresa_id: empresaId,
      nome: nomeOriginal,
      descricao: descricao.trim() || nomeOriginal,
      arquivo,
      mime_type: mimeType,
    });

    return {
      id: created.id,
      id_ticket: record.ixc_id ?? undefined,
      descricao: created.descricao,
      nome: created.nome,
    };
  }

  static async deleteArquivo(
    atendimentoId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null
  ): Promise<void> {
    const record = await IxcAtendimentoService.requireAtendimentoRecord(atendimentoId, empresaId);
    await AtendimentoArquivoService.delete(Number(arquivoId), String(record.id));
  }

  static async downloadArquivo(
    atendimentoId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null
  ): Promise<{ buffer: Buffer; nome: string; mimeType: string }> {
    const record = await IxcAtendimentoService.requireAtendimentoRecord(atendimentoId, empresaId);
    return AtendimentoArquivoService.getFileContent(Number(arquivoId), String(record.id));
  }

  static async listOrdensServico(
    atendimentoId: string | number,
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<IxcOssChamado[]> {
    const record = await AtendimentoLocalService.findRecord(atendimentoId, empresaId);

    // Fonte primária: espelho local (`ordens_servico.atendimento_id`) — cobre OS
    // locais (sem IXC) e OS já sincronizadas, independente de round-trip ao IXC.
    const locais = record
      ? await OrdemServicoLocalService.listByAtendimentoId(record.id, empresaId)
      : [];

    const ticketId = record?.ixc_id?.trim();
    if (!ticketId) {
      return locais;
    }

    const remotas = await runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const { registros } = await listRaw(
            IXC_OSS_RESOURCE,
            { page: 1, limit: 100, sortColumn: 'id', sortDirection: 'desc' },
            { id_ticket: ticketId },
            'protocolo'
          );
          return enrichOssChamadosFromIxc(registros, empresaId);
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao listar ordens de serviço do atendimento');
        }
      },
      clienteId
    );

    // Mescla por ixc_id (dados do IXC prevalecem, mais atualizados) e mantém
    // OS locais ainda não sincronizadas (sem ixc_id).
    const semVinculoIxc = locais.filter((item) => !item.ixc_id?.trim());
    const porIxcId = new Map<string, IxcOssChamado>();
    for (const item of locais) {
      const key = item.ixc_id?.trim();
      if (key) porIxcId.set(key, item);
    }
    for (const item of remotas) {
      const key = String(item.id ?? '').trim();
      if (key) porIxcId.set(key, item);
    }

    return [...semVinculoIxc, ...porIxcId.values()];
  }

  static async listDepartamentos(
    filters: ListAtendimentosFilters = {},
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<{ data: Array<{ id: string; nome: string }>; pagination: AtendimentoPagination }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;

    const integracao =
      clienteId != null
        ? await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(clienteId, empresaId)
        : null;

    if (integracao) {
      const cachedTotal = await AtendimentoDepartamentoService.countForIntegracao(
        integracao.id,
        empresaId
      );
      if (cachedTotal > 0) {
        return AtendimentoDepartamentoService.listPaginated(integracao.id, empresaId, filters);
      }
    }

    return runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const { registros, total } = await listRaw(
            IXC_DEPARTAMENTO_RESOURCE,
            filters,
            { ativo: 'S' },
            'setor'
          );
          const data = registros.map((r) => ({
            id: String(r.id ?? ''),
            nome: String(r.setor ?? ''),
          }));

          if (integracao && data.length > 0) {
            await AtendimentoDepartamentoService.syncIxcItens(empresaId, integracao.id, data);
          }

          return {
            data,
            pagination: buildPagination(page, limit, total),
          };
        } catch {
          return { data: [], pagination: emptyPagination(page, limit) };
        }
      },
      clienteId
    );
  }

  static async listTecnicos(
    filters: ListAtendimentosFilters = {},
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<{ data: Array<{ id: string; nome: string }>; pagination: AtendimentoPagination }> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const departamentoFiltro = String(filters.id_ticket_setor ?? '').trim();
    const hasDepartamentoFiltro = Boolean(departamentoFiltro && departamentoFiltro !== '0');

    const integracao =
      clienteId != null
        ? await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(clienteId, empresaId)
        : null;

    if (integracao && !hasDepartamentoFiltro) {
      const cachedTotal = await AtendimentoTecnicoService.countForIntegracao(
        integracao.id,
        empresaId
      );
      if (cachedTotal > 0) {
        return AtendimentoTecnicoService.listPaginated(integracao.id, empresaId, filters);
      }
    }

    return runWithIxcCredentials(
      empresaId,
      async () => {
        try {
          const departamentoIds = await resolveDepartamentoIdsForLookup(
            hasDepartamentoFiltro ? departamentoFiltro : undefined
          );
          const itens = await fetchFuncionariosForDepartamentos('funcionario', departamentoIds);

          const search = filters.search?.trim().toLowerCase();
          const filtered = search
            ? itens.filter((item) => item.nome.toLowerCase().includes(search))
            : itens;

          if (integracao && filtered.length > 0) {
            await AtendimentoTecnicoService.syncIxcItens(empresaId, integracao.id, filtered);
          }

          const offset = (page - 1) * limit;
          return {
            data: filtered.slice(offset, offset + limit),
            pagination: buildPagination(page, limit, filtered.length),
          };
        } catch {
          return { data: [], pagination: emptyPagination(page, limit) };
        }
      },
      clienteId
    );
  }
}
