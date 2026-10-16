import {
  ativoFilterForService,
  isQueryFlagTrue,
  parseBoundedPositiveInt,
  parseIdsFromQueryParam,
  parseListQuery,
  parseSchedulerListQuery,
  parseTriStateBoolean,
  toSqlSortDirection,
} from './listQuery';

describe('parseListQuery — visualização', () => {
  it('aplica página e limite padrão e ignora busca vazia', () => {
    expect(parseListQuery({})).toMatchObject({ page: 1, limit: 15 });
    expect(parseListQuery({ search: '  ' }).search).toBeUndefined();
  });

  it('respeita o teto de limite e lê filtros de listagem', () => {
    const parsed = parseListQuery(
      {
        page: '2',
        limit: '500',
        search: 'acme',
        searchField: 'razao_social',
        sortColumn: 'id',
        sortDirection: 'asc',
        ativo: 'false',
        empresa_id: '4',
        status: 'ativo',
      },
      { maxLimit: 100 }
    );
    expect(parsed).toMatchObject({
      page: 2,
      limit: 100,
      search: 'acme',
      searchField: 'razao_social',
      sortColumn: 'id',
      sortDirection: 'asc',
      ativo: false,
      empresa_id: 4,
      status: 'ativo',
    });
  });

  it('o agendador aceita sort e direction alternativos', () => {
    const parsed = parseSchedulerListQuery({ sort: 'nome', direction: 'desc' });
    expect(parsed.sortColumn).toBe('nome');
    expect(parsed.sortDirection).toBe('desc');
  });
});

describe('helpers de query', () => {
  it('interpreta flags, ids e direção SQL', () => {
    expect(isQueryFlagTrue({ incluir: 'true' }, 'incluir')).toBe(true);
    expect(parseTriStateBoolean('false')).toBe(false);
    expect(parseTriStateBoolean('talvez')).toBeUndefined();
    expect(parseBoundedPositiveInt('1', { defaultValue: 7, min: 1, max: 30 })).toBe(1);
    expect(parseBoundedPositiveInt('999', { defaultValue: 7, min: 1, max: 30 })).toBe(30);
    expect(parseIdsFromQueryParam('[1,2,0,-3]')).toEqual([1, 2]);
    expect(parseIdsFromQueryParam('4,5')).toEqual([4, 5]);
    expect(ativoFilterForService(false)).toBe('false');
    expect(toSqlSortDirection('asc')).toBe('ASC');
    expect(toSqlSortDirection()).toBe('DESC');
  });
});
