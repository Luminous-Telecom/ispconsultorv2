import { isAxiosError } from 'axios';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_CIDADE_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_RESOURCE,
  IXC_SETOR_RESOURCE,
} from '../../externos/IxcOssChamadoService/constants';
import {
  fetchAssuntoIdsBySetores,
  fetchFuncionarioIdsBySetores,
  fetchLookupItemsByIxcIds,
  resolveApiOperadorContext,
} from '../../externos/IxcOssChamadoService/ossUsuarioContext';
import {
  buildIxcListBody,
  filterRegistrosAtivos,
  ixcResourceSupportsAtivoFilter,
} from '../../externos/IxcOssChamadoService/ixcListFilters';
import { actionErrorMessage, createIxcClient } from '../../externos/IxcOssChamadoService/ixcHttp';
import type { IxcActionResponse } from '../../externos/IxcOssChamadoService/types';

export type IxcPermissionCellValue = 'liberado' | 'bloqueado' | null;

export interface IxcPermissionFormRow {
  id: string;
  grupo: string;
  formulario: string;
  dados: number | null;
  menu: IxcPermissionCellValue;
  listar: IxcPermissionCellValue;
}

export interface IxcApiPermissionsCheckResult {
  success: boolean;
  items: IxcPermissionFormRow[];
}

export interface IxcPermissionSampleItem {
  id: string;
  texto: string;
}

export interface IxcPermissionSampleResult {
  resourceId: string;
  resource: string;
  ok: boolean;
  total: number | null;
  items: IxcPermissionSampleItem[];
  message?: string;
}

const SAMPLE_RP = 100;

const SAMPLE_CONFIG: Record<string, { resource: string; labelFields: string[] }> = {
  filial: { resource: IXC_FILIAL_RESOURCE, labelFields: ['id', 'fantasia', 'razao'] },
  empresa_setor: { resource: IXC_SETOR_RESOURCE, labelFields: ['id', 'setor'] },
  funcionarios: { resource: IXC_FUNCIONARIOS_RESOURCE, labelFields: ['id', 'funcionario'] },
  su_oss_assunto: { resource: IXC_ASSUNTO_RESOURCE, labelFields: ['id', 'assunto', 'setor'] },
  estrutura: { resource: IXC_ESTRUTURA_RESOURCE, labelFields: ['id', 'descricao'] },
  cidade: { resource: IXC_CIDADE_RESOURCE, labelFields: ['id', 'nome'] },
  su_oss_chamado: {
    resource: IXC_RESOURCE,
    labelFields: ['id', 'protocolo', 'status', 'setor', 'idx'],
  },
  su_oss_chamado_mensagem: {
    resource: IXC_MENSAGEM_RESOURCE,
    labelFields: ['id', 'id_chamado', 'id_evento', 'mensagem'],
  },
};

function isDenied(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('permiss') || lower.includes('autoriz') || lower.includes('acesso negado');
}

function cellFromOk(ok: boolean): IxcPermissionCellValue {
  return ok ? 'liberado' : 'bloqueado';
}

function formatSampleText(registro: Record<string, string>, labelFields: string[]): string {
  const partes = labelFields
    .filter((field) => field !== 'id')
    .map((field) => {
      const valor = String(registro[field] ?? '').trim();
      if (!valor || valor === '0') return '';
      return `${field}: ${valor}`;
    })
    .filter(Boolean);

  if (partes.length > 0) return partes.join(' | ');
  const id = String(registro.id ?? '').trim();
  return id ? `id: ${id}` : '—';
}

