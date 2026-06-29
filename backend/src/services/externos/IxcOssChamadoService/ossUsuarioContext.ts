import {
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_FUNCIONARIO_SETORES_RESOURCE,
  IXC_SETOR_ASSUNTO_RESOURCE,
  IXC_SETOR_RESOURCE,
  IXC_USUARIOS_RESOURCE,
} from './constants';
import { filterRegistrosAtivos, ixcResourceSupportsAtivoFilter } from './ixcListFilters';
import { ixcListar, resolveOperadorId } from './ixcHttp';
import type { LookupItem } from './types';

export interface ApiOperadorContext {
  setorIds: string[];
  funcionarioId: string | null;
}

async function fetchRegistroIxcPorId(
  resource: string,
  id: string
): Promise<Record<string, string> | null> {
  const normalized = id.trim();
  if (!normalized || normalized === '0') return null;

  const data = await ixcListar<{ registros?: Record<string, string>[] }>(resource, {
    qtype: `${resource}.id`,
    query: normalized,
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${resource}.id`,
    sortorder: 'asc',
  });

  return data.registros?.[0] ?? null;
}

async function fetchApiOperadorUsuario(): Promise<Record<string, string> | null> {
  const operadorId = resolveOperadorId();
  if (!operadorId) return null;
  return fetchRegistroIxcPorId(IXC_USUARIOS_RESOURCE, operadorId);
}

function parseIxcId(value: string | undefined): string | null {
  const id = String(value ?? '').trim();
  if (!id || id === '0' || !/^\d+$/.test(id)) return null;
  return id;
}

function normalizeSetorIds(setorIds: string[]): string[] {
  return [...new Set(setorIds.map((id) => String(id).trim()).filter((id) => id && id !== '0'))];
}

async function fetchLinkedIdsBySetor(
  resource: string,
  setorField: string,
  setorIds: string[],
  linkedIdField: string,
  denyOnError: boolean
): Promise<string[] | null> {
  const uniqueSetores = normalizeSetorIds(setorIds);
  if (uniqueSetores.length === 0) return [];

  const linkedIds = new Set<string>();
  let denied = false;

  for (const setorId of uniqueSetores) {
    try {
      const data = await ixcListar<{ type?: string; registros?: Record<string, string>[] }>(
        resource,
        {
          qtype: `${resource}.${setorField}`,
          query: setorId,
          oper: '=',
          page: '1',
          rp: '500',
          sortname: `${resource}.id`,
          sortorder: 'asc',
        }
      );

      if (data?.type === 'error') {
        if (denyOnError) {
          denied = true;
          break;
        }
        continue;
      }

      for (const registro of filterRegistrosAtivos(data.registros ?? [])) {
        const linkedId = parseIxcId(registro[linkedIdField]);
        if (linkedId) linkedIds.add(linkedId);
      }
    } catch {
      if (denyOnError) {
        denied = true;
        break;
      }
    }
  }

  if (denied) return null;
  return [...linkedIds];
}

async function fetchSetorIdsFromFuncionarioVinculos(funcionarioId: string): Promise<string[]> {
  try {
    const data = await ixcListar<{ type?: string; registros?: Record<string, string>[] }>(
      IXC_FUNCIONARIO_SETORES_RESOURCE,
      {
        qtype: `${IXC_FUNCIONARIO_SETORES_RESOURCE}.usuario`,
        query: funcionarioId,
        oper: '=',
        page: '1',
        rp: '100',
        sortname: `${IXC_FUNCIONARIO_SETORES_RESOURCE}.id`,
        sortorder: 'asc',
      }
    );

    if (data?.type === 'error') return [];

    const setorIds = new Set<string>();
    for (const registro of filterRegistrosAtivos(data.registros ?? [])) {
      const setorId = parseIxcId(registro.setor);
      if (setorId) setorIds.add(setorId);
    }
    return [...setorIds];
  } catch {
    return [];
  }
}

export async function fetchFuncionarioIdsBySetores(setorIds: string[]): Promise<string[]> {
  const ids = await fetchLinkedIdsBySetor(
    IXC_FUNCIONARIO_SETORES_RESOURCE,
    'setor',
    setorIds,
    'usuario',
    false
  );
  return ids ?? [];
}

/** `null` = API sem permissão para listar setor_assunto. */
export async function fetchAssuntoIdsBySetores(setorIds: string[]): Promise<string[] | null> {
  return fetchLinkedIdsBySetor(IXC_SETOR_ASSUNTO_RESOURCE, 'id_setor', setorIds, 'id_assunto', true);
}

export async function resolveApiOperadorContext(): Promise<ApiOperadorContext> {
  const usuario = await fetchApiOperadorUsuario();
  if (!usuario) return { setorIds: [], funcionarioId: null };

  const funcionarioId = String(usuario.funcionario ?? '').trim();
  const validFuncionario = funcionarioId && funcionarioId !== '0' ? funcionarioId : null;

  if (validFuncionario) {
    const vinculos = await fetchSetorIdsFromFuncionarioVinculos(validFuncionario);
    if (vinculos.length > 0) {
      return { setorIds: vinculos, funcionarioId: validFuncionario };
    }

    const funcionario = await fetchRegistroIxcPorId(IXC_FUNCIONARIOS_RESOURCE, validFuncionario);
    const padrao = parseIxcId(funcionario?.id_setor_padrao);
    return { setorIds: padrao ? [padrao] : [], funcionarioId: validFuncionario };
  }

  const setorUsuario = parseIxcId(usuario.setor) ?? parseIxcId(usuario.id_setor);
  return { setorIds: setorUsuario ? [setorUsuario] : [], funcionarioId: null };
}

export async function fetchLookupItemsByIxcIds(
  resource: string,
  nomeCampo: string,
  ids: string[]
): Promise<LookupItem[]> {
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter((id) => id && id !== '0'))];
  if (unique.length === 0) return [];

  const itens: LookupItem[] = [];

  await Promise.all(
    unique.map(async (id) => {
      const registro = await fetchRegistroIxcPorId(resource, id);
      if (!registro?.id) return;
      if (ixcResourceSupportsAtivoFilter(resource) && !filterRegistrosAtivos([registro]).length) return;

      itens.push({
        id: String(registro.id),
        nome:
          resource === IXC_SETOR_RESOURCE
            ? String(registro.setor ?? registro[nomeCampo] ?? '').trim()
            : String(registro[nomeCampo] ?? '').trim(),
      });
    })
  );

  return itens.filter((item) => item.nome);
}
