import { describe, expect, it } from '@jest/globals';
import { hasDataChanged, syncSelectedItemsWithData } from './utils';

describe('hasDataChanged', () => {
  it('detecta troca de referência com mesmos ids', () => {
    const prev = [{ id: 1 }, { id: 2 }];
    const next = [{ id: 1 }, { id: 2 }];
    expect(hasDataChanged(prev, next)).toBe(true);
  });

  it('retorna false para o mesmo array', () => {
    const data = [{ id: 1 }];
    expect(hasDataChanged(data, data)).toBe(false);
  });
});

describe('syncSelectedItemsWithData', () => {
  it('não notifica quando só as refs dos itens selecionados mudam', () => {
    const selected = [{ id: 1, nome: 'a' }];
    const newData = [
      { id: 1, nome: 'a-atualizado' },
      { id: 2, nome: 'b' },
    ];
    const result = syncSelectedItemsWithData(selected, newData);
    expect(result.syncedSelectedItems).toEqual([{ id: 1, nome: 'a-atualizado' }]);
    expect(result.shouldNotify).toBe(false);
  });

  it('notifica quando um selecionado some dos dados', () => {
    const selected = [{ id: 1 }, { id: 2 }];
    const newData = [{ id: 1 }];
    const result = syncSelectedItemsWithData(selected, newData);
    expect(result.syncedSelectedItems).toEqual([{ id: 1 }]);
    expect(result.shouldNotify).toBe(true);
  });

  it('não notifica com seleção vazia', () => {
    const result = syncSelectedItemsWithData([], [{ id: 1 }, { id: 2 }]);
    expect(result.shouldNotify).toBe(false);
  });
});
