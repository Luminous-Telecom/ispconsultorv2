import { resolveRowSelection } from './useTableSelection';

const rowA = { id: 1, nome: 'A' };
const rowB = { id: 2, nome: 'B' };
const rowC = { id: 3, nome: 'C' };

describe('resolveRowSelection', () => {
  it('substitui a seleção no clique simples mesmo com multiSelect', () => {
    expect(
      resolveRowSelection([rowA], rowB, { multiSelect: true, mode: 'replace' })
    ).toEqual([rowB]);
  });

  it('desmarca quando o clique simples repete a única linha selecionada', () => {
    expect(
      resolveRowSelection([rowA], rowA, { multiSelect: true, mode: 'replace' })
    ).toEqual([]);
  });

  it('acumula no modo aditivo com multiSelect', () => {
    expect(
      resolveRowSelection([rowA], rowB, { multiSelect: true, mode: 'additive' })
    ).toEqual([rowA, rowB]);
  });

  it('remove só o item no modo aditivo quando ele já está marcado', () => {
    expect(
      resolveRowSelection([rowA, rowB, rowC], rowB, { multiSelect: true, mode: 'additive' })
    ).toEqual([rowA, rowC]);
  });

  it('ignora o modo aditivo quando a tabela não é multiSelect', () => {
    expect(
      resolveRowSelection([rowA], rowB, { multiSelect: false, mode: 'additive' })
    ).toEqual([rowB]);
  });
});
