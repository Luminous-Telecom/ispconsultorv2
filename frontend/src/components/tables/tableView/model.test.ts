import { rowMatchesRules, normalizeHiddenKeys, distinctColumnValues, upsertView, type SavedTableView } from './model';

describe('consulta salva da tabela', () => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'nome', label: 'Nome' },
  ];

  it('mantém ao menos uma coluna visível', () => {
    expect(normalizeHiddenKeys(['id', 'nome'], columns)).toEqual(['nome']);
    expect(normalizeHiddenKeys(['nome'], columns)).toEqual(['nome']);
  });

  it('filtra texto, número e data', () => {
    const rows = [
      { id: 1, nome: 'Alpha', created_at: '2026-01-02T10:00:00.000Z' },
      { id: 2, nome: 'Beta', created_at: '2026-03-01T10:00:00.000Z' },
    ];
    expect(rowMatchesRules(rows[0], [{ id: 'a', columnKey: 'nome', operator: 'contains', value: 'alp' }])).toBe(true);
    expect(rowMatchesRules(rows[1], [{ id: 'b', columnKey: 'id', operator: 'gt', value: '1' }])).toBe(true);
    expect(rowMatchesRules(rows[0], [{ id: 'c', columnKey: 'created_at', operator: 'equals', value: '2026-01-02' }])).toBe(true);
    expect(rowMatchesRules(rows[1], [{ id: 'd', columnKey: 'nome', operator: 'equals', value: 'Alpha' }])).toBe(false);
  });

  it('lista os valores distintos da coluna', () => {
    const rows = [
      { id: 1, nome: 'Beta' },
      { id: 2, nome: 'Alpha' },
      { id: 3, nome: 'alpha' },
      { id: 4, nome: '' },
    ];
    expect(distinctColumnValues({ key: 'nome', label: 'Nome' }, rows)).toEqual(['Alpha', 'Beta']);
    expect(distinctColumnValues({ key: 'ativo', label: 'Ativo' }, [{ ativo: true }])).toEqual([]);
  });

  it('deixa só uma consulta como padrão', () => {
    const atual: SavedTableView = {
      id: '1',
      name: 'Antiga',
      isDefault: true,
      listOnOpen: true,
      hiddenColumnKeys: [],
      rules: [],
    };
    const nova: SavedTableView = {
      id: '2',
      name: 'Nova',
      isDefault: true,
      listOnOpen: false,
      hiddenColumnKeys: ['id'],
      rules: [],
    };
    const salvas = upsertView([atual], nova);
    expect(salvas.find((view) => view.id === '1')?.isDefault).toBe(false);
    expect(salvas.find((view) => view.id === '1')?.listOnOpen).toBe(true);
    expect(salvas.find((view) => view.id === '2')?.isDefault).toBe(true);
  });
});
