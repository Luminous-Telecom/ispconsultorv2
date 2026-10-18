import { act, renderHook } from '@testing-library/react';
import { useColumnResizing } from './useColumnResizing';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
];

beforeEach(() => {
  localStorage.clear();
});

it('não regrava larguras iguais ao recarregar com nova referência de columns', () => {
  localStorage.setItem(
    'table-column-widths-clientes',
    JSON.stringify({ id: 70, nome: 180 })
  );

  const { result, rerender } = renderHook(
    ({ cols }) =>
      useColumnResizing({
        tableId: 'clientes',
        columns: cols,
        getMinWidthForColumn: () => 40,
      }),
    { initialProps: { cols: columns } }
  );

  const first = result.current.columnWidths;

  act(() => {
    rerender({ cols: [...columns] });
  });

  expect(result.current.columnWidths).toBe(first);
  expect(result.current.columnWidths).toEqual({ id: 70, nome: 180 });
});
