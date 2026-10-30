import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import TableViewPanel from './TableViewPanel';

function renderPanel(
  onSetAllColumns = jest.fn(),
  onToggleColumn = jest.fn(),
  onSave = jest.fn(() => false),
  onCommitRule = jest.fn()
) {
  localStorage.setItem('app-language', 'pt-BR');
  render(
    <I18nProvider>
      <NotificationProvider>
        <TableViewPanel
          columns={[{ key: 'nome', label: 'Nome', sortable: true }]}
          rows={[{ nome: 'Acme' }, { nome: 'Beta' }]}
          hiddenColumnKeys={[]}
          views={[]}
          rules={[]}
          activeViewId={null}
          draftName=""
          isDefault={false}
          filtersOnPage={false}
          hasActiveState={false}
          onDraftName={jest.fn()}
          onIsDefault={jest.fn()}
          onToggleColumn={onToggleColumn}
          onSetAllColumns={onSetAllColumns}
          onCommitRule={onCommitRule}
          onRemoveRule={jest.fn()}
          onApplyRules={jest.fn()}
          onClearRules={jest.fn()}
          onSave={onSave}
          onDeleteView={jest.fn()}
          onApplyView={jest.fn()}
          onReset={jest.fn()}
        />
      </NotificationProvider>
    </I18nProvider>
  );
}

describe('TableViewPanel', () => {
  it('abre o painel e desabilita ou oculta a coluna', () => {
    const onSetAllColumns = jest.fn();
    const onToggleColumn = jest.fn();
    renderPanel(onSetAllColumns, onToggleColumn);

    fireEvent.click(screen.getByRole('button', { name: 'Filtros e colunas' }));
    expect(screen.getByRole('dialog', { name: 'Filtros e colunas' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Desabilitar' }));
    expect(onSetAllColumns).toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Nome' }));
    expect(onToggleColumn).toHaveBeenCalledWith('nome');
  });

  it('chama salvar e aceita quando o nome está preenchido', () => {
    const onSave = jest.fn(() => true);
    renderPanel(jest.fn(), jest.fn(), onSave);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros e colunas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalled();
    expect(onSave).toHaveReturnedWith(true);
  });

  it('inclui o filtro da coluna com um valor que já está na listagem', () => {
    const onCommitRule = jest.fn();
    renderPanel(jest.fn(), jest.fn(), jest.fn(() => true), onCommitRule);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros e colunas' }));
    fireEvent.change(screen.getByLabelText('Seletor'), { target: { value: 'nome' } });
    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: 'Acme' } });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onCommitRule).toHaveBeenCalledWith({ columnKey: 'nome', operator: 'contains', value: 'Acme' });
    expect(screen.queryByLabelText('Ordenação')).toBeNull();
  });
});
