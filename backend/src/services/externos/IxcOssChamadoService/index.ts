import { runWithIxcCredentials } from '../ixcApiContext';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';
import { OrdemServicoCadastroService } from '../../ordens/OrdemServicoCadastroService';
import { CAMPOS_ENRIQUECIDOS, IXC_EVENTO_ABERTURA, IXC_FILIAL_RESOURCE, IXC_RESOURCE, OSS_CHAMADO_ACOES } from './constants';
import {
  actionErrorMessage,
  createIxcClient,
  resolveOperadorId,
  sanitizeInput,
  wrapIxcError,
} from './ixcHttp';
import {
  executarAgendarOs,
  executarEncaminharOs,
  executarFinalizarOs,
  registrarMensagemOs,
  deleteMensagemOs,
} from './ossAcoes';
import { OrdemServicoArquivoService, type OrdemServicoArquivoItem } from '../../ordens/OrdemServicoArquivoService';
import {
  OrdemServicoLocalService,
  fetchUsuarioNomeById,
} from '../../ordens/OrdemServicoLocalService';
import {
  mapMensagensIxcOperadorBacknet,
  prefixarMensagemOperador,
} from '../../ordens/ordemServicoMensagemFormat';
import {
  enrichOsRegistros,
  fetchMensagensOs,
  fetchOsIdsAbertasPeloOperador,
  fetchOsRawById,
  osAbertaPeloOperador,
  sortRegistros,
} from './ossData';
import {
  applyBacknetCliente,
  buildActionBody,
  fetchProximoProtocolo,
  parseClienteId,
  prepareCreateBody,
  stripCamposEnriquecidos,
} from './ossPayload';
import type {
  IxcActionResponse,
  IxcNamedRecord,
  IxcOssChamado,
  IxcOssMensagem,
  ListLookupResponse,
  ListOssChamadosFilters,
  ListOssChamadosResponse,
  LookupItem,
  OssChamadoAcao,
  OssChamadoInput,
} from './types';

export type {
  IxcOssChamado,
  IxcOssMensagem,
  ListOssChamadosFilters,
  ListOssChamadosResponse,
  ListLookupResponse,
  LookupItem,
  OssChamadoAcao,
  OssChamadoInput,
};
export { OSS_CHAMADO_ACOES };

