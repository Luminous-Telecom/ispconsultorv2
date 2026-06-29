import { ClienteService } from '../../clientes/ClienteService';
import { clienteNomeParaOrdemServico } from '../../ordens/clienteNomeOrdemServico';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_CIDADE_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_RESOURCE,
  IXC_SETOR_RESOURCE,
  OSS_EVENTO_LABELS,
} from './constants';
import { ixcListar } from './ixcHttp';
import type { IxcListResponse, IxcNamedRecord, IxcOssChamado, IxcOssMensagem } from './types';

const OS_ESTRUTURA_GRID = JSON.stringify([{ TB: `${IXC_RESOURCE}.id_estrutura`, OP: '>', P: '0' }]);

/** Lista OS de estrutura visíveis ao usuário do token IXC (pode filtrar por setor do operador API). */
export async function fetchOsListIxc(maxPages = 20): Promise<IxcOssChamado[]> {
  const result: IxcOssChamado[] = [];
  const rp = 100;

  for (let page = 1; page <= maxPages; page++) {
    const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
      qtype: `${IXC_RESOURCE}.id`,
      query: '0',
      oper: '>',
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

/** OS de estrutura vinculadas ao cliente BackNet (`idx`). Contorna filtro de setor da listagem geral. */
export async function fetchOsListByClienteIdx(
  clienteId: number,
  maxPages = 10
): Promise<IxcOssChamado[]> {
  const result: IxcOssChamado[] = [];
  const rp = 100;
  const query = String(clienteId);

  for (let page = 1; page <= maxPages; page++) {
    const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
      qtype: `${IXC_RESOURCE}.idx`,
      query,
      oper: '=',
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

async function fetchBacknetClientesPorIds(
  ids: Iterable<string>
): Promise<Map<string, { razao_social: string; nome_fantasia?: string | null }>> {
  const mapa = new Map<string, { razao_social: string; nome_fantasia?: string | null }>();
  const unique = [...new Set([...ids].filter((id) => id && id !== '0' && /^\d+$/.test(id)))];

  await Promise.all(
    unique.map(async (id) => {
      try {
        const cliente = await ClienteService.getById(id);
        if (cliente) {
          mapa.set(id, {
            razao_social: cliente.razao_social,
            nome_fantasia: cliente.nome_fantasia,
          });
        }
      } catch {
        // ignora falha pontual de lookup
      }
    })
  );

  return mapa;
}

export async function enrichOsRegistros(registros: IxcOssChamado[]): Promise<IxcOssChamado[]> {
  if (registros.length === 0) return [];

  const [estruturas, tecnicos, assuntos, setores, filiais, clientesBacknet, cidades] = await Promise.all([
    fetchRegistrosPorIds(IXC_ESTRUTURA_RESOURCE, registros.map((r) => String(r.id_estrutura ?? ''))),
    fetchRegistrosPorIds(IXC_FUNCIONARIOS_RESOURCE, registros.map((r) => String(r.id_tecnico ?? ''))),
    fetchRegistrosPorIds(IXC_ASSUNTO_RESOURCE, registros.map((r) => String(r.id_assunto ?? ''))),
    fetchRegistrosPorIds(IXC_SETOR_RESOURCE, registros.map((r) => String(r.setor ?? ''))),
    fetchRegistrosPorIds(IXC_FILIAL_RESOURCE, registros.map((r) => String(r.id_filial ?? ''))),
    fetchBacknetClientesPorIds(registros.map((r) => String(r.idx ?? r.cliente_id ?? ''))),
    fetchRegistrosPorIds(IXC_CIDADE_RESOURCE, registros.map((r) => String(r.id_cidade ?? ''))),
  ]);

  return registros.map((registro) => {
    const filial = filiais.get(String(registro.id_filial ?? ''));
    const assunto = assuntos.get(String(registro.id_assunto ?? ''));
    const backnetClienteId = String(registro.idx ?? registro.cliente_id ?? '').trim();
    const clienteBacknet = clientesBacknet.get(backnetClienteId);
    const cidade = cidades.get(String(registro.id_cidade ?? ''));
    return {
      ...registro,
      estrutura_nome: estruturas.get(String(registro.id_estrutura ?? ''))?.descricao ?? '',
      tecnico_nome: tecnicos.get(String(registro.id_tecnico ?? ''))?.funcionario ?? '',
      assunto_nome: assunto?.assunto ?? '',
      setor_nome: setores.get(String(registro.setor ?? ''))?.setor ?? '',
      filial_nome: filial?.fantasia || filial?.razao || '',
      cliente_id:
        backnetClienteId && backnetClienteId !== '0'
          ? backnetClienteId
          : String(registro.cliente_id ?? ''),
      cliente_nome:
        clienteBacknet
          ? clienteNomeParaOrdemServico(clienteBacknet, backnetClienteId)
          : String(registro.cliente_nome ?? ''),
      cidade_nome: cidade?.nome ?? '',
    };
  });
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
