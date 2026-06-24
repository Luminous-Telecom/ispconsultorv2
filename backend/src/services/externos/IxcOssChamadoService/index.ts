import { runWithIxcCredentials } from '../ixcApiContext';
import { CAMPOS_ENRIQUECIDOS, IXC_FILIAL_RESOURCE, IXC_RESOURCE, OSS_CHAMADO_ACOES } from './constants';
import {
  actionErrorMessage,
  createIxcClient,
  paginaVazia,
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
  private static async assertOsAcessivel(id: string | number): Promise<void> {
    if (!(await osAbertaPeloOperador(id))) {
      throw new Error('Ordem de serviço não encontrada');
    }

    const registro = await fetchOsRawById(id);
    if (!registro || Number(registro.id_estrutura) <= 0) {
      throw new Error('Ordem de serviço não encontrada');
    }
  }

  static async list(
    filters: ListOssChamadosFilters = {},
    empresaId: number | null = null
  ): Promise<ListOssChamadosResponse> {
    return runWithIxcCredentials(empresaId, async () => {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const limit = filters.limit && filters.limit > 0 ? filters.limit : 15;
      const search = filters.search?.trim();
      const sortColumn = filters.sortColumn?.trim() || 'id';
      const sortDirection = filters.sortDirection === 'asc' ? 'asc' : 'desc';
      const searchField = filters.searchField?.trim() || 'cliente_nome';

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
          registros = registros.filter((r) =>
            [searchField, 'mensagem', 'protocolo'].some((campo) =>
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
    });
  }

  static async listResource(
    resource: string,
    nomeCampo: string,
    filters: ListOssChamadosFilters = {},
    additionalFilters: Record<string, string> = {},
    empresaId: number | null = null,
    clienteId: number | null = null
  ): Promise<ListLookupResponse> {
    return runWithIxcCredentials(empresaId, async () => {
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
    }, clienteId);
  }

  static async getById(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcOssChamado | null> {
    return runWithIxcCredentials(empresaId, async () => {
      try {
        if (!(await osAbertaPeloOperador(id))) return null;

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
    empresaId: number | null = null
  ): Promise<IxcOssMensagem[]> {
    return runWithIxcCredentials(empresaId, async () => {
      try {
        if (!(await osAbertaPeloOperador(id))) {
          throw new Error('Ordem de serviço não encontrada');
        }

        const registro = await fetchOsRawById(id);
        if (!registro || Number(registro.id_estrutura) <= 0) {
          throw new Error('Ordem de serviço não encontrada');
        }

        return fetchMensagensOs(id);
      } catch (error) {
        throw wrapIxcError(error, 'Erro ao listar mensagens da ordem de serviço no IXC');
      }
    });
  }

  static async deleteMensagem(
    ordemId: string | number,
    mensagemId: string | number,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    return runWithIxcCredentials(empresaId, async () => {
      if (!(await osAbertaPeloOperador(ordemId))) {
        throw new Error('Ordem de serviço não encontrada');
      }

      const registro = await fetchOsRawById(ordemId);
      if (!registro || Number(registro.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      return deleteMensagemOs(ordemId, mensagemId);
    });
  }

  static async listArquivos(
    id: string | number,
    empresaId: number | null = null
  ): Promise<OrdemServicoArquivoItem[]> {
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(id);
      return OrdemServicoArquivoService.list(String(id));
    });
  }

  static async createArquivo(
    id: string | number,
    descricao: string,
    buffer: Buffer,
    nomeOriginal: string,
    mimeType: string | undefined,
    empresaId: number | null = null
  ): Promise<OrdemServicoArquivoItem> {
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(id);

      const arquivo = {
        buffer,
        originalname: nomeOriginal,
        mimetype: mimeType ?? 'application/octet-stream',
        size: buffer.length,
      } as Express.Multer.File;

      return OrdemServicoArquivoService.create({
        ordem_servico_id: String(id),
        empresa_id: empresaId,
        nome: nomeOriginal,
        descricao: descricao.trim() || nomeOriginal,
        arquivo,
        mime_type: mimeType,
      });
    });
  }

  static async deleteArquivo(
    ordemId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null
  ): Promise<void> {
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ordemId);
      await OrdemServicoArquivoService.delete(Number(arquivoId), String(ordemId));
    });
  }

  static async downloadArquivo(
    ordemId: string | number,
    arquivoId: string | number,
    empresaId: number | null = null
  ): Promise<{ buffer: Buffer; nome: string; mimeType: string }> {
    return runWithIxcCredentials(empresaId, async () => {
      await IxcOssChamadoService.assertOsAcessivel(ordemId);
      return OrdemServicoArquivoService.getFileContent(Number(arquivoId), String(ordemId));
    });
  }

  static async create(
    payload: OssChamadoInput,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      const body = prepareCreateBody(payload);
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
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
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
      applyBacknetCliente(payload, body);

      try {
        const response = await createIxcClient().put<IxcActionResponse>(`/${IXC_RESOURCE}/${id}`, body);
        if (response.data?.type === 'error') {
          throw new Error(actionErrorMessage(response.data, 'Erro ao editar ordem de serviço no IXC'));
        }
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
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    const clienteId = parseClienteId(payload.cliente_id);
    return runWithIxcCredentials(empresaId, async () => {
      if (!(await osAbertaPeloOperador(id))) {
        throw new Error('Ordem de serviço não encontrada');
      }

      if (acao === 'registrar_mensagem') {
        return registrarMensagemOs(id, payload);
      }

      const atual = await fetchOsRawById(id);
      if (!atual || Number(atual.id_estrutura) <= 0) {
        throw new Error('Ordem de serviço não encontrada');
      }

      if (acao === 'encaminhar') return executarEncaminharOs(id, payload, atual);
      if (acao === 'agendar') return executarAgendarOs(id, payload, atual);
      if (acao === 'finalizar') return executarFinalizarOs(id, payload, atual);

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
    }, clienteId);
  }

  static async delete(
    id: string | number,
    empresaId: number | null = null
  ): Promise<IxcActionResponse> {
    return runWithIxcCredentials(empresaId, async () => {
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
    });
  }
}
