import { act, renderHook } from '@testing-library/react';
import { viewsStorageKey } from './model';
import { useTableView } from './useTableView';

describe('useTableView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('não grava consulta sem nome e grava quando o nome existe', () => {
    const { result } = renderHook(() => useTableView({
      tableId: 'teste-consulta',
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'nome', label: 'Nome', sortable: true },
      ],
    }));

    let saved = true;
    act(() => {
      saved = result.current.saveView();
    });
    expect(saved).toBe(false);
    expect(result.current.views).toHaveLength(0);

    act(() => {
      result.current.setDraftName('Ativos');
      result.current.toggleColumn('nome');
      result.current.addRule('nome');
    });
    expect(result.current.hiddenColumnKeys).toEqual(['nome']);
    const ruleId = result.current.rules[0]?.id;
    act(() => {
      if (ruleId) result.current.updateRule(ruleId, { value: 'Acme' });
    });
    expect(result.current.appliedRules.map((rule) => rule.value)).toEqual(['Acme']);
    act(() => {
      saved = result.current.saveView();
    });
    expect(saved).toBe(true);
    expect(result.current.views.map((view) => view.name)).toEqual(['Ativos']);
    expect(result.current.activeViewId).toBeNull();
    expect(result.current.hiddenColumnKeys).toEqual(['nome']);

    act(() => {
      result.current.setAllColumns(true);
      result.current.clearRules();
    });
    expect(result.current.hiddenColumnKeys).toEqual([]);
    expect(result.current.appliedRules).toEqual([]);

    act(() => {
      const view = result.current.views[0];
      if (view) result.current.applyView(view);
    });
    expect(result.current.activeViewId).toBe(result.current.views[0]?.id);
    expect(result.current.hiddenColumnKeys).toEqual(['nome']);
    expect(result.current.appliedRules.map((rule) => rule.value)).toEqual(['Acme']);
  });

  it('abre com todas as colunas e sem filtro, mesmo com consulta salva', () => {
    localStorage.setItem(viewsStorageKey('abre-tudo'), JSON.stringify([{
      id: '1',
      name: 'Oculta nome',
      isDefault: true,
      listOnOpen: true,
      hiddenColumnKeys: ['nome'],
      rules: [{ id: 'r', columnKey: 'nome', operator: 'contains', value: 'Acme' }],
    }]));

    const { result } = renderHook(() => useTableView({
      tableId: 'abre-tudo',
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'nome', label: 'Nome', sortable: true },
      ],
    }));

    expect(result.current.hiddenColumnKeys).toEqual([]);
    expect(result.current.appliedRules).toEqual([]);
    expect(result.current.activeViewId).toBeNull();
  });

  it('aplica na hora o valor escolhido no seletor', () => {
    const { result } = renderHook(() => useTableView({
      tableId: 'seletor',
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'nome', label: 'Nome', sortable: true },
      ],
    }));

    act(() => {
      result.current.commitRule({ columnKey: 'nome', operator: 'equals', value: 'Acme' });
    });
    expect(result.current.appliedRules).toEqual([
      expect.objectContaining({ columnKey: 'nome', operator: 'equals', value: 'Acme' }),
    ]);
  });
});
