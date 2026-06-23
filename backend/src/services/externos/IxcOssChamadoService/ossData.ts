import { ClienteService } from '../../clientes/ClienteService';
import {
  IXC_ASSUNTO_RESOURCE,
  IXC_CIDADE_RESOURCE,
  IXC_ESTRUTURA_RESOURCE,
  IXC_FILIAL_RESOURCE,
  IXC_FUNCIONARIOS_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_RESOURCE,
  IXC_SETOR_RESOURCE,
  IXC_EVENTO_ABERTURA,
} from './constants';
import { ixcListar, resolveOperadorId } from './ixcHttp';
import type { IxcListResponse, IxcNamedRecord, IxcOssChamado } from './types';

const gridMensagemAbertura = (operadorId: string) =>
  JSON.stringify([
    { TB: `${IXC_MENSAGEM_RESOURCE}.id_operador`, OP: '=', P: operadorId },
    { TB: `${IXC_MENSAGEM_RESOURCE}.id_evento`, OP: '=', P: IXC_EVENTO_ABERTURA },
  ]);

export async function fetchOsIdsAbertasPeloOperador(operadorId: string): Promise<string[]> {
  const data = await ixcListar<{ registros?: IxcNamedRecord[] }>(IXC_MENSAGEM_RESOURCE, {
    qtype: `${IXC_MENSAGEM_RESOURCE}.id_operador`,
    query: operadorId,
    oper: '=',
    page: '1',
    rp: '1000',
    sortname: `${IXC_MENSAGEM_RESOURCE}.id`,
    sortorder: 'desc',
    grid_param: gridMensagemAbertura(operadorId),
  });

  const ids = (data.registros ?? [])
    .map((r) => r.id_chamado)
    .filter(Boolean)
    .map(String);
  return [...new Set(ids)];
}

export async function osAbertaPeloOperador(ixcOsId: string | number): Promise<boolean> {
  const operadorId = resolveOperadorId();
  if (!operadorId) return false;

  const data = await ixcListar<{ total?: string }>(IXC_MENSAGEM_RESOURCE, {
    qtype: `${IXC_MENSAGEM_RESOURCE}.id_chamado`,
    query: String(ixcOsId),
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${IXC_MENSAGEM_RESOURCE}.id`,
    sortorder: 'desc',
    grid_param: JSON.stringify([
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_chamado`, OP: '=', P: String(ixcOsId) },
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_operador`, OP: '=', P: operadorId },
      { TB: `${IXC_MENSAGEM_RESOURCE}.id_evento`, OP: '=', P: IXC_EVENTO_ABERTURA },
    ]),
  });

  return (parseInt(data.total ?? '0', 10) || 0) > 0;
}

export async function fetchOsRawById(id: string | number): Promise<IxcOssChamado | null> {
  const data = await ixcListar<IxcListResponse>(IXC_RESOURCE, {
    qtype: `${IXC_RESOURCE}.id`,
    query: String(id),
    oper: '=',
    page: '1',
    rp: '1',
    sortname: `${IXC_RESOURCE}.id`,
    sortorder: 'desc',
  });
  return data.registros?.[0] ?? null;
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
    fetchBacknetClientesPorIds(registros.map((r) => String(r.idx ?? ''))),
    fetchRegistrosPorIds(IXC_CIDADE_RESOURCE, registros.map((r) => String(r.id_cidade ?? ''))),
  ]);

  return registros.map((registro) => {
    const filial = filiais.get(String(registro.id_filial ?? ''));
    const assunto = assuntos.get(String(registro.id_assunto ?? ''));
    const backnetClienteId = String(registro.idx ?? '').trim();
    const clienteBacknet = clientesBacknet.get(backnetClienteId);
    const cidade = cidades.get(String(registro.id_cidade ?? ''));
    return {
      ...registro,
      estrutura_nome: estruturas.get(String(registro.id_estrutura ?? ''))?.descricao ?? '',
      tecnico_nome: tecnicos.get(String(registro.id_tecnico ?? ''))?.funcionario ?? '',
      assunto_nome: assunto?.assunto ?? '',
      setor_nome: setores.get(String(registro.setor ?? ''))?.setor ?? '',
      filial_nome: filial?.fantasia || filial?.razao || '',
      cliente_id: backnetClienteId && backnetClienteId !== '0' ? backnetClienteId : '',
      cliente_nome: clienteBacknet?.nome_fantasia || clienteBacknet?.razao_social || '',
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
