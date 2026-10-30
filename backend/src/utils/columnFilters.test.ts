import { buildPrismaColumnFilters, parseColumnFiltersParam } from './columnFilters';

describe('columnFilters', () => {
  it('ignora JSON inválido e coluna fora do padrão', () => {
    expect(parseColumnFiltersParam('nao-json')).toEqual([]);
    expect(parseColumnFiltersParam(JSON.stringify([{ columnKey: 'razao social', operator: 'contains', value: 'a' }]))).toEqual([]);
  });

  it('monta a condição e a allowlist descarta coluna que o service não liberou', () => {
    const rules = parseColumnFiltersParam(JSON.stringify([
      { columnKey: 'razao_social', operator: 'contains', value: 'Acme' },
      { columnKey: 'password_hash', operator: 'contains', value: 'x' },
    ]));
    expect(rules).toHaveLength(2);
    expect(buildPrismaColumnFilters(rules, { razao_social: 'string' })).toEqual([
      { razao_social: { contains: 'Acme' } },
    ]);
  });

  it('recusa operador de texto em campo numérico', () => {
    expect(buildPrismaColumnFilters(
      [{ columnKey: 'id', operator: 'contains', value: '4' }],
      { id: 'number' }
    )).toEqual([]);
    expect(buildPrismaColumnFilters(
      [{ columnKey: 'id', operator: 'equals', value: '4' }],
      { id: 'number' }
    )).toEqual([{ id: { equals: 4 } }]);
  });
});
