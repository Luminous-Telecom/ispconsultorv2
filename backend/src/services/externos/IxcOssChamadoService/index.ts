import { runWithIxcCredentials } from '../ixcApiContext';
import { clienteNomeParaOrdemServico } from '../../ordens/clienteNomeOrdemServico';
import { Cliente } from '../../../models/clientes/Cliente';
import { IntegracaoIxcProvedorService } from '../../integracao/IntegracaoIxcProvedorService';
import { OrdemServicoCadastroService } from '../../ordens/OrdemServicoCadastroService';
import { IXC_EVENTO_ABERTURA, IXC_FILIAL_RESOURCE, IXC_RESOURCE, OSS_CHAMADO_ACOES } from './constants';
import {
  actionErrorMessage,
  createIxcClient,
  sanitizeInput,
  wrapIxcError,
} from './ixcHttp';
import {
  executarAgendarOs,
  executarEncaminharOs,
  executarFinalizarOs,
  registrarMensagemOs,
  deleteMensagemIxcById,
} from './ossAcoes';
import { OrdemServicoMensagem } from '../../../models/ordens/OrdemServicoMensagem';
import { OrdemServicoArquivoService, type OrdemServicoArquivoItem } from '../../ordens/OrdemServicoArquivoService';
import {
  countMensagensExtrasIxc,
  isOrdemServicoFinalizada,
  MSG_OS_COM_ARQUIVOS,
  MSG_OS_COM_MENSAGENS,
  MSG_OS_FINALIZADA,
} from '../../ordens/ordemServicoExclusao';
import {
  OrdemServicoLocalService,
  fetchUsuarioNomeById,
} from '../../ordens/OrdemServicoLocalService';
import {
  mapMensagensIxcOperadorBacknet,
  prefixarMensagemOperador,
} from '../../ordens/ordemServicoMensagemFormat';
import {
  fetchMensagensOs,
  fetchOsRawById,
  osAbertaPeloOperador,
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

async function fetchClienteNomeForLog(clienteId: number): Promise<string> {
  const cliente = await Cliente.findByPk(clienteId, { attributes: ['razao_social', 'nome_fantasia'] });
  if (!cliente) return String(clienteId);
  return clienteNomeParaOrdemServico(cliente, clienteId);
}

export class IxcOssChamadoService {
  private static async assertOsAcessivel(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<void> {
    if (await OrdemServicoLocalService.findRecord(id, empresaId)) {
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
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);
    if (record) return String(record.id);
    return String(id);
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

  private static async resolveIxcOsId(
    id: string | number,
    empresaId: number | null
  ): Promise<string> {
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);
    const ixcId = record?.ixc_id?.trim();
    if (ixcId) return ixcId;
    return String(id).trim();
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

  private static async syncLocalMirrorFromIxc(
    ixcId: string | number,
    empresaId: number | null,
    payload: OssChamadoInput = {}
  ): Promise<void> {
    await IxcOssChamadoService.syncMirrorFromIxc(ixcId, empresaId, payload);
    const record = await OrdemServicoLocalService.findByIxcId(ixcId, empresaId);
    if (!record) return;
    const mensagens = await fetchMensagensOs(ixcId);
    await OrdemServicoLocalService.syncMensagensFromIxc(record, mensagens, empresaId);
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
    _usuarioId: number | null = null
  ): Promise<ListOssChamadosResponse> {
    return OrdemServicoLocalService.list(filters, empresaId);
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
    _usuarioId: number | null = null
  ): Promise<IxcOssChamado | null> {
    return OrdemServicoLocalService.getChamado(id, empresaId);
  }

  static async listMensagens(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcOssMensagem[]> {
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);

    if (record) {
      return OrdemServicoLocalService.listMensagens(record.id, empresaId);
    }

    await IxcOssChamadoService.assertOsAcessivel(id, empresaId, usuarioId);
    try {
      return await IxcOssChamadoService.fetchMensagensIxc(id, empresaId);
    } catch (error) {
      throw wrapIxcError(error, 'Erro ao listar mensagens da ordem de serviço no IXC');
    }
  }

  private static async resolveIxcMensagemId(
    ixcOsId: string,
    mensagemLocal: OrdemServicoMensagem
  ): Promise<string | null> {
    const stored = mensagemLocal.ixc_id?.trim();
    if (stored) return stored;

    const ixcMensagens = await fetchMensagensOs(ixcOsId);
    if (mensagemLocal.id_evento === IXC_EVENTO_ABERTURA) {
      const abertura = ixcMensagens.find((item) => String(item.id_evento) === IXC_EVENTO_ABERTURA);
      return abertura?.id ? String(abertura.id).trim() : null;
    }

    const texto = mensagemLocal.mensagem.trim();
    const match = ixcMensagens.find(
      (item) =>
        String(item.id_evento ?? '') === mensagemLocal.id_evento &&
        String(item.mensagem ?? '').trim() === texto
    );
    return match?.id ? String(match.id).trim() : null;
  }

  static async deleteMensagem(
    ordemId: string | number,
    mensagemId: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    const record = await OrdemServicoLocalService.findRecord(ordemId, empresaId);
    if (!record) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const mensagemLocal = await OrdemServicoMensagem.findOne({
      where: {
        id: Number(mensagemId),
        ordem_servico_id: record.id,
      },
    });
    if (!mensagemLocal) {
      throw new Error('Mensagem não encontrada');
    }

    if (await OrdemServicoLocalService.isPureBacknet(ordemId, empresaId)) {
      await mensagemLocal.destroy();
      return { type: 'success' };
    }

    const ixcId = await IxcOssChamadoService.resolveIxcOsId(ordemId, empresaId);

    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ixcId, empresaId, usuarioId);

      const registro = await fetchOsRawById(ixcId);
      if (!registro || Number(registro.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      const ixcMensagemId = await IxcOssChamadoService.resolveIxcMensagemId(ixcId, mensagemLocal);
      if (!ixcMensagemId) {
        throw new Error('Mensagem não encontrada no IXC');
      }

      const resultado = await deleteMensagemIxcById(ixcMensagemId);
      await mensagemLocal.destroy();
      return resultado;
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
          const integracao = await IntegracaoIxcProvedorService.findIntegracaoAtivaForCliente(
            clienteId,
            empresaId
          );
          const mirror = await OrdemServicoLocalService.createIxcMirror(
            os,
            payloadComOperador,
            empresaId,
            usuarioId,
            clienteId
          );
          const clienteNome = await fetchClienteNomeForLog(clienteId);
          const { IxcOsSchedulerRoutineService } = await import('../../ordens/IxcOsSchedulerRoutineService');
          await IxcOsSchedulerRoutineService.registrarAberturaBacknet({
            record: mirror,
            integracaoId: integracao?.id,
            integracaoNome: integracao?.nome,
            usuarioId,
            clienteNome,
          });
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
    if (await OrdemServicoLocalService.isPureBacknet(id, empresaId)) {
      return OrdemServicoLocalService.update(id, payload, empresaId);
    }

    const ixcId = await IxcOssChamadoService.resolveIxcOsId(id, empresaId);
    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ixcId, empresaId, usuarioId);

      const atual = await fetchOsRawById(ixcId);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      const body: Record<string, string> = {
        ...stripCamposEnriquecidos(atual),
        ...sanitizeInput(payload),
      };
      applyBacknetCliente(payload, body);

      try {
        const response = await createIxcClient().put<IxcActionResponse>(`/${IXC_RESOURCE}/${ixcId}`, body);
        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao editar ordem de serviço no IXC'));
        }

        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);

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
    if (await OrdemServicoLocalService.isPureBacknet(id, empresaId)) {
      if (acao === 'finalizar') {
        return OrdemServicoLocalService.finalizar(id, payload, empresaId, usuarioId);
      }
      if (acao === 'registrar_mensagem') {
        return OrdemServicoLocalService.registrarMensagem(id, payload, empresaId, usuarioId);
      }
      throw new Error('Ação não disponível para ordens de serviço sem integração IXC');
    }

    const ixcId = await IxcOssChamadoService.resolveIxcOsId(id, empresaId);
    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ixcId, empresaId, usuarioId);
      const payloadIx = await IxcOssChamadoService.payloadComOperadorBacknet(payload, usuarioId);

      if (acao === 'registrar_mensagem') {
        const resultado = await registrarMensagemOs(ixcId, payloadIx);
        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);
        return resultado;
      }

      const atual = await fetchOsRawById(ixcId);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      if (acao === 'encaminhar') {
        const resultado = await executarEncaminharOs(ixcId, payloadIx, atual);
        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);
        return resultado;
      }
      if (acao === 'agendar') {
        const resultado = await executarAgendarOs(ixcId, payloadIx, atual);
        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);
        return resultado;
      }
      if (acao === 'finalizar') {
        const resultado = await executarFinalizarOs(ixcId, payloadIx, atual);
        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);
        return resultado;
      }

      const mensagemAcao = String(payloadIx.mensagem ?? '').trim();
      const body = buildActionBody(acao, atual, payloadIx);

      try {
        const response = await createIxcClient().request<IxcActionResponse>({
          method: 'PUT',
          url: `/${IXC_RESOURCE}/${ixcId}`,
          headers: { ixcsoft: acao },
          data: body,
        });

        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao executar ação no IXC'));
        }

        if (mensagemAcao) {
          await registrarMensagemOs(ixcId, {
            ...payloadIx,
            mensagem: mensagemAcao,
            id_tecnico: payload.id_tecnico ?? atual.id_tecnico,
          });
        }

        await IxcOssChamadoService.syncLocalMirrorFromIxc(ixcId, empresaId, payload);

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
    const record = await OrdemServicoLocalService.findRecord(id, empresaId);
    const osId = record ? String(record.id) : String(id);

    const arquivos = await OrdemServicoArquivoService.list(osId);
    if (arquivos.length > 0) {
      throw new Error(MSG_OS_COM_ARQUIVOS);
    }

    if (record && isOrdemServicoFinalizada(record.status)) {
      throw new Error(MSG_OS_FINALIZADA);
    }

    if (record) {
      const mensagensExtras = await OrdemServicoLocalService.countMensagensExtras(record.id, empresaId);
      if (mensagensExtras > 0) {
        throw new Error(MSG_OS_COM_MENSAGENS);
      }
    }

    const ixcId = record?.ixc_id?.trim() || (!record ? String(id).trim() : '');
    if (!ixcId) return;

    await runWithIxcCredentials(empresaId, async () => {
      const registro = await fetchOsRawById(ixcId);
      if (!registro || Number(registro.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      if (isOrdemServicoFinalizada(registro.status)) {
        throw new Error(MSG_OS_FINALIZADA);
      }

      const mensagens = await fetchMensagensOs(ixcId);
      if (countMensagensExtrasIxc(mensagens) > 0) {
        throw new Error(MSG_OS_COM_MENSAGENS);
      }
    });
  }

  static async delete(
    id: string | number,
    empresaId: number | null = null,
    usuarioId: number | null = null
  ): Promise<IxcActionResponse> {
    await IxcOssChamadoService.assertPodeExcluir(id, empresaId);

    const record = await OrdemServicoLocalService.findRecord(id, empresaId);
    const ixcId = record?.ixc_id?.trim() || (!record ? String(id).trim() : '');

    if (ixcId) {
      return runWithIxcCredentials(empresaId, async () => {
        await IxcOssChamadoService.assertOsAcessivel(ixcId, empresaId, usuarioId);

        const atual = await fetchOsRawById(ixcId);
        if (!atual || Number(atual.id_estrutura) <= 0) {
          throw new Error('Ordem de serviço não encontrada');
        }

        try {
          const response = await createIxcClient().delete<IxcActionResponse>(`/${IXC_RESOURCE}/${ixcId}`);
          if (response.data?.type === 'error') {
            throw new Error(actionErrorMessage(response.data, 'Erro ao excluir ordem de serviço no IXC'));
          }

          if (record) {
            await OrdemServicoLocalService.destroyRecord(record);
          }

          return response.data;
        } catch (error) {
          throw wrapIxcError(error, 'Erro ao excluir ordem de serviço no IXC');
        }
      });
    }

    if (record) {
      return OrdemServicoLocalService.delete(id, empresaId);
    }

    throw new Error('Ordem de serviço não encontrada');
  }
}
