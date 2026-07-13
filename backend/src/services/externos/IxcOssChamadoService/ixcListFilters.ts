import { IXC_CIDADE_RESOURCE, IXC_MENSAGEM_RESOURCE, IXC_RESOURCE } from './constants';
import {
  IXC_ATENDIMENTO_RESOURCE,
  IXC_MENSAGEM_RESOURCE as IXC_ATENDIMENTO_MENSAGEM_RESOURCE,
} from '../IxcAtendimentoService/constants';

export interface IxcGridParamFilter {
  TB: string;
  OP: string;
  P: string;
  C?: string;
  G?: string;
}

export function isIxcRegistroAtivo(registro: Record<string, string | undefined>): boolean {
  const ativo = String(registro.ativo ?? '').trim().toUpperCase();
  if (!ativo) return true;
  return ativo === 'S' || ativo === '1' || ativo === 'SIM' || ativo === 'TRUE';
}

export function filterRegistrosAtivos<T extends Record<string, string | undefined>>(registros: T[]): T[] {
  return registros.filter((registro) => isIxcRegistroAtivo(registro));
}

/** Recursos IXC sem coluna `ativo` — filtro quebra a listagem. */
const IXC_RESOURCES_WITHOUT_ATIVO_FILTER = new Set<string>([
  IXC_CIDADE_RESOURCE,
  IXC_RESOURCE,
  IXC_MENSAGEM_RESOURCE,
  IXC_ATENDIMENTO_RESOURCE,
  IXC_ATENDIMENTO_MENSAGEM_RESOURCE,
]);

export function ixcResourceSupportsAtivoFilter(resource: string): boolean {
  return !IXC_RESOURCES_WITHOUT_ATIVO_FILTER.has(resource);
}

export function buildIxcAtivoGridFilter(resource: string): IxcGridParamFilter {
  return {
    TB: `${resource}.ativo`,
    OP: '=',
    P: 'S',
    C: 'AND',
    G: 'ativo',
  };
}

export function buildIxcFieldGridFilter(
  resource: string,
  field: string,
  value: string,
  group = field
): IxcGridParamFilter {
  return {
    TB: `${resource}.${field}`,
    OP: '=',
    P: value,
    C: 'AND',
    G: group,
  };
}

export function buildIxcListGridParam(
  resource: string,
  additionalFilters: Record<string, string> = {},
  search?: { nomeCampo: string; term: string }
): string | undefined {
  const filters: IxcGridParamFilter[] = [];

  if (ixcResourceSupportsAtivoFilter(resource)) {
    filters.push(buildIxcAtivoGridFilter(resource));
  }

  for (const [field, value] of Object.entries(additionalFilters)) {
    filters.push(buildIxcFieldGridFilter(resource, field, value));
  }

  if (search?.term) {
    filters.push({
      TB: `${resource}.${search.nomeCampo}`,
      OP: 'L',
      P: search.term,
      C: 'AND',
      G: 'search',
    });
  }

  if (filters.length === 0) return undefined;

  return JSON.stringify(filters);
}

export function buildIxcListBody(
  resource: string,
  rp: string,
  additionalFilters: Record<string, string> = {},
  search?: { nomeCampo: string; term: string }
): Record<string, string> {
  const extraFilters = Object.entries(additionalFilters);
  const hasExtraFilters = extraFilters.length > 0;
  const supportsAtivo = ixcResourceSupportsAtivoFilter(resource);

  const [primaryField, primaryValue, primaryOper] = hasExtraFilters
    ? [extraFilters[0][0], extraFilters[0][1], '=' as const]
    : supportsAtivo
      ? ['ativo', 'S', '=' as const]
      : ['id', '0', '>' as const];

  const body: Record<string, string> = {
    qtype: `${resource}.${primaryField}`,
    query: primaryValue,
    oper: primaryOper,
    page: '1',
    rp,
    sortname: `${resource}.id`,
    sortorder: 'asc',
  };

  const gridParam = buildIxcListGridParam(resource, additionalFilters, search);
  if (gridParam) {
    body.grid_param = gridParam;
  }

  return body;
}
