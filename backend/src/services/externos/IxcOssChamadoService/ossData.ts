import {
  IXC_MENSAGEM_RESOURCE,
  IXC_RESOURCE,
  OSS_EVENTO_LABELS,
} from './constants';
import { ixcListar } from './ixcHttp';
import type { IxcListResponse, IxcOssChamado, IxcOssMensagem } from './types';

const OS_ESTRUTURA_GRID = JSON.stringify([{ TB: `${IXC_RESOURCE}.id_estrutura`, OP: '>', P: '0' }]);

async function fetchOsListPaginated(
  qtype: string,
  query: string,
  oper: string,
  maxPages: number
): Promise<IxcOssChamado[]> {
  const result: IxcOssChamado[] = [];
  const rp = 100;

  for (let page = 1; page <= maxPages; page++) {
    const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
      qtype,
      query,
      oper,
      page: String(page),
      rp: String(rp),
      sortname: `${IXC_RESOURCE}.id`,
      sortorder: 'desc',
      grid_param: OS_ESTRUTURA_GRID,
    });

    const batch = data.registros ?? [];
    result.push(...batch);

    const total = parseInt(data.total ?? '0', 10) || 0;
    if (batch.length === 0 || page * rp >= total) break;
  }

  return result;
}

/** Lista OS de estrutura visíveis ao usuário do token IXC (pode filtrar por setor do operador API). */
export async function fetchOsListIxc(maxPages = 20): Promise<IxcOssChamado[]> {
  return fetchOsListPaginated(`${IXC_RESOURCE}.id`, '0', '>', maxPages);
}

/** OS de estrutura vinculadas ao cliente ISP Consultor (`idx`). Contorna filtro de setor da listagem geral. */
export async function fetchOsListByClienteIdx(
  clienteId: number,
  maxPages = 10
): Promise<IxcOssChamado[]> {
  return fetchOsListPaginated(`${IXC_RESOURCE}.idx`, String(clienteId), '=', maxPages);
}

/** Listagem geral + por cliente vinculado (importação mais completa que só o bulk). */
export async function fetchOsListForImport(clienteIds: number[]): Promise<IxcOssChamado[]> {
  const mapa = indexOsListById(await fetchOsListIxc());

  for (const clienteId of clienteIds) {
    if (!Number.isFinite(clienteId) || clienteId <= 0) continue;
    const porCliente = await fetchOsListByClienteIdx(clienteId);
    for (const os of porCliente) {
      const id = String(os.id ?? '').trim();
      if (id) mapa.set(id, os);
    }
  }

  return [...mapa.values()];
}

export function resolveClienteIdFromOs(os: IxcOssChamado, clienteIds: Set<number>): number | null {
  const idx = parseInt(String(os.idx ?? '').trim(), 10);
  if (Number.isFinite(idx) && idx > 0 && clienteIds.has(idx)) return idx;

  const idCliente = parseInt(String(os.id_cliente ?? '').trim(), 10);
  if (Number.isFinite(idCliente) && idCliente > 0 && clienteIds.has(idCliente)) return idCliente;

  return null;
}

export function indexOsListById(registros: IxcOssChamado[]): Map<string, IxcOssChamado> {
  const mapa = new Map<string, IxcOssChamado>();
  for (const os of registros) {
    const id = String(os.id ?? '').trim();
    if (id) mapa.set(id, os);
  }
  return mapa;
}

export async function fetchOsRawById(id: string | number): Promise<IxcOssChamado | null> {
  const idStr = String(id).trim();
  if (!idStr) return null;

  const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
    qtype: `${IXC_RESOURCE}.id`,
    query: idStr,
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${IXC_RESOURCE}.id`,
    sortorder: 'desc',
  });

  return data.registros?.[0] ?? null;
}

export async function fetchOsForSync(
  ixcId: string | number,
  bulkById?: Map<string, IxcOssChamado>
): Promise<IxcOssChamado | null> {
  const idStr = String(ixcId).trim();
  if (!idStr) return null;
  if (bulkById?.has(idStr)) return bulkById.get(idStr)!;
  return fetchOsRawById(idStr);
}

export async function fetchMensagensOs(id: string | number): Promise<IxcOssMensagem[]> {
  const data = await ixcListar<IxcListResponse>(IXC_MENSAGEM_RESOURCE, {
    qtype: `${IXC_MENSAGEM_RESOURCE}.id_chamado`,
    query: String(id),
    oper: '=',
    page: '1',
    rp: '500',
    sortname: `${IXC_MENSAGEM_RESOURCE}.id`,
    sortorder: 'asc',
  });

  const registros = data.registros ?? [];
  if (registros.length === 0) return [];

  return registros.map((registro): IxcOssMensagem => ({
    id: String(registro.id ?? ''),
    id_chamado: String(registro.id_chamado ?? ''),
    id_evento: String(registro.id_evento ?? ''),
    id_operador: String(registro.id_operador ?? ''),
    id_tecnico: String(registro.id_tecnico ?? ''),
    mensagem: String(registro.mensagem ?? ''),
    data: String(registro.data ?? ''),
    evento_nome: OSS_EVENTO_LABELS[String(registro.id_evento ?? '')] ?? `Evento ${registro.id_evento}`,
    operador_nome: '',
    colaborador_nome: '',
  }));
}

export function sortRegistros(
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