async function fetchListRecords(
  resource: string,
  rp = SAMPLE_RP
): Promise<{ ok: boolean; total: number | null; registros: Record<string, string>[] }> {
  try {
    const response = await createIxcClient().request<{
      total?: string;
      type?: string;
      message?: string;
      registros?: Record<string, string>[];
    }>({
      method: 'GET',
      url: `/${resource}`,
      headers: { ixcsoft: 'listar' },
      data: buildIxcListBody(resource, String(rp)),
    });

    const data = response.data;
    if (data?.type === 'error') {
      const msg = actionErrorMessage(data as IxcActionResponse, 'Erro ao listar');
      return { ok: !isDenied(msg), total: null, registros: [] };
    }

    const registros = ixcResourceSupportsAtivoFilter(resource)
      ? filterRegistrosAtivos(data?.registros ?? [])
      : data?.registros ?? [];
    const total = parseInt(data?.total ?? '0', 10) || 0;
    return { ok: true, total, registros };
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) return { ok: false, total: null, registros: [] };
      const data = error.response?.data as IxcActionResponse | undefined;
      if (data?.type === 'error' && isDenied(actionErrorMessage(data, ''))) {
        return { ok: false, total: null, registros: [] };
      }
    }
    return { ok: false, total: null, registros: [] };
  }
}

async function probeList(resource: string): Promise<{ ok: boolean; total: number | null }> {
  const lista = await fetchListRecords(resource, 1);
  return { ok: lista.ok, total: lista.total };
}

/** Conta assuntos do operador API por setor (picker de OS). */
async function probeAssuntosPorSetorOperador(): Promise<{ ok: boolean; total: number | null }> {
  try {
    const { setorIds } = await resolveApiOperadorContext();
    const assuntoIds = await fetchAssuntoIdsBySetores(setorIds);
    if (assuntoIds === null) return { ok: false, total: null };
    return { ok: true, total: assuntoIds.length };
  } catch {
    return { ok: false, total: null };
  }
}

/** Colaboradores do setor do operador API (funcionario_setores). */
async function probeFuncionariosPorSetorOperador(): Promise<{ ok: boolean; total: number | null }> {
  try {
    const { setorIds } = await resolveApiOperadorContext();
    const ids = await fetchFuncionarioIdsBySetores(setorIds);
    return { ok: true, total: ids.length };
  } catch {
    return { ok: false, total: null };
  }
}

/** Setores do operador API via funcionario_setores (ativo), como no picker de OS. */
async function probeSetoresOperador(): Promise<{ ok: boolean; total: number | null }> {
  try {
    const { setorIds } = await resolveApiOperadorContext();
    return { ok: true, total: setorIds.length };
  } catch {
    return { ok: false, total: null };
  }
}

function listCells(
  result: { ok: boolean; total: number | null },
  withListar: boolean
): Pick<IxcPermissionFormRow, 'menu' | 'listar' | 'dados'> {
  const status = cellFromOk(result.ok);
  return {
    menu: status,
    listar: withListar ? status : null,
    dados: result.ok ? result.total : null,
  };
}

function buildRow(
  id: string,
  label: string,
  cells: Partial<IxcPermissionFormRow>
): IxcPermissionFormRow {
  return {
    id,
    grupo: '',
    formulario: label,
    dados: null,
    menu: null,
    listar: null,
    ...cells,
  };
}

function hasBlockedCell(row: IxcPermissionFormRow): boolean {
  return row.menu === 'bloqueado' || row.listar === 'bloqueado';
}

export class IxcApiPermissionsService {
  static async checkAll(): Promise<IxcApiPermissionsCheckResult> {
    const [
      filial,
      setor,
      setorOperador,
      funcionarios,
      funcionariosPorSetor,
      assunto,
      assuntoPorSetor,
      estrutura,
      cidade,
      osList,
      mensagemList,
    ] = await Promise.all([
      probeList(IXC_FILIAL_RESOURCE),
      probeList(IXC_SETOR_RESOURCE),
      probeSetoresOperador(),
      probeList(IXC_FUNCIONARIOS_RESOURCE),
      probeFuncionariosPorSetorOperador(),
      probeList(IXC_ASSUNTO_RESOURCE),
      probeAssuntosPorSetorOperador(),
      probeList(IXC_ESTRUTURA_RESOURCE),
      probeList(IXC_CIDADE_RESOURCE),
      probeList(IXC_RESOURCE),
      probeList(IXC_MENSAGEM_RESOURCE),
    ]);

    const setorCells = listCells(setor, true);
    setorCells.dados = setorOperador.total;
    const funcionariosCells = listCells(funcionarios, true);
    funcionariosCells.dados = funcionariosPorSetor.total;
    const assuntoCells = listCells(assunto, true);
    assuntoCells.dados = assuntoPorSetor.total;

    const items: IxcPermissionFormRow[] = [
      buildRow('filial', 'Filiais', listCells(filial, true)),
      buildRow('empresa_setor', 'Setores', setorCells),
      buildRow('funcionarios', 'Colaboradores', funcionariosCells),
      buildRow('su_oss_assunto', 'Assuntos', assuntoCells),
      buildRow('estrutura', 'Estruturas', listCells(estrutura, true)),
      buildRow('cidade', 'Cidades', listCells(cidade, true)),
      buildRow('su_oss_chamado', 'Chamados', listCells(osList, true)),
      buildRow('su_oss_chamado_mensagem', 'Mensagens', listCells(mensagemList, true)),
    ];

    return {
      success: !items.some(hasBlockedCell),
      items,
    };
  }

