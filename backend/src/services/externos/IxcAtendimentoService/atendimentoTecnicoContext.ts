import { createIxcClient } from '../IxcOssChamadoService/ixcHttp';
import { IXC_SETOR_RESOURCE } from '../IxcOssChamadoService/constants';
import {
  fetchFuncionarioIdsBySetores,
  fetchLookupItemsByIxcIds,
  resolveApiOperadorContext,
} from '../IxcOssChamadoService/ossUsuarioContext';
import { filterRegistrosAtivos } from '../IxcOssChamadoService/ixcListFilters';
import { IXC_DEPARTAMENTO_RESOURCE } from './constants';
import type { LookupItem } from '../IxcOssChamadoService/types';

function parseIxcId(value: string | undefined): string | null {
  const id = String(value ?? '').trim();
  if (!id || id === '0' || !/^\d+$/.test(id)) return null;
  return id;
}

/** Departamentos de atendimento visíveis ao operador API (via setor OS → id_depto). */
export async function resolveAtendimentoDepartamentoIds(): Promise<string[]> {
  const { setorIds } = await resolveApiOperadorContext();
  if (setorIds.length === 0) return [];

  const deptoIds = new Set<string>();
  for (const setorId of setorIds) {
    try {
      const data = await createIxcClient().request<{
        registros?: Array<Record<string, string>>;
      }>({
        method: 'GET',
        url: `/${IXC_SETOR_RESOURCE}`,
        headers: { ixcsoft: 'listar' },
        data: {
          qtype: `${IXC_SETOR_RESOURCE}.id`,
          query: setorId,
          oper: '=',
          page: '1',
          rp: '1',
          sortname: `${IXC_SETOR_RESOURCE}.id`,
          sortorder: 'asc',
        },
      });
      const idDepto = String(data.data?.registros?.[0]?.id_depto ?? '').trim();
      if (idDepto && idDepto !== '0') deptoIds.add(idDepto);
    } catch {
      // best-effort
    }
  }
  return [...deptoIds];
}

export async function resolveDepartamentoIdsForLookup(
  departamentoId?: string
): Promise<string[]> {
  const normalized = String(departamentoId ?? '').trim();
  if (normalized && normalized !== '0') return [normalized];
  return resolveAtendimentoDepartamentoIds();
}

export async function fetchSetorIdsByDepartamentos(departamentoIds: string[]): Promise<string[]> {
  const uniqueDepartamentos = [
    ...new Set(
      departamentoIds.map((id) => String(id).trim()).filter((id) => id && id !== '0')
    ),
  ];
  if (uniqueDepartamentos.length === 0) return [];

  const setorIds = new Set<string>();

  for (const departamentoId of uniqueDepartamentos) {
    try {
      const data = await createIxcClient().request<{
        type?: string;
        registros?: Record<string, string>[];
      }>({
        method: 'GET',
        url: `/${IXC_SETOR_RESOURCE}`,
        headers: { ixcsoft: 'listar' },
        data: {
          qtype: `${IXC_SETOR_RESOURCE}.id_depto`,
          query: departamentoId,
          oper: '=',
          page: '1',
          rp: '500',
          sortname: `${IXC_SETOR_RESOURCE}.id`,
          sortorder: 'asc',
        },
      });

      if (data.data?.type === 'error') continue;

      for (const registro of filterRegistrosAtivos(data.data?.registros ?? [])) {
        const setorId = parseIxcId(registro.id);
        if (setorId) setorIds.add(setorId);
      }
    } catch {
      // best-effort
    }
  }

  return [...setorIds];
}

export async function fetchFuncionariosForDepartamentos(
  nomeCampo: string,
  departamentoIds: string[]
): Promise<LookupItem[]> {
  const setorIds = await fetchSetorIdsByDepartamentos(departamentoIds);
  if (setorIds.length === 0) return [];

  const funcionarioIds = await fetchFuncionarioIdsBySetores(setorIds);
  if (funcionarioIds.length === 0) return [];

  return fetchLookupItemsByIxcIds('funcionarios', nomeCampo, funcionarioIds);
}

export async function fetchAllDepartamentosAtivos(): Promise<LookupItem[]> {
  try {
    const data = await createIxcClient().request<{
      type?: string;
      registros?: Record<string, string>[];
    }>({
      method: 'GET',
      url: `/${IXC_DEPARTAMENTO_RESOURCE}`,
      headers: { ixcsoft: 'listar' },
      data: {
        qtype: `${IXC_DEPARTAMENTO_RESOURCE}.id`,
        query: '0',
        oper: '>',
        page: '1',
        rp: '500',
        sortname: `${IXC_DEPARTAMENTO_RESOURCE}.id`,
        sortorder: 'asc',
      },
    });

    if (data.data?.type === 'error') return [];

    return filterRegistrosAtivos(data.data?.registros ?? [])
      .map((registro) => ({
        id: String(registro.id ?? ''),
        nome: String(registro.setor ?? '').trim(),
      }))
      .filter((item) => item.id && item.nome);
  } catch {
    return [];
  }
}

export async function fetchFuncionariosForAtendimentoSync(nomeCampo: string): Promise<LookupItem[]> {
  const departamentos = await fetchAllDepartamentosAtivos();
  const deptoIds = departamentos.map((item) => String(item.id));
  if (deptoIds.length === 0) return [];

  const itens = await fetchFuncionariosForDepartamentos(nomeCampo, deptoIds);
  const unique = new Map<string, LookupItem>();
  for (const item of itens) {
    unique.set(String(item.id), item);
  }
  return [...unique.values()];
}
