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

function parseSetorId(value: string | undefined): string | null {
  const id = String(value ?? '').trim();
  if (!id || id === '0' || !/^\d+$/.test(id)) return null;
  return id;
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
      const setorId = parseSetorId(registro.setor);
      if (setorId) setorIds.add(setorId);
    }
    return [...setorIds];
  } catch {
    return [];
  }
}

/** Assuntos vinculados ao setor via setor_assunto. `null` = API sem permissão para listar setor_assunto. */
export async function fetchAssuntoIdsBySetores(setorIds: string[]): Promise<string[] | null> {
  const uniqueSetores = [...new Set(setorIds.map((id) => String(id).trim()).filter((id) => id && id !== '0'))];
  if (uniqueSetores.length === 0) return [];

  const assuntoIds = new Set<string>();
  let denied = false;

  for (const setorId of uniqueSetores) {
    try {
      const data = await ixcListar<{ type?: string; registros?: Record<string, string>[] }>(
        IXC_SETOR_ASSUNTO_RESOURCE,
        {
          qtype: `${IXC_SETOR_ASSUNTO_RESOURCE}.id_setor`,
          query: setorId,
          oper: '=',
          page: '1',
          rp: '500',
          sortname: `${IXC_SETOR_ASSUNTO_RESOURCE}.id`,
          sortorder: 'asc',
        }
      );

      if (data?.type === 'error') {
        denied = true;
        break;
      }

      for (const registro of filterRegistrosAtivos(data.registros ?? [])) {
        const assuntoId = parseSetorId(registro.id_assunto);
        if (assuntoId) assuntoIds.add(assuntoId);
      }
    } catch {
      denied = true;
      break;
    }
  }

  if (denied) return null;
  return [...assuntoIds];
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
    const padrao = parseSetorId(funcionario?.id_setor_padrao);
    return { setorIds: padrao ? [padrao] : [], funcionarioId: validFuncionario };
  }

  const setorUsuario = parseSetorId(usuario.setor) ?? parseSetorId(usuario.id_setor);
  return { setorIds: setorUsuario ? [setorUsuario] : [], funcionarioId: null };
}

export async function resolveApiOperadorSetorIds(): Promise<string[]> {
  return (await resolveApiOperadorContext()).setorIds;
}

export async function resolveApiOperadorFuncionarioId(): Promise<string | null> {
  return (await resolveApiOperadorContext()).funcionarioId;
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
