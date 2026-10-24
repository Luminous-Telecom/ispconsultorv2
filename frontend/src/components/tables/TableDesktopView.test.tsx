import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import TableDesktopView from './TableDesktopView';

const rows = [
  { id: 1, nome: 'Alpha' },
  { id: 2, nome: 'Beta' },
];

function renderTable(onToggleSelection = jest.fn()) {
  render(
    <I18nProvider>
    <TableDesktopView
      tableRef={createRef()}
      tableScrollRef={createRef()}
      tableMinWidth={400}
      isResizing={false}
      hasCustomWidths={false}
      resizeGuideStyle={null}
      selectable
      uniqueTableId="teste"
      isAllSelected={false}
      onToggleSelectAll={jest.fn()}
      onClearSelection={jest.fn()}
      visibleColumns={[{ key: 'nome', label: 'Nome' }]}
      columnWidths={{}}
      onResizeStart={jest.fn()}
      actions={[]}
      loading={false}
      loadingMessage="Carregando"
      emptyMessage="Vazio"
      paginatedData={rows}
      selectedItems={[]}
      onToggleSelection={onToggleSelection}
      openActionDropdown={null}
      onOpenActionDropdown={jest.fn()}
      actionsMenuLabel="Ações"
    />
    </I18nProvider>
  );
  return onToggleSelection;
}

describe('TableDesktopView seleção', () => {
  it('clique na linha pede seleção única', () => {
    const onToggleSelection = renderTable();
    fireEvent.click(screen.getByText('Beta'));
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
    expect(onToggleSelection).toHaveBeenCalledWith(rows[1], 'replace');
  });

  it('clique com Ctrl pede seleção acumulada', () => {
    const onToggleSelection = renderTable();
    fireEvent.click(screen.getByText('Alpha'), { ctrlKey: true });
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
    expect(onToggleSelection).toHaveBeenCalledWith(rows[0], 'additive');
  });

  it('clique com Cmd pede seleção acumulada', () => {
    const onToggleSelection = renderTable();
    fireEvent.click(screen.getByText('Alpha'), { metaKey: true });
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
    expect(onToggleSelection).toHaveBeenCalledWith(rows[0], 'additive');
  });

  it('checkbox pede seleção acumulada', () => {
    const onToggleSelection = renderTable();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(onToggleSelection).toHaveBeenCalledTimes(1);
    expect(onToggleSelection).toHaveBeenCalledWith(rows[0], 'additive');
  });
});