export class IxcOssChamadoService {
  private static paginateRegistros(
    registros: IxcOssChamado[],
    filters: ListOssChamadosFilters
  ): ListOssChamadosResponse {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const total = registros.length;
    const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
    const offset = (page - 1) * limit;
    const pagina = registros.slice(offset, offset + limit);

    return {
      data: pagina,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: lastPage,
        from: total > 0 ? offset + 1 : 0,
        to: Math.min(offset + limit, total),
      },
    };
  }

  private static async listIxcRegistros(
    filters: ListOssChamadosFilters
  ): Promise<IxcOssChamado[]> {
    const search = filters.search?.trim();
    const sortColumn = filters.sortColumn?.trim() || 'id';
    const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const searchField = filters.searchField?.trim() || 'cliente_nome';

    const operadorId = resolveOperadorId();
    if (!operadorId) return [];

    const osIds = await fetchOsIdsAbertasPeloOperador(operadorId);
    if (osIds.length === 0) return [];

    const brutos = await Promise.all(osIds.map((id) => fetchOsRawById(id)));
    let registros = brutos.filter(
      (r): r is IxcOssChamado => !!r && Number(r.id_estrutura) > 0
    );

    if (search) {
      const termo = search.toLowerCase();
      if (CAMPOS_ENRIQUECIDOS.includes(searchField)) {
        registros = await enrichOsRegistros(registros);
      }
      registros = registros.filter((r) =>
        [searchField, 'mensagem', 'protocolo'].some((campo) =>
          String(r[campo] ?? '').toLowerCase().includes(termo)
        )
      );
    }

    registros = sortRegistros(registros, sortColumn, sortDirection);
    return enrichOsRegistros(registros);
  }

  private static async assertOsAcessivel(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<void> {
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);
    if (record) {
      if (
        record.ixc_id?.trim() &&
        usuarioId != null &&
        !(await OrdemServicoLocalService.wasOpenedByUsuario(id, usuarioId, empresaId))
      ) {
        throw new Error('Ordem de serviço não encontrada');
      }
      return;
    }

    if (!(await osAbertaPeloOperador(id))) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const registro = await fetchOsRawById(id);
    if (!registro || Number(registro.id_estrutura) <= 0) {
      throw new Error('Ordem de serviço não encontrada');
    }
  }

  private static async resolveOsId(
    id: string | number,
    empresaId: number | null = null
  ): Promise<string> {
    const chamado = await OrdemServicoLocalService.getChamado(id, empresaId);
    return chamado ? String(chamado.id) : String(id);
  }

  private static async fetchMensagensIxc(
    ixcId: string | number,
    empresaId: number | null
  ): Promise<IxcOssMensagem[]> {
    return runWithIxcCredentials(empresaId, async () => {
      const registro = await fetchOsRawById(ixcId);
      if (!registro || Number(registro.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada no IXC');
      }

      const mensagens = await fetchMensagensOs(ixcId);
      const operadorAbertura = await OrdemServicoLocalService.getOperadorAbertura(ixcId, empresaId);
      return mapMensagensIxcOperadorBacknet(mensagens, operadorAbertura);
    });
  }

  private static async syncMirrorFromIxc(
    id: string | number,
    empresaId: number | null,
    payload: OssChamadoInput = {}
  ): Promise<void> {
    const atualizado = await fetchOsRawById(id);
    if (atualizado) {
      await OrdemServicoLocalService.syncFromIxcOs(id, atualizado, payload, empresaId);
    }
  }

  private static async payloadComOperadorBacknet(
    payload: OssChamadoInput,
    usuarioId: number | null
  ): Promise<OssChamadoInput> {
    const operadorNome = await fetchUsuarioNomeById(usuarioId);
    if (!operadorNome) return payload;

    const next: OssChamadoInput = { ...payload };
    const mensagem = prefixarMensagemOperador(operadorNome, payload.mensagem);
    if (mensagem) next.mensagem = mensagem;

    const resposta = prefixarMensagemOperador(operadorNome, payload.mensagem_resposta);
    if (resposta) next.mensagem_resposta = resposta;

    return next;
  }

  static async list(
    filters: ListOssChamadosFilters = {},
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<ListOssChamadosResponse> {
    const localResult = await OrdemServicoLocalService.list(
      { ...filters, page: 1, limit: 100_000 },
      empresaId
    );

    let ixcRegistros: IxcOssChamado[] = [];
    if (usuarioId != null) {
      const vinculadas = await OrdemServicoLocalService.listIxcVinculadas(filters, empresaId, usuarioId);
      try {
        ixcRegistros = await runWithIxcCredentials(empresaId, () => enrichOsRegistros(vinculadas));
      } catch {
        ixcRegistros = vinculadas;
      }
    } else {
      try {
        ixcRegistros = await runWithIxcCredentials(empresaId, () =>
          IxcOssChamadoService.listIxcRegistros(filters)
        );
      } catch {
        ixcRegistros = [];
      }
    }

    const sortColumn = filters.sortColumn?.trim() || 'id';
    const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
    const merged = sortRegistros([...ixcRegistros, ...localResult.data], sortColumn, sortDirection);

    return IxcOssChamadoService.paginateRegistros(merged, filters);
  }

  private static paginateLookup(
    data: LookupItem[],
    filters: ListOssChamadosFilters
  ): ListLookupResponse {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
    const total = data.length;
    const lastPage = Math.max(1, Math.ceil(total / limit) || 1);
    const offset = (page - 1) * limit;
    const pagina = data.slice(offset, offset + limit);

    return {
      data: pagina,
      pagination: {
        current_page: page,
        per_page: limit,
        total,
        last_page: lastPage,
        from: total > 0 ? offset + 1 : 0,
        to: Math.min(offset + limit, total),
      },
    };
  }

  static async listCadastroLookup(
    resource: string,
    nomeCampo: string,
    filters: ListOssChamadosFilters = {},
    additionalFilters: Record<string, string> = {},
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<ListLookupResponse> {
    const tipo = OrdemServicoCadastroService.resolveTipoByIxcResource(resource);
    const integracao =
      clienteId != null
        ? await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(clienteId, empresaId)
        : null;

    if (!integracao && tipo) {
      const locais = await OrdemServicoCadastroService.listLocais(tipo, empresaId, filters.search);
      return IxcOssChamadoService.paginateLookup(locais, filters);
    }

    const result = await IxcOssChamadoService.listResource(
      resource,
      nomeCampo,
      filters,
      additionalFilters,
      empresaId,
      clienteId
    );

    if (!tipo) return result;

    const locais = await OrdemServicoCadastroService.listLocais(tipo, empresaId, filters.search);
    const ixcIds = new Set(result.data.map((item) => String(item.id)));
    const locaisFiltrados = locais.filter((item) => !ixcIds.has(String(item.id)));

    return {
      ...result,
      data: [...result.data, ...locaisFiltrados],
    };
  }

  private static mapLookupRegistros(
    resource: string,
    nomeCampo: string,
    registros: IxcNamedRecord[]
  ): LookupItem[] {
    return registros.map((registro) => ({
      id: String(registro.id),
      nome:
        resource === IXC_FILIAL_RESOURCE
          ? registro.fantasia || registro.razao || ''
          : registro[nomeCampo] ?? '',
    }));
  }

  static async listResourceRaw(
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

    const [primaryField, primaryValue] = hasExtraFilters ? extraFilters[0] : ['ativo', 'S'];

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
      const data = IxcOssChamadoService.mapLookupRegistros(resource, nomeCampo, registros);

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

  static async fetchAllLookupResource(
    resource: string,
    nomeCampo: string,
    additionalFilters: Record<string, string> = {}
  ): Promise<LookupItem[]> {
    const limit = 500;
    let page = 1;
    let lastPage = 1;
    const all: LookupItem[] = [];

    while (page <= lastPage) {
      const result = await IxcOssChamadoService.listResourceRaw(
        resource,
        nomeCampo,
        { page, limit, sortColumn: 'id', sortDirection: 'asc' },
        additionalFilters
      );
      all.push(...result.data);
      lastPage = result.pagination.last_page;
      page += 1;
    }

    return all;
  }

  static async listResource(
    resource: string,
    nomeCampo: string,
    filters: ListOssChamadosFilters = {},
    additionalFilters: Record<string, string> = {},
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<ListLookupResponse> {
    return runWithIxcCredentials(
      empresaId,
      () => IxcOssChamadoService.listResourceRaw(resource, nomeCampo, filters, additionalFilters),
      clienteId
    );
  }

  static async getById(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcOssChamado | null> {
    const local = await OrdemServicoLocalService.getChamado(id, empresaId);
    if (local) {
      if (
        local.ixc_id &&
        usuarioId != null &&
        !(await OrdemServicoLocalService.wasOpenedByUsuario(id, usuarioId, empresaId))
      ) {
        return null;
      }
      return local;
    }

    return runWithIxcCredentials(empresaId, async () => {
      try {
        await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);

        const registro = await fetchOsRawById(id);
        if (!registro || Number(registro.id_estrutura) <= 0) return null;

        const [enriquecido] = await enrichOsRegistros([registro]);
        return enriquecido ?? null;
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao buscar ordem de serviço no IXC');
      }
    });
  }

  static async listMensagens(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcOssMensagem[]> {
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);

    if (record && !record.ixc_id?.trim()) {
      return OrdemServicoLocalService.listMensagens(record.id, empresaId);
    }

    if (record?.ixc_id) {
      await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);
      try {
        return await IxcOssChamadoService.fetchMensagensIxc(record.ixc_id, empresaId);
      } catch {
        return OrdemServicoLocalService.listMensagens(record.id, empresaId);
      }
    }

    await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);
    try {
      return await IxcOssChamadoService.fetchMensagensIxc(id, empresaId);
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao listar mensagens da ordem de serviço no IXC');
    }
  }

  static async deleteMensagem(
    ordemId: string | number,
    mensagemId: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    if (await OrdemServicoLocalService.exists(ordemId, empresaId)) {
      return OrdemServicoLocalService.deleteMensagem(ordemId, mensagemId, empresaId);
    }

    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ordemId, empresaId, usuarioId);

      const registro = await fetchOsRawById(ordemId);
      if (!registro || Number(registro.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      return deleteMensagemOs(ordemId, mensagemId);
    });
  }

  static async listArquivos(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<OrdemServicoArquivoItem[]> {
    await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);
    return OrdemServicoArquivoService.list(await IxcOssChamadoService.resolveOsId(id, empresaId));
  }

  static async createArquivo(
    id: string | number,
    descricao: string,
    buffer: Buffer,
    nomeOriginal: string,
    mimeType: string | undefined,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<OrdemServicoArquivoItem> {
    await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);

    const arquivo = {
      buffer,
      originalname: nomeOriginal,
      mimetype: mimeType ?? 'application/octet-stream',
      size: buffer.length,
    } as Express.Multer.File;

    return OrdemServicoArquivoService.create({
      ordem_servico_id: await IxcOssChamadoService.resolveOsId(id, empresaId),
      empresa_id: empresaId,
      nome: nomeOriginal,
      descricao: descricao.trim() || nomeOriginal,
      arquivo,
      mime_type: mimeType,
    });
  }

  static async deleteArquivo(
    ordemId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<void> {
    await IxcOssChamadoService.assertOsAcessivel(ordemId, empresaId, usuarioId);
    await OrdemServicoArquivoService.delete(
      Number(arquivoId),
      await IxcOssChamadoService.resolveOsId(ordemId, empresaId)
    );
  }

  static async downloadArquivo(
    ordemId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<{ buffer: Buffer; nome: string; mimeType: string }> {
    await IxcOssChamadoService.assertOsAcessivel(ordemId, empresaId, usuarioId);
    return OrdemServicoArquivoService.getFileContent(
      Number(arquivoId),
      await IxcOssChamadoService.resolveOsId(ordemId, empresaId)
    );
  }

  static async create(
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);

    if (
      clienteId != null &&
      !(await IntegracaoIxcProvedorService.hasIntegracaoForCliente(clienteId, empresaId))
    ) {
      return OrdemServicoLocalService.create(payload, empresaId, usuarioId);
    }

    return runWithIxcCredentials(empresaId, async () => {
      const payloadComOperador = await IxcOssChamadoService.payloadComOperadorBacknet(payload, usuarioId);
      const body = prepareCreateBody(payloadComOperador);
      body.protocolo = await fetchProximoProtocolo();

      try {
        const response = await createIxcClient().request<IxcActionResponse>({
          method: 'POST',
          url: `/${IXC_RESOURCE}`,
          headers: { ixcsoft: 'incluir' },
          data: body,
        });
        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao criar ordem de serviço no IXC'));
        }

        const newId = response.data?.id;
        if (!newId) {
          throw new Error('IXC não retornou o ID da ordem de serviço criada');
        }

        const os = await fetchOsRawById(newId);
        if (os && clienteId) {
          await OrdemServicoLocalService.createIxcMirror(
            os,
            payloadComOperador,
            empresaId,
            usuarioId,
            clienteId
          );
        }

        return {
          ...response.data,
          id: String(newId),
          protocolo: os?.protocolo ?? body.protocolo,
          data_abertura: os?.data_abertura ?? '',
        };
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao criar ordem de serviço no IXC');
      }
    }, clienteId);
  }

  static async update(
    id: string | number,
    payload: OssChamadoInput,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    if (await OrdemServicoLocalService.exists(id, empresaId)) {
      return OrdemServicoLocalService.update(id, payload, empresaId);
    }

    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);

      const atual = await fetchOsRawById(id);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      const body: Record<string, string> = {
        ...stripCamposEnriquecidos(atual),
        ...sanitizeInput(payload),
      };
      applyBacknetCliente(payload, body);

      try {
        const response = await createIxcClient().put<IxcActionResponse>(`/${IXC_RESOURCE}/${id}`, body);
        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao editar ordem de serviço no IXC'));
        }

        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);

        return response.data;
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao editar ordem de serviço no IXC');
      }
    }, clienteId);
  }

  static async executeAcao(
    id: string | number,
    acao: OssChamadoAcao,
    payload: OssChamadoInput = {},
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    if (await OrdemServicoLocalService.exists(id, empresaId)) {
      if (acao === 'finalizar') {
        return OrdemServicoLocalService.finalizar(id, payload, empresaId, usuarioId);
      }
      if (acao === 'registrar_mensagem') {
        return OrdemServicoLocalService.registrarMensagem(id, payload, empresaId, usuarioId);
      }
      throw new Error('Ação não disponível para ordens de serviço sem integração IXC');
    }

    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);
      const payloadIx = await IxcOssChamadoService.payloadComOperadorBacknet(payload, usuarioId);

      if (acao === 'registrar_mensagem') {
        const resultado = await registrarMensagemOs(id, payloadIx);
        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);
        return resultado;
      }

      const atual = await fetchOsRawById(id);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      if (acao === 'encaminhar') {
        const resultado = await executarEncaminharOs(id, payloadIx, atual);
        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);
        return resultado;
      }
      if (acao === 'agendar') {
        const resultado = await executarAgendarOs(id, payloadIx, atual);
        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);
        return resultado;
      }
      if (acao === 'finalizar') {
        const resultado = await executarFinalizarOs(id, payloadIx, atual);
        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);
        return resultado;
      }

      const mensagemAcao = String(payloadIx.mensagem ?? '').trim();
      const body = buildActionBody(acao, atual, payloadIx);

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
            ...payloadIx,
            mensagem: mensagemAcao,
            id_tecnico: payload.id_tecnico ?? atual.id_tecnico,
          });
        }

        await IxcOssChamadoService.syncMirrorFromIxc(id, empresaId, payload);

        return response.data;
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao executar ação no IXC');
      }
    }, clienteId);
  }

  private static async assertPodeExcluir(
    id: string | number,
    empresaId: number | null = null
  ): Promise<void> {
    const arquivos = await OrdemServicoArquivoService.list(String(id));
    if (arquivos.length > 0) {
      throw new Error(
        'Não é possível excluir a ordem de serviço com arquivos anexados. Exclua os arquivos antes.'
      );
    }

    if (await OrdemServicoLocalService.exists(id, empresaId)) {
      const mensagensExtras = await OrdemServicoLocalService.countMensagensExtras(id, empresaId);
      if (mensagensExtras > 0) {
        throw new Error(
          'Não é possível excluir a ordem de serviço com mensagens no histórico. Exclua as mensagens antes.'
        );
      }
      return;
    }

    await runWithIxcCredentials(empresaId, async () => {
      if (!(await osAbertaPeloOperador(id))) return;

      const registro = await fetchOsRawById(id);
      if (!registro || Number(registro.id_estrutura) <= 0) return;

      const mensagens = await fetchMensagensOs(id);
      const mensagensExtras = mensagens.filter(
        (mensagem) => mensagem.id_evento !== IXC_EVENTO_ABERTURA
      ).length;

      if (mensagensExtras > 0) {
        throw new Error(
          'Não é possível excluir a ordem de serviço com mensagens no histórico. Exclua as mensagens antes.'
        );
      }
    });
  }

  static async delete(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    await IxcOssChamadoService.assertPodeExcluir(id, empresaId);

    if (await OrdemServicoLocalService.exists(id, empresaId)) {
      return OrdemServicoLocalService.delete(id, empresaId);
    }

    const mirror = await OrdemServicoLocalService.findByIxcId(id, empresaId);

    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);

      const atual = await fetchOsRawById(id);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      try {
        const response = await createIxcClient().delete<IxcActionResponse>(`/${IXC_RESOURCE}/${id}`);
        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao excluir ordem de serviço no IXC'));
        }

        if (mirror) {
          await mirror.destroy();
        }

        return response.data;
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao excluir ordem de serviço no IXC');
      }
    });
  }
}