  static async fetchSample(resourceId: string): Promise<IxcPermissionSampleResult> {
    const config = SAMPLE_CONFIG[resourceId];
    if (!config) {
      return {
        resourceId,
        resource: '',
        ok: false,
        total: null,
        items: [],
        message: 'Formulário não reconhecido',
      };
    }

    if (resourceId === 'funcionarios') {
      const { setorIds } = await resolveApiOperadorContext();
      const funcionarioIds = await fetchFuncionarioIdsBySetores(setorIds);
      const lookupItems = await fetchLookupItemsByIxcIds(
        IXC_FUNCIONARIOS_RESOURCE,
        'funcionario',
        funcionarioIds
      );
      const items = lookupItems.map((item) => ({
        id: item.id,
        texto: item.nome,
      }));

      return {
        resourceId,
        resource: config.resource,
        ok: true,
        total: items.length,
        items,
        message:
          items.length === 0
            ? 'Nenhum colaborador vinculado aos setores do operador API.'
            : 'Colaboradores do setor do operador API.',
      };
    }

    if (resourceId === 'empresa_setor') {
      const { setorIds } = await resolveApiOperadorContext();
      const lookupItems = await fetchLookupItemsByIxcIds(IXC_SETOR_RESOURCE, 'setor', setorIds);
      const items = lookupItems.map((item) => ({
        id: item.id,
        texto: item.nome,
      }));

      return {
        resourceId,
        resource: config.resource,
        ok: true,
        total: items.length,
        items,
        message:
          items.length === 0
            ? 'Nenhum setor vinculado ao operador API.'
            : 'Setores do operador API.',
      };
    }

    if (resourceId === 'su_oss_assunto') {
      const { setorIds } = await resolveApiOperadorContext();
      const assuntoIds = await fetchAssuntoIdsBySetores(setorIds);
      if (assuntoIds === null) {
        return {
          resourceId,
          resource: config.resource,
          ok: false,
          total: null,
          items: [],
          message: 'Sem permissão para listar assuntos vinculados ao setor do operador API.',
        };
      }

      const lookupItems = await fetchLookupItemsByIxcIds(IXC_ASSUNTO_RESOURCE, 'assunto', assuntoIds);
      const items = lookupItems.map((item) => ({
        id: item.id,
        texto: item.nome,
      }));

      return {
        resourceId,
        resource: config.resource,
        ok: true,
        total: items.length,
        items,
        message:
          items.length === 0
            ? 'Nenhum assunto vinculado aos setores do operador API.'
            : 'Assuntos do setor do operador API.',
      };
    }

    const lista = await fetchListRecords(config.resource);
    if (!lista.ok) {
      return {
        resourceId,
        resource: config.resource,
        ok: false,
        total: null,
        items: [],
        message: 'Listagem bloqueada ou indisponível para o usuário API.',
      };
    }

    const items = lista.registros.map((registro) => {
      const id = String(registro.id ?? '').trim();
      return {
        id: id || '—',
        texto: formatSampleText(registro, config.labelFields),
      };
    });

    const total = lista.total ?? items.length;
    const message =
      total > items.length
        ? `Exibindo ${items.length} de ${total} registros retornados pela API.`
        : total === 0
          ? 'A API não retornou registros para este cadastro.'
          : undefined;

    return {
      resourceId,
      resource: config.resource,
      ok: true,
      total,
      items,
      message,
    };
  }
}
